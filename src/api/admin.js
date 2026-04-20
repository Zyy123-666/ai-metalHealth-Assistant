import service from "@/utils/request";

export function login(data) {
    return service.post('/user/login', data)
}

// 知识文章页面获取分类信息
export function categoryTree() {
    return service.get('/knowledge/category/tree')
}

export function articlePage(params) {
    return service.get('/knowledge/article/page', { params })
}

// 文件上传
export function uploadFile(file, businessInfo) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('businessType', 'ARTICLE')
    formData.append('businessId', businessInfo.businessId)
    formData.append('businessField', 'cover')

    return service.post('/file/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

// 创建文章
export function createArticle(data) {
    return service.post('/knowledge/article', data)
}

// 获取已创建文章信息
export function getArticleDetail(id) {
    return service.get(`/knowledge/article/${id}`)
}

// 更新文章
export function updateArticle(id, data) {
    return service.put(`/knowledge/article/${id}`, data)
}

// 修改文章状态
export function changeArticleStatus(id, data) {
    return service.put(`/knowledge/article/${id}/status`, data)
}

// 删除文章
export function deleteArticle(id) {
    return service.delete(`/knowledge/article/${id}`)
}

// 分页查询咨询对话
export function getConsultationPage(params) {
    return service.get('/psychological-chat/sessions', { params })
}

// 咨询id
export function getSessionDetail(sessionID) {
    return service.get(`/psychological-chat/sessions/${sessionID}/messages`)
}

// 情绪评价分页列表
export function getEmotionalPage(params) {
    return service.get('/emotion-diary/admin/page', { params })
}

// 删除情绪日志
export function deleteEmotional(id) {
    return service.delete(`/emotion-diary/admin/${id}`)
}

// 获取综合数据分析
export function getAnalyticsOverview() {
    return service.get('/data-analytics/overview')
}

// 用户登出接口
export function logout() {
    return service.post('/user/logout')
}