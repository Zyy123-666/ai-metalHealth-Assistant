/**
 * 本地对话上下文：与 consultation 中「先 push 用户消息再调用 startAiresponse，
 * startAiresponse 内再 push 空 AI 气泡」的顺序一致。
 * 用法与参数说明见 docs/chatContext-in-consultation.md
 */

/** @typedef {{ role: 'user' | 'assistant', content: string }} ChatTurn */

export const DEFAULT_MAX_CONTEXT_PAIRS = 20
export const DEFAULT_MAX_CONTEXT_CHARS = 12000

function normalizeContent(msg) {
    return String(msg?.content ?? '').trim()
}

/**
 * @param {Array<{ senderType?: number, content?: string }>} messages
 * @returns {ChatTurn[]}
 */
export function toChatTurns(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return []
    /** @type {ChatTurn[]} */
    const out = []
    for (const msg of messages) {
        const text = normalizeContent(msg)
        if (!text) continue
        const role = Number(msg.senderType) === 1 ? 'user' : 'assistant'
        out.push({ role, content: text })
    }
    return out
}

/**
 * 当前这一轮请求发出时，messages 末尾应为：[..., 当前用户句, 占位 AI 空气泡]。
 * 返回此前已完成轮次对应的 ChatTurn[]（不含当前用户句与占位 AI）。
 *
 * @param {Array<{ senderType?: number, content?: string }>} messages
 * @returns {ChatTurn[]}
 */
export function buildHistoryBeforeCurrent(messages) {
    if (!Array.isArray(messages) || messages.length < 2) return []
    return toChatTurns(messages.slice(0, -2))
}

/**
 * @param {ChatTurn[]} turns
 * @param {number} maxPairs 保留最近多少轮「用户 + 助手」
 * @returns {ChatTurn[]}
 */
export function truncateTurns(turns, maxPairs) {
    if (!Array.isArray(turns) || turns.length === 0) return []
    const n = Number(maxPairs)
    if (!Number.isFinite(n) || n <= 0) return []
    let start = Math.max(0, turns.length - n * 2)
    while (start < turns.length && turns[start]?.role !== 'user') {
        start += 1
    }
    return turns.slice(start)
}

/**
 * 从尾部保留尽可能多的完整消息，总字符数不超过 maxChars；首部对齐到 user。
 *
 * @param {ChatTurn[]} turns
 * @param {number} maxChars
 * @returns {ChatTurn[]}
 */
export function truncateByChars(turns, maxChars) {
    if (!Array.isArray(turns) || turns.length === 0) return []
    const limit = Number(maxChars)
    if (!Number.isFinite(limit) || limit <= 0) return []

    let used = 0
    let start = turns.length

    for (let i = turns.length - 1; i >= 0; i--) {
        const len = (turns[i].content || '').length
        if (used + len > limit && start < turns.length) {
            break
        }
        used += len
        start = i
    }

    let slice = turns.slice(start)
    while (slice.length > 0 && slice[0].role !== 'user') {
        slice = slice.slice(1)
    }
    return slice
}

/**
 * @param {Array<{ senderType?: number, content?: string }>} messagesSnapshot messages.value（须在 push 占位 AI 之后）
 * @param {{ maxPairs?: number, maxChars?: number }} [options]
 * @returns {ChatTurn[]}
 */
export function buildConversationHistoryForApi(messagesSnapshot, options = {}) {
    const maxPairs = options.maxPairs ?? DEFAULT_MAX_CONTEXT_PAIRS
    const maxChars = options.maxChars ?? DEFAULT_MAX_CONTEXT_CHARS
    let turns = buildHistoryBeforeCurrent(messagesSnapshot)
    turns = truncateTurns(turns, maxPairs)
    turns = truncateByChars(turns, maxChars)
    return turns
}

/**
 * @param {Array<{ senderType?: number, content?: string }>} messages
 * @param {{ excludeTrailingEmptyAssistant?: boolean }} [options]
 */
export function getContextStats(messages, options = {}) {
    let list = Array.isArray(messages) ? messages : []
    if (options.excludeTrailingEmptyAssistant && list.length > 0) {
        const last = list[list.length - 1]
        if (Number(last.senderType) === 2 && !normalizeContent(last)) {
            list = list.slice(0, -1)
        }
    }
    const turns = toChatTurns(list)
    const chars = turns.reduce((sum, t) => sum + (t.content || '').length, 0)
    const userTurns = turns.filter((t) => t.role === 'user').length
    return {
        messageCount: turns.length,
        userTurns,
        chars,
        approxTokens: Math.ceil(chars / 4),
    }
}
