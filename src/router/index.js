import { createRouter, createWebHistory } from 'vue-router'
import BackendLayout from '../components/BackendLayout.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import FrontendLayout from '@/components/FrontendLayout.vue'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: FrontendLayout,
      children: [
        {
          path: '',
          component: () => import('@/views/home.vue'),
          meta: {
            title: '首页'
          }
        },
        {
          path: 'consultation',
          component: () => import('@/views/consultation.vue'),
        },
        {
          path: 'emotion-diary',
          component: () => import('@/views/emotionDiary.vue'),
        },
        {
          path: 'knowledge',
          component: () => import('@/views/frontendKnowledge.vue'),
        },
        {
          path: '/knowledge/article/:id',
          component: () => import('@/views/articleDetail.vue'),
          props: true
        },
      ]
    },
    {
      path: '/back',
      component: BackendLayout,
      redirect: '/back/dashboard',
      children: [
        {
          path: 'dashboard',
          component: () => import('@/views/DashBoard.vue'),
          meta: {
            title: '数据分析',
            icon: 'PieChart'
          }
        },
        {
          path: 'knowledge',
          component: () => import('@/views/Knowledge.vue'),
          meta: {
            title: '知识文章',
            icon: 'ChatLineSquare'
          }
        },
        {
          path: 'consultations',
          component: () => import('@/views/Consultations.vue'),
          meta: {
            title: '咨询记录',
            icon: 'Message'
          }
        },
        {
          path: 'emotional',
          component: () => import('@/views/Emotional.vue'),
          meta: {
            title: '情绪日志',
            icon: 'User'
          }
        },
      ],
    },
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          component: () => import('@/views/login.vue'),
          meta: {
            title: '登录'
          }
        },
        {
          path: 'register',
          component: () => import('@/views/Register.vue'),
          meta: {
            title: '注册'
          }
        },
      ]
    },
  ],
})

// 路由前置守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  // 当前用户是否登录
  if (token) {
    // 登录了
    const userInfo = JSON.parse(localStorage.getItem('userInfo'))
    // 是后台用户
    if (userInfo.userType === 2) {
      if (to.path.startsWith('/back')) {
        // 访问后台页面，放行
        next()
      } else {
        // 访问其他页面，重定向到后台首页
        next('/back/dashboard')
      }
    } else if (userInfo.userType === 1) {
      if (to.path.startsWith('/back') || to.path.startsWith('/auth')) {
        // 已登录的前台用户访问登录/注册页，重定向到首页
        next('/')
      }
      else {
        next() // 访问其他页面，放行
      }
    }

  } else {
    if (to.path.startsWith('/back')) {
      // 如果是访问后台页面但没有token，重定向到登录页
      next('/auth/login')
    } else {
      // 其他页面直接放行
      next()
    }
  }
})

export default router
