import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/** @typedef {{ latitude?: number; longitude?: number; city?: string }} ClientGeo */

/** @typedef {import('@langchain/core/messages').BaseMessage[]} MessageHistory */

/**
 * @param {ClientGeo} geo
 * @returns {string}
 */
export function geoSystemBlock(geo) {
  const lat = geo.latitude
  const lon = geo.longitude
  const city = geo.city?.trim()
  if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
    return `【本轮客户端环境】纬度 ${lat.toFixed(4)}，经度 ${lon.toFixed(4)}${city ? `，城市提示：${city}` : ''}。查天气请调用 get_current_weather，勿编造实况。`
  }
  return '【本轮客户端环境】未提供有效经纬度。需要天气时可询问用户所在城市，或建议其允许浏览器定位。'
}

/**
 * @param {string} baseSystem
 * @param {ClientGeo} geo
 * @returns {string}
 */
export function buildAgentSystemPrompt(baseSystem, geo) {
  const toolRules = `
【工具与情绪花园】
1. get_current_weather：获取真实天气后再谈「天气与情绪」的关系；无位置时先问城市或说明无法定位。
2. publish_emotion_garden_snapshot：在适当时机写入侧栏结构化摘要（分数、主情绪、建议、可选天气关联、改进建议）。每轮用户消息结束后尽量调用一次；若用户仅寒暄且情绪中性，仍给出温和的中性快照。
3. crisis_resources_hint：仅在用户明确表达自伤、自杀念头或即时人身危险时调用。
4. 仍遵守：不诊断、不开药；有自伤/伤人风险时明确建议联系紧急服务或专业人士。`
  return `${baseSystem.trim()}\n\n${geoSystemBlock(geo)}\n${toolRules.trim()}`
}

function wmoLabel(code) {
  const table = {
    0: '晴朗',
    1: '大部晴朗',
    2: '局部多云',
    3: '多云',
    45: '有雾',
    48: '雾凇/雾',
    51: '小毛毛雨',
    53: '中毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '小阵雨',
    81: '阵雨',
    82: '强阵雨',
    95: '雷暴',
    96: '雷暴伴冰雹',
    99: '强雷暴伴冰雹',
  }
  return table[code] ?? `天气代码 ${code}`
}

