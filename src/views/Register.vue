<script setup>
import { reactive, ref } from 'vue'
import { register } from '@/api/frontend'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

const formData = reactive({
    "username": "",
    "email": "",
    "nickname": "",
    "phone": "",
    "password": "",
    "confirmPassword": "",
    "gender": 0, //性别
    "userType": 1 //前台用户
})

// 校验规则
const rules = reactive({
    "username": [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度必须在 3-20 个字符之间', trigger: 'blur' }
    ],
    // 可选项
    "email": [
        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
        { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
    ],
    // "nickname": [
    //     { required: true, message: '请输入昵称', trigger: 'blur' },
    //     { min: 2, max: 30, message: '昵称长度必须在 2-30 个字符之间', trigger: 'blur' }
    // ],
    "phone": [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
    ],
    "password": [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度必须在 6-20 个字符之间', trigger: 'blur' }
    ],
    "confirmPassword": [
        { required: true, message: '请确认密码', trigger: 'blur' },
        // {
        //     validator(rule, value) {
        //         if (value !== formData.value.password) {
        //             return Promise.reject('两次输入的密码不一致')
        //         }
        //         return Promise.resolve()
        //     },
        //     trigger: 'blur'
        // }
    ]
})

// 表单提交
const submitFormRef = ref(null)
const submitForm = async (formEl) => {
    if (!formEl) return
    formEl.validate((valid) => {
        if (valid) {
            console.log('表单验证通过，提交数据：', formData.value)
            // 执行注册逻辑，调用 API 接口
            register(formData).then(({ data }) => {
                if (!data) {
                    ElMessage.success('注册成功！')
                    router.push('/auth/login') // 注册成功后跳转到登录页
                }
                if (data.code === "BUSINESS_ERROR") {
                    ElMessage.error(data.message || '注册失败')
                    return
                }
            })
        } else {
            console.log('表单验证失败')

        }
    })
}
</script>

<template>
    <div class="container">
        <div class="title">
            <div class="title-text">
                <h2>创建您的账号</h2>
                <p>请填写注册信息</p>
            </div>
        </div>

        <div class="form-container">
            <el-form label-position="top" :model="formData" :rules="rules" ref="submitFormRef">
                <el-form-item label="用户名或邮箱" prop="username">
                    <el-input v-model="formData.username" placeholder="请输入用户名或邮箱" size="large" />
                </el-form-item>

                <el-form-item label="邮箱" prop="email">
                    <el-input v-model="formData.email" placeholder="请输入邮箱地址" size="large" />
                </el-form-item>

                <el-form-item label="昵称" prop="nickname">
                    <el-input v-model="formData.nickname" placeholder="请输入昵称（可选）" size="large" />
                </el-form-item>

                <el-form-item label="手机号" prop="phone">
                    <el-input v-model="formData.phone" placeholder="请输入手机号（可选）" size="large" />
                </el-form-item>

                <el-form-item label="密码" prop="password">
                    <el-input v-model="formData.password" placeholder="请输入密码" size="large" type="password"
                        show-password />
                </el-form-item>

                <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input v-model="formData.confirmPassword" placeholder="请确认密码" size="large" type="password"
                        show-password />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" size="large" @click="submitForm(submitFormRef)" class="btn">注册</el-button>
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.container {
    width: 100%;
    max-width: 384px;
    margin: 0 auto;

    .flex-box {
        display: flex;
        align-items: center;
    }

    .title {
        .title-text {
            text-align: center;

            h2 {
                font-size: 26px;
                margin-bottom: 8px;
            }

            p {
                font-size: 14px;
                color: #6b7280;
            }
        }
    }

    .form-container {
        margin-top: 20px;

        :deep(.el-form-item) {
            margin-bottom: 14px;
        }

        .btn {
            margin-top: 4px;
            width: 100%;
        }

        .footer {
            padding: 30px;
            text-align: center;
        }
    }
}
</style>