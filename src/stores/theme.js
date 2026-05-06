import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'app-color-scheme'

function readStoredPreference() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function applyHtmlClass(isDark) {
  const root = document.documentElement
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

let systemListenerAttached = false

export const useThemeStore = defineStore('theme', () => {
  const preference = ref(readStoredPreference())
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const systemIsDark = ref(systemDarkQuery.matches)

  const isDark = computed(() => {
    if (preference.value === 'dark') return true
    if (preference.value === 'light') return false
    return systemIsDark.value
  })

  function onSystemChange(e) {
    if (preference.value !== 'auto') return
    systemIsDark.value = e.matches
  }

  function setPreference(p) {
    preference.value = p
    localStorage.setItem(STORAGE_KEY, p)
    if (p === 'auto') {
      systemIsDark.value = systemDarkQuery.matches
    }
  }

  function init() {
    if (systemListenerAttached) return
    systemListenerAttached = true
    systemDarkQuery.addEventListener('change', onSystemChange)
  }

  watch(isDark, applyHtmlClass, { immediate: true })

  return { preference, isDark, setPreference, init }
})
