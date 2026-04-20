<script setup>
import Navbar from './Navbar.vue';
import Sidebar from './Sidebar.vue';


</script>

<template>
    <div class="backend-layout">
        <el-container class="main-container">
            <Sidebar />
            <el-container direction="vertical">
                <el-header class="layout-header">
                    <Navbar />
                </el-header>
                <el-main class="main-class">
                    <router-view class="content-container"></router-view>
                </el-main>
            </el-container>
        </el-container>
    </div>
</template>

<style scoped lang="scss">
.backend-layout {
    height: 100vh;

    .main-container {
        height: 100%;

        :deep(.layout-header) {
            height: 74px;
            padding: 0;
            box-sizing: border-box;
        }

        .main-class {
            flex: 1;
            min-height: 0;
            padding: 20px;
            background-color: #f1f4f6;
        }

        .content-container {
            min-height: 100%;
            padding: 20px;
            background-color: #fff;
        }
    }
}
</style>
