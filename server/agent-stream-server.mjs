import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import {
  buildAgentSystemPrompt,
  buildStructuredAgentTools,
  snapshotToEmotionApiBody,
} from './agent-tools.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function mergeEnvLocalNonEmpty(envFilePath) {
  const localPath = path.join(path.dirname(envFilePath), '.env.local')
  if (!fs.existsSync(localPath)) return
  const parsed = dotenv.parse(fs.readFileSync(localPath))
  for (const [k, v] of Object.entries(parsed)) {
    const t = String(v ?? '').trim()
    if (t) process.env[k] = t
  }
}

function loadEnvFromProject() {
  const envFile = path.join(projectRoot, '.env')
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile })
  }
  mergeEnvLocalNonEmpty(envFile)

  let key = llmApiKey()
  if (!key) {
    const cwdEnv = path.join(process.cwd(), '.env')
    if (fs.existsSync(cwdEnv) && cwdEnv !== envFile) {
      dotenv.config({ path: cwdEnv })
      mergeEnvLocalNonEmpty(cwdEnv)
    }
    key = llmApiKey()
  }
}

loadEnvFromProject()

function llmApiKey() {
  return (
    String(process.env.DEEPSEEK_API_KEY ?? '').trim() ||
    String(process.env.OPENAI_API_KEY ?? '').trim()
  )
}

function llmBaseUrl() {
  return (
    String(process.env.DEEPSEEK_BASE_URL ?? '').trim() ||
    String(process.env.OPENAI_BASE_URL ?? '').trim() ||
    'https://api.deepseek.com/v1'
  )
    .trim()
    .replace(/\/$/, '')
}

function llmModelName() {
  return (
    String(process.env.DEEPSEEK_BASE_MODEL ?? '').trim() ||
    String(process.env.OPENAI_MODEL ?? '').trim() ||
    'deepseek-chat'
  )
}

if (process.env.DEBUG_AGENT_STREAM === '1') {
  const debugKeyLen = llmApiKey().length
  console.log('[agent-stream][debug] projectRoot=', projectRoot)
  console.log('[agent-stream][debug] API key length=', debugKeyLen)
  console.log('[agent-stream][debug] OPENAI_BASE_URL set=', Boolean(llmBaseUrl()))
  console.log('[agent-stream][debug] OPENAI_MODEL=', llmModelName())
}

const crisisResourcesHint = tool(
  async () =>
    '如遇紧急自伤/自杀风险或人身危险，请立即拨打当地紧急电话或联系官方心理危机热线，并尽量让身边人知晓；本平台回复仅为支持性信息，不能代替专业干预。',
  {
    name: 'crisis_resources_hint',
    description:
      '仅在用户明确表达自伤、自杀念头或即时人身危险时使用，返回通用安全与求助提醒（非诊断、不开具体处方）。',
    schema: z.object({}),
  },
)

const BASE_SYSTEM_PROMPT = `你是「萤火心理助手」，面向中文用户的心理健康支持型对话助手。
- 语气温暖、尊重、不评判；以倾听、澄清感受与心理学常识为主。
- 不提供医学诊断、用药方案或替代线下心理咨询/精神科诊疗。
- 若涉及自伤、自杀或他人即时安全风险，应表达关切并建议尽快联系现实生活中的专业帮助与紧急渠道。
- 回答可分段、有条理；篇幅适中。`

/** LangGraph 消息记忆：完整 session key，如 session_11601 */
const sessionsLc = new Map()
/** 情绪花园快照 */
const emotionSnapshots = new Map()
/** 本地会话列表（仅开发代理全站 /api 时使用） */
const localSessionSummaries = []
let sessionSeq = 11600

function normalizeSessionKey(sessionId) {
  const s = String(sessionId ?? 'anonymous').trim()
  if (!s) return 'anonymous'
  return s.startsWith('session_') ? s : `session_${s}`
}

