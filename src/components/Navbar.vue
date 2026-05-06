<script setup>
import { useAdmainStore } from '@/stores/admin';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { logout } from '@/api/admin';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';

const route = useRoute();
const router = useRouter();

const handleCommand = (command) => {
    if (command === 'logout') {
        // 处理退出登录逻辑
        ElMessageBox.confirm('确定要退出登录吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
            .then(() => {
                // 确认退出登录
                logout().then(() => {
                    // 2.清除token、缓存
                    localStorage.removeItem('token');
                    localStorage.removeItem('userInfo')
                    // 1.跳转页面
                    router.push('/auth/login');

                })
            })
    }
}
const handleCollase = () => {
    useAdmainStore().toggleCollapse()
}
</script>

<template>
    <div class="navbar">
        <div class="flex-box">
            <el-button @click="handleCollase">
                <el-icon>
                    <Expand />
                </el-icon>
            </el-button>
            <p class="page-title">{{ route.meta.title }}</p>
        </div>
        <div class="flex-box flex-box-end">
            <ThemeSwitcher class="navbar-theme" />
            <el-dropdown @command="handleCommand">
                <div class="flex-box">
                    <el-avatar src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
                    <p class="user-name">admin</p>
                    <el-icon>
                        <ArrowDown />
                    </el-icon>
                </div>
                <template #dropdown>
                    <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.navbar {
    height: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    background: var(--app-surface);
    box-shadow: 0 1px 4px var(--app-navbar-shadow);

    .flex-box-end {
        gap: 12px;
    }

    .flex-box {
        display: flex;
        align-items: center;

        .page-title {
            margin-left: 20px;
            font-size: 26px;
            font-weight: bold;
            color: var(--app-text-secondary);
        }

        .user-name {
            margin: 0 5px;
            font-weight: bold;
        }
    }
}
</style>