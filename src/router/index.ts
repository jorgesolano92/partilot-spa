import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/registro',
      name: 'registro',
      component: () => import('@/views/RegisterView.vue'),
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
          path: 'usuario/cobrar',
          name: 'usuario-cobrar',
          component: () => import('@/views/UsuarioCobrarView.vue'),
          meta: { mode: 'usuario' },
        },
        {
          path: 'usuario/historial',
          name: 'usuario-historial',
          component: () => import('@/views/UsuarioHistorialView.vue'),
          meta: { mode: 'usuario' },
        },
        {
          path: 'usuario/notificaciones',
          name: 'usuario-notificaciones',
          component: () => import('@/views/UsuarioNotificacionesView.vue'),
          meta: { mode: 'usuario' },
        },
        {
          path: 'usuario/perfil',
          name: 'usuario-perfil',
          component: () => import('@/views/UsuarioPerfilView.vue'),
          meta: { mode: 'usuario' },
        },
        {
          path: 'vendedor',
          name: 'vendedor',
          component: () => import('@/views/VendedorView.vue'),
          meta: { mode: 'vendedor' },
        },
        {
          path: 'vendedor/venta',
          name: 'vendedor-venta',
          component: () => import('@/views/VendedorVentaView.vue'),
          meta: { mode: 'vendedor' },
        },
        {
          path: 'vendedor/participaciones',
          name: 'vendedor-participaciones',
          component: () => import('@/views/VendedorParticipacionesView.vue'),
          meta: { mode: 'vendedor' },
        },
        {
          path: 'vendedor/ventas',
          name: 'vendedor-ventas',
          component: () => import('@/views/VendedorVentasView.vue'),
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
        {
          path: 'gestor/participaciones',
          name: 'gestor-participaciones',
          component: () => import('@/views/GestorParticipacionesView.vue'),
          meta: { mode: 'gestor' },
        },
        {
          path: 'gestor/vendedores',
          name: 'gestor-vendedores',
          component: () => import('@/views/GestorVendedoresView.vue'),
          meta: { mode: 'gestor' },
        },
        {
          path: 'gestor/devolucion',
          name: 'gestor-devolucion',
          component: () => import('@/views/GestorDevolucionView.vue'),
          meta: { mode: 'gestor' },
        },
        {
          path: 'gestor/pago',
          name: 'gestor-pago',
          component: () => import('@/views/GestorPagoView.vue'),
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

  if (to.meta.mode === 'usuario' || to.meta.mode === 'vendedor' || to.meta.mode === 'gestor') {
    auth.setMode(to.meta.mode)
  }

  if (to.meta.mode === 'gestor' && auth.managerEntities.length === 1) {
    const only = auth.managerEntities[0]
    if (only && auth.activeEntityId !== only.id) {
      auth.setActiveEntity(only.id)
    }
    if (to.name === 'gestor-entidad') {
      return { name: 'gestor-participaciones' }
    }
    if (to.name === 'gestor') {
      return { name: 'gestor-participaciones' }
    }
  }

  if (
    to.meta.mode === 'gestor' &&
    to.name !== 'gestor-entidad' &&
    auth.managerEntities.length > 1 &&
    !auth.activeEntityId
  ) {
    return { name: 'gestor-entidad' }
  }

  return true
})

export default router