function parseClientGeo(body) {
  const g = body?.geo
  if (!g || typeof g !== 'object') return {}
  return {
    latitude: typeof g.latitude === 'number' ? g.latitude : undefined,
    longitude: typeof g.longitude === 'number' ? g.longitude : undefined,
    city: typeof g.city === 'string' ? g.city : undefined,
  }
}

function conversationHistoryToLcMessages(conversationHistory) {
  const messages = []
  const history = Array.isArray(conversationHistory) ? conversationHistory : []
  for (const turn of history) {
    const role = turn.role === 'assistant' ? 'assistant' : 'user'
    const text = String(turn.content ?? '').trim()
    if (!text) continue
    messages.push(new (role === 'assistant' ? AIMessage : HumanMessage)(text))
  }
  return messages
}

function createModel() {
  const apiKey = llmApiKey()
  if (!apiKey) {
    throw new Error(
      '请在项目根目录配置 .env 中的 OPENAI_API_KEY 或 DEEPSEEK_API_KEY（勿提交到 Git）。',
    )
  }
  const baseURL = llmBaseUrl()
  const model = llmModelName()
  const temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.7)
  return new ChatOpenAI({
    model,
    temperature,
    apiKey,
    configuration: { baseURL },
    streaming: true,
  })
}

let modelSingleton = null
function getModel() {
  if (!modelSingleton) modelSingleton = createModel()
  return modelSingleton
}