async function geocodePlace(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name.trim())}&count=1&language=zh`
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) return null
  const data = await res.json()
  const r = data.results?.[0]
  if (!r) return null
  return { lat: r.latitude, lon: r.longitude, label: r.name }
}

async function openMeteoCurrent(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
    '&timezone=auto&wind_speed_unit=ms'
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) return `天气接口暂不可用（HTTP ${res.status}）`
  const data = await res.json()
  const c = data.current
  if (!c) return '未能解析当前天气数据'
  const code = Number(c.weather_code ?? 0)
  const desc = wmoLabel(code)
  const t = c.temperature_2m
  const ap = c.apparent_temperature
  const hum = c.relative_humidity_2m
  const wind = c.wind_speed_10m
  const day = c.is_day === 1 ? '白天' : '夜间'
  const parts = [
    `${desc}，${day}`,
    typeof t === 'number' ? `气温约 ${t}°C` : '',
    typeof ap === 'number' && ap !== t ? `体感约 ${ap}°C` : '',
    typeof hum === 'number' ? `湿度约 ${hum}%` : '',
    typeof wind === 'number' ? `风速约 ${wind} m/s` : '',
  ].filter(Boolean)
  return parts.join('；')
}

async function resolveWeatherContext(geo, place) {
  if (place && place.trim()) {
    const g = await geocodePlace(place.trim())
    if (!g) return { summary: `未找到地点「${place}」，请换一个城市名试试。`, resolvedLabel: place }
    const s = await openMeteoCurrent(g.lat, g.lon)
    return { summary: `【${g.label}】${s}`, resolvedLabel: g.label }
  }
  const lat = geo.latitude
  const lon = geo.longitude
  if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
    const s = await openMeteoCurrent(lat, lon)
    const label = geo.city?.trim() || `坐标 ${lat.toFixed(2)}, ${lon.toFixed(2)}`
    return { summary: `【${label}】${s}`, resolvedLabel: label }
  }
  return {
    summary: '当前没有可用的城市名或经纬度。可请用户告知所在城市，或在浏览器中允许定位后重试。',
    resolvedLabel: '未知位置',
  }
}

const weatherSchema = z.object({
  place: z
    .string()
    .optional()
    .describe('要查询的城市或地区中文名；若用户已开启定位且未指定地点，可留空以使用其坐标'),
})

const emotionSchema = z.object({
  emotionScore: z.number().min(0).max(100).describe('0–100，越高表示当下主观状态越好'),
  primaryEmotion: z.string().describe('主要情绪词，如：焦虑、平静、低落、期待'),
  label: z.string().optional().describe('简短展示标签，默认可与 primaryEmotion 相同'),
  suggestion: z.string().describe('一句温暖、可操作的建议，不做医学诊断'),
  weatherCorrelation: z
    .string()
    .optional()
    .describe('结合已查到的天气，说明与情绪的关联或「暂无明显关联」；未查天气时可省略'),
  improvementSuggestions: z.array(z.string()).max(5).optional().describe('2–4 条简短自助建议'),
  riskLevel: z.number().min(0).max(3).optional().describe('0 正常；若有自伤等风险线索可提高并务必在正文中引导求助'),
  isNegative: z.boolean().optional(),
  riskDescription: z.string().optional(),
  icon: z.string().optional().describe('可选单个 emoji 作情绪花园展示'),
})

/**
 * @param {string} sessionId
 * @param {Map<string, object>} snapshots
 * @param {ClientGeo} geo
 */
export function buildStructuredAgentTools(sessionId, snapshots, geo) {
  const getCurrentWeather = new DynamicStructuredTool({
    name: 'get_current_weather',
    description:
      '查询实时天气（Open-Meteo）。当用户谈到天气、出门、气压、冷热与心情关系，或需要结合环境给建议时调用；勿编造天气数据。',
    schema: weatherSchema,
    func: async ({ place }) => {
      try {
        const { summary } = await resolveWeatherContext(geo, place)
        return summary
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return `查询天气时出错：${msg}`
      }
    },
  })

  const publishEmotionGardenSnapshot = new DynamicStructuredTool({
    name: 'publish_emotion_garden_snapshot',
    description:
      '将你对用户当下情绪的觉察写入「情绪花园」侧栏（结构化数据）。在用户表达明显感受或一轮回复将结束时调用一次；勿用于诊断或贴疾病标签。',
    schema: emotionSchema,
    func: async (input) => {
      const snap = {
        emotionScore: input.emotionScore,
        primaryEmotion: input.primaryEmotion,
        label: (input.label ?? input.primaryEmotion).trim() || '情绪觉察',
        suggestion: input.suggestion,
        weatherCorrelation: input.weatherCorrelation,
        improvementSuggestions: input.improvementSuggestions,
        riskLevel: input.riskLevel ?? 0,
        isNegative: input.isNegative ?? false,
        riskDescription: input.riskDescription,
        icon: input.icon,
        timestamp: Date.now(),
      }
      snapshots.set(sessionId, snap)
      return '情绪花园已更新，请继续用自然语言向用户说明要点（不必重复 JSON）。'
    },
  })

  return [getCurrentWeather, publishEmotionGardenSnapshot]
}

/** @param {object} s snapshot */
export function snapshotToEmotionApiBody(s) {
  const arr = s.improvementSuggestions ?? []
  return {
    emotionScore: s.emotionScore,
    score: s.emotionScore,
    primaryEmotion: s.primaryEmotion,
    label: s.label,
    suggestion: s.suggestion,
    weatherCorrelation: s.weatherCorrelation,
    improvementSuggestions: arr,
    improvementSuggestion: arr,
    riskLevel: s.riskLevel ?? 0,
    isNegative: s.isNegative ?? false,
    riskDescription: s.riskDescription,
    icon: s.icon,
    timestamp: s.timestamp,
  }
}
