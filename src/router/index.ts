import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'usuario',
          name: 'usuario',
          component: () => import('@/views/UsuarioView.vue'),
          meta: { mode: 'usuario' },
        },
        {
          path: 'vendedor',
          name: 'vendedor',
          component: () => import('@/views/VendedorView.vue'),
          meta: { mode: 'vendedor' },
        },
        {
          path: 'gestor',
          name: 'gestor',
          component: () => import('@/views/GestorView.vue'),
          meta: { mode: 'gestor' },
        },
        {
          path: 'gestor/entidad',
          name: 'gestor-entidad',
          component: () => import('@/views/SelectEntityView.vue'),
          meta: { mode: 'gestor' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'home' }
  }

  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.refresh()
    } catch {
      auth.logout()
      return { name: 'login' }
    }
  }

  if (to.meta.mode === 'vendedor' && !auth.canVendedor) {
    return { name: 'home' }
  }
  if (to.meta.mode === 'gestor' && !auth.canGestor) {
    return { name: 'home' }
  }

  if (to.name === 'gestor' && auth.needsEntityPick) {
    return { name: 'gestor-entidad' }
  }

  return true
})

export default router