function sseWriteData(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

function sseDone(res) {
  res.write('event: done\ndata: {}\n\n')
}

function defaultEmotionPayload() {
  return {
    label: '中性',
    emotionScore: 50,
    primaryEmotion: '待定',
    suggestion: '与萤火助手对话后，这里会显示本轮情绪与天气相关的觉察摘要。',
    improvementSuggestions: [],
    improvementSuggestion: [],
    riskLevel: 0,
    isNegative: false,
    timestamp: Date.now(),
  }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

/** 开发用：创建会话（与 mentalHealth-agent 参考实现对齐字段） */
app.post('/api/psychological-chat/session/start', (req, res) => {
  sessionSeq += 1
  const sessionId = `session_${sessionSeq}`
  const body = req.body ?? {}
  const initialEcho = String(body.initialMessage ?? '')
  const sessionTitle = String(body.sessionTitle ?? '').trim() || '萤火AI助手'
  const startTime = Date.now()
  const expiryTime = startTime + 24 * 60 * 60 * 1000

  sessionsLc.set(sessionId, [])
  emotionSnapshots.delete(sessionId)

  const initialTrim = initialEcho.trim()
  const messageCount = 0

  localSessionSummaries.unshift({
    id: sessionSeq,
    title: sessionTitle,
    sessionTitle,
    startedAt: new Date(startTime).toLocaleString(),
    lastMessageContent: initialTrim || '新对话',
    messageCount,
    durationMinutes: 0,
  })

  res.json({
    code: '200',
    msg: '操作成功',
    data: {
      sessionId,
      userHash: 0,
      initialMessage: initialEcho,
      startTime,
      expiryTime,
      status: 'ACTIVE',
      messageCount,
    },
  })
})

app.get('/api/psychological-chat/sessions', (req, res) => {
  res.json({
    code: '200',
    data: {
      records: localSessionSummaries,
      total: localSessionSummaries.length,
    },
  })
})

app.delete('/api/psychological-chat/sessions/:id', (req, res) => {
  const id = Number(req.params.id)
  const sessionId = Number.isFinite(id) ? `session_${id}` : normalizeSessionKey(req.params.id)
  sessionsLc.delete(sessionId)
  emotionSnapshots.delete(sessionId)
  const idx = localSessionSummaries.findIndex((s) => s.id === id)
  if (idx !== -1) localSessionSummaries.splice(idx, 1)
  res.json({ code: '200', msg: '操作成功', data: null })
})

app.get('/api/psychological-chat/sessions/:id/messages', (req, res) => {
  res.json({ code: '200', data: [] })
})

app.get('/api/psychological-chat/session/:sessionId/emotion', (req, res) => {
  const sessionId = normalizeSessionKey(req.params.sessionId)
  const snap = emotionSnapshots.get(sessionId)
  const data = snap ? snapshotToEmotionApiBody(snap) : defaultEmotionPayload()
  res.json({ code: '200', data })
})

app.post('/api/psychological-chat/stream', async (req, res) => {
  req.setTimeout(0)
  res.setTimeout(0)

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  const sessionKey = normalizeSessionKey(req.body?.sessionId)
  const { userMessage, conversationHistory } = req.body ?? {}
  const geo = parseClientGeo(req.body)

  if (!userMessage || typeof userMessage !== 'string') {
    sseWriteData(res, { code: '-1', message: 'userMessage 必填', data: null })
    sseDone(res)
    res.end()
    return
  }

  if (!llmApiKey()) {
    sseWriteData(res, {
      code: '-1',
      message: '请在 .env 中配置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。',
      data: null,
    })
    sseDone(res)
    res.end()
    return
  }

  let history = sessionsLc.get(sessionKey)
  if (!history || history.length === 0) {
    history = conversationHistoryToLcMessages(conversationHistory)
    sessionsLc.set(sessionKey, history)
  }

  const structuredTools = buildStructuredAgentTools(sessionKey, emotionSnapshots, geo)
  const tools = [...structuredTools, crisisResourcesHint]
  const prompt = buildAgentSystemPrompt(BASE_SYSTEM_PROMPT, geo)

  const llm = getModel()
  const agent = createReactAgent({ llm, tools, prompt })

  const messages = [...history, new HumanMessage(userMessage)]
  let assistantAcc = ''

  try {
    const eventStream = agent.streamEvents({ messages }, { version: 'v2', streamMode: 'messages' })

    for await (const ev of eventStream) {
      if (ev.event !== 'on_chat_model_stream') continue
      const chunk = ev.data?.chunk
      if (!chunk) continue
      let delta = ''
      const c = chunk.content
      if (typeof c === 'string') {
        delta = c
      } else if (Array.isArray(c)) {
        delta = c
          .map((b) => {
            if (typeof b === 'object' && b !== null && b.type === 'text') {
              return String(b.text ?? '')
            }
            return ''
          })
          .join('')
      }
      if (delta) {
        assistantAcc += delta
        sseWriteData(res, { code: '200', data: { content: delta } })
      }
    }

    const trimmed = assistantAcc.trim()
    const nextHistory = trimmed
      ? [...history, new HumanMessage(userMessage), new AIMessage(trimmed)]
      : [...history, new HumanMessage(userMessage)]

    sessionsLc.set(sessionKey, nextHistory)

    if (!trimmed) {
      sseWriteData(res, {
        code: '200',
        data: { content: '我先陪你待着，你可以再说说此刻的感受吗？' },
      })
    }

    sseDone(res)
    res.end()
  } catch (err) {
    console.error('[agent-stream]', err)
    sseWriteData(res, {
      code: '-1',
      message: err instanceof Error ? err.message : 'Agent 流式输出失败',
      data: null,
    })
    sseDone(res)
    res.end()
  }
})

const PORT = Number(process.env.AGENT_STREAM_PORT) || 8787
app.listen(PORT, () => {
  console.log(`[agent-stream] LangChain Agent SSE: http://127.0.0.1:${PORT}/api/psychological-chat/stream`)
  const liveKeyLen = llmApiKey().length
  if (liveKeyLen > 0) {
    console.log(
      `[agent-stream] 已加载 API Key（长度 ${liveKeyLen}）；前端经 Vite 代理 /api → 本端口（含会话/情绪桩）。`,
    )
  } else {
    console.warn('[agent-stream] 未检测到 OPENAI_API_KEY / DEEPSEEK_API_KEY，请在项目根目录 .env 中配置后重启本进程。')
  }
})
