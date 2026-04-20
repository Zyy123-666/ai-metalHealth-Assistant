import service from "@/utils/request"

// 注册
export const register = (data) => {
    return service.post('/user/add', data)
}

// 创建会话
export const startSession = (data) => {
    return service.post('/psychological-chat/session/start', data)
}

// 分页查询咨询会话
export const getSessionList = (params) => {
    return service.get('/psychological-chat/sessions', { params })
}

// 删除咨询会话
export const deleteSession = (sessionId) => {
    return service.delete(`/psychological-chat/sessions/${sessionId}`)
}

// 获取对话消息列表
export const getSessionDetail = (sessionId) => {
    return service.get(`/psychological-chat/sessions/${sessionId}/messages`)
}

// 获取会话情绪分析结果
export const getSessionEmotion = (sessionId) => {
    return service.get(`/psychological-chat/session/${sessionId}/emotion`)
}

// 情绪日志创建/更新
export const addEmotionDiary = (data) => {
    return service.post('/emotion-diary', data)
}

// 查询知识文章列表
export const getKnowledgeList = (params) => {
    return service.get('/knowledge/article/page', { params })
}

// 获取知识文章详情
export const getKnowledgeDetail = (articleId) => {
    return service.get(`/knowledge/article/${articleId}`)
}