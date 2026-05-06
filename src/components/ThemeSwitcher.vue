<script setup>
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const theme = useThemeStore()
const { preference } = storeToRefs(theme)

const labels = { light: '浅色', dark: '深色', auto: '跟随系统' }

const handleCommand = (cmd) => {
  theme.setPreference(cmd)
}
</script>

<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button :aria-label="`主题：${labels[preference]}`" circle class="theme-trigger">
      <el-icon v-if="preference === 'light'" :size="18">
        <Sunny />
      </el-icon>
      <el-icon v-else-if="preference === 'dark'" :size="18">
        <Moon />
      </el-icon>
      <el-icon v-else :size="18">
        <Monitor />
      </el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="light" :class="{ 'is-active-theme': preference === 'light' }">
          <el-icon class="theme-item-icon">
            <Sunny />
          </el-icon>
          {{ labels.light }}
        </el-dropdown-item>
        <el-dropdown-item command="dark" :class="{ 'is-active-theme': preference === 'dark' }">
          <el-icon class="theme-item-icon">
            <Moon />
          </el-icon>
          {{ labels.dark }}
        </el-dropdown-item>
        <el-dropdown-item command="auto" :class="{ 'is-active-theme': preference === 'auto' }">
          <el-icon class="theme-item-icon">
            <Monitor />
          </el-icon>
          {{ labels.auto }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
.theme-trigger {
  border: 1px solid var(--app-border, #e5e7eb);
  background: var(--app-surface, #fff);
  color: var(--app-text, #111827);
}

.theme-item-icon {
  margin-right: 8px;
  vertical-align: middle;
}

:deep(.is-active-theme) {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
