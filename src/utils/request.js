import axios from "axios";

import { ElMessage } from "element-plus";



const service = axios.create({

    baseURL: '/api', //请求的前缀

    timeout: 5000 //请求超时时间

})



// 请求拦截器

service.interceptors.request.use(

    (config) => {

        // 发送请求前做的事

        const token = localStorage.getItem('token')

        if (token) {

            config.headers['token'] = token

        }

        return config

    },

    (error) => {

        // 请求错误做什么

        return Promise.reject(error)

    }

)



// 响应拦截器

service.interceptors.response.use(

    (response) => {

        // 响应前对数据做什么

        const { data, config } = response

        // 处理业务码：后端可能返回字符串 '200' 或数字 200

        const code = data?.code

        const isSuccess = code === '200' || code === 200

        if (isSuccess) {

            return data.data

        } else {

            if (data?.code === '-1' || data?.code === -1) {

                // 超时后非登录页面，重新登录

                if (!config.url?.includes('/login')) {

                    ElMessage.error(data?.msg || '登录过期，请重新登录')



                    localStorage.removeItem('token')

                    localStorage.removeItem('userInfo')

                    window.location.href = '/auth/login'

                } else {

                    ElMessage.error(data?.msg || '登录过期，请重新登录')

                    return Promise.reject('网络请求失败...')

                }

            }

        }

        return response

    },

    (error) => {

        const status = error.response?.status

        const resData = error.response?.data

        if (status === 401 && !error.config?.url?.includes('/login')) {

            ElMessage.error(typeof resData?.msg === 'string' ? resData.msg : '未授权，请重新登录')

            localStorage.removeItem('token')

            localStorage.removeItem('userInfo')

            window.location.href = '/auth/login'

        }

        return Promise.reject(error)

    }

)



export default service

