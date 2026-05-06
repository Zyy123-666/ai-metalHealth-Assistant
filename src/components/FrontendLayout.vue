<script setup>
import { onMounted, ref } from 'vue';
import { logout } from '@/api/admin';
import { useRouter } from 'vue-router';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';

const router = useRouter()
const iconUrl = new URL('../assets/images/机器人.png', import.meta.url).href

onMounted(() => {
    localStorage.getItem('token') ? isLoggedIn.value = true : isLoggedIn.value = false
})
// 登录状态判断->显示不同顶栏
const isLoggedIn = ref(false)

// 登出
const handleLogout = () => {
    logout().then(() => {
        // 清除缓存
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        // 跳转到登录页
        router.push('/auth/login')
        isLoggedIn.value = false
    })
}
</script>

<template>
    <div class="frontend-layout">
        <div class="navbar-container">
            <div class="brand-section">
                <el-image :src="iconUrl" style="width: 50px;height: 50px;" class="brand-logo"></el-image>
                <h1 class="brand-name">心理健康AI助手</h1>
            </div>

            <div class="nav-section">
                <router-link to="/" class="nav-link">首页</router-link>
                <router-link to="/consultation" class="nav-link" v-if="isLoggedIn">AI咨询</router-link>
                <router-link to="/emotion-diary" class="nav-link" v-if="isLoggedIn">情绪日志</router-link>
                <router-link to="/knowledge" class="nav-link">知识库</router-link>
                <ThemeSwitcher class="theme-switcher" />
                <el-button class="logout-btn" v-if="isLoggedIn" @click="handleLogout">退出登录</el-button>

                <template v-else>
                    <router-link to="/auth/login" class="nav-link">登录</router-link>
                    <router-link to="/auth/register" class="nav-link">
                        <el-button type="primary">注册</el-button>
                    </router-link>
                </template>
            </div>
        </div>

        <div class="main-container">
            <router-view></router-view>
        </div>

        <div class="footer-container">
            <div class="footer-bottom">
                <p>&copy; 2026 心理健康AI助手. 保留所有权利.</p>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.frontend-layout {
    background-color: var(--app-surface);
    color: var(--app-text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;

    .navbar-container {
        width: 100%;
        max-width: 1200px;
        box-sizing: border-box;
        flex-shrink: 0;
        margin: 0 auto;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .brand-section {
            display: flex;
            align-items: center;

            .brand-name {
                margin-left: 10px;
                font-size: 24px;
                font-weight: 600;
                color: var(--app-text-secondary);
            }
        }

        .nav-section {
            display: flex;
            align-items: center;
            gap: 24px;

            .nav-link {
                color: var(--app-nav-link);
                font-size: 16px;
                font-weight: 500;

                &:hover {
                    color: var(--app-nav-link-hover);
                }
            }
        }
    }

    .main-container {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    .footer-container {
        background: var(--app-footer-bg);
        color: var(--app-footer-text);
        padding: 15px 0;
        margin-top: auto;

        .footer-bottom {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 10px;
            text-align: center;
        }
    }
}
</style>