<script setup>
import { login } from '@/api/admin';
import { Back } from '@element-plus/icons-vue';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const formData = reactive({
    username: '',
    password: '',
})
const rules = reactive({
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
    ]
})

const ruleFormRef = ref()
// 登录事件处理
const submitForm = async (formEl) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            login(formData).then(data => {
                // 判断token是否存在
                if (!data.token) {
                    return console.error('登录失败')
                }
                // 登录成功：必须用 setItem 写入；getItem 只会读取，不会保存
                localStorage.setItem('token', data.token)
                localStorage.setItem('userInfo', JSON.stringify(data.userInfo ?? {}))
                // 根据用户角色判断跳转路径：前台/后台
                if (data.userInfo.userType === 2) {
                    // 后台
                    router.push('/back/dashboard')
                } else {
                    router.push('/')
                }
            })

        }
    })
}
</script>

<template>
    <div class="container">
        <div class="title">
            <div class="back-home">
                <el-icon>
                    <Back />
                </el-icon>
                <span>返回首页</span>
            </div>
            <div class="title-text">
                <h2>登录您的账户</h2>
                <p>请输入您的登录信息</p>
            </div>
        </div>
        <div class="form-container">
            <el-form ref="ruleFormRef" :model="formData" :rules="rules" label-position="top" style="max-width: 600px">
                <el-form-item label="用户名或密码" prop="username">
                    <el-input v-model="formData.username" size="large" placeholder="请输入用户名" />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-input v-model="formData.password" size="large" placeholder="请输入密码" type="password"
                        show-password />
                </el-form-item>

                <el-button class="btn" size="large" type="primary" @click="submitForm(ruleFormRef)">登录</el-button>
            </el-form>

            <div class="footer">
                <p>还没有账户? <router-link to="/auth/register">去注册</router-link></p>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.container {
    width: 384px;

    .title {
        .back-home {
            margin-bottom: 60px;
        }

        .title-text {
            text-align: center;

            h2 {
                font-size: 36px;
                margin-bottom: 10px;
            }

            p {
                font-size: 18px;
                color: #6b7280;
            }
        }
    }

    .form-container {
        margin-top: 30px;

        .btn {
            margin-top: 40px;
            width: 100%;
        }

        .footer {
            margin-top: 40px;
            text-align: center;

            p {
                color: #6b7280;
            }
        }
    }
}
</style>
