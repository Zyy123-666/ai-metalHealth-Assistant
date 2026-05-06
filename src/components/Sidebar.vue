<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdmainStore } from '@/stores/admin';

const router = useRouter()
const route = useRoute()

// 相对本文件：图片在 src/assets/images/（注意是 images 复数）
const iconUrl = new URL('../assets/images/机器人.png', import.meta.url).href

/** /back 下的子路由，用于菜单；index 必须用完整 path，配合 el-menu 的 router */
const backMenuRoutes = computed(() => {
    const back = router.options.routes.find((r) => r.path === '/back')
    return back?.children ?? []
})

const isCallapse = computed(() => useAdmainStore().isCollapse)
</script>

<template>
    <el-aside :width="isCallapse ? '64px' : '264px'">
        <el-menu router :default-active="route.path" class="menu-style" :collapse="isCallapse"
            :collapse-transition="false">

            <div class="brand">
                <el-image style="width: 50px; height: 50px; margin-right: 10px;" :src="iconUrl" alt="logo" />
                <div v-show="!isCallapse" class="info-card">
                    <h1 class="brand-title">心理健康助手</h1>
                    <p class="brand-subtitle">管理后台</p>
                </div>
            </div>

            <el-menu-item v-for="item in backMenuRoutes" :key="item.path" :index="`/back/${item.path}`">
                <el-icon>
                    <component :is="item.meta.icon"></component>
                </el-icon>
                <span>{{ item.meta.title }}</span>
            </el-menu-item>
        </el-menu>
    </el-aside>
</template>

<style scoped lang="scss">
.menu-style {
    height: 100%;

    .brand {
        box-sizing: border-box;
        height: 74px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        background-color: var(--app-surface);
        border-bottom: 1px solid var(--app-border);

        .info-card {
            .brand-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
                color: var(--app-text-secondary);
            }

            .brand-subtitle {
                font-size: 14px;
                color: var(--app-muted);
            }
        }
    }
}
</style>
