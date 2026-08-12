import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import type {
  AppMode,
  LoginUsuarioResponse,
  ManagerEntity,
  ManagerPayload,
  SellerPayload,
  User,
} from '@/types'

const TOKEN_KEY = 'partilot_token'
const MODE_KEY = 'partilot_mode'
const ENTITY_KEY = 'partilot_active_entity_id'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)
  const seller = ref<SellerPayload | null>(null)
  const manager = ref<ManagerPayload | null>(null)
  const mode = ref<AppMode | null>((localStorage.getItem(MODE_KEY) as AppMode | null) || null)
  const activeEntityId = ref<number | null>(
    localStorage.getItem(ENTITY_KEY) ? Number(localStorage.getItem(ENTITY_KEY)) : null,
  )
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const canUsuario = computed(() => Boolean(user.value))
  const canVendedor = computed(() => Boolean(seller.value))
  const canGestor = computed(() => Boolean(manager.value))
  const managerEntities = computed<ManagerEntity[]>(() => manager.value?.entities ?? [])
  const needsEntityPick = computed(
    () => mode.value === 'gestor' && managerEntities.value.length > 1 && !activeEntityId.value,
  )
  const activeEntity = computed(
    () => managerEntities.value.find((e) => e.id === activeEntityId.value) ?? null,
  )

  function persistToken(value: string | null) {
    token.value = value
    if (value) localStorage.setItem(TOKEN_KEY, value)
    else localStorage.removeItem(TOKEN_KEY)
  }

  function setMode(next: AppMode | null) {
    mode.value = next
    if (next) localStorage.setItem(MODE_KEY, next)
    else localStorage.removeItem(MODE_KEY)
    if (next !== 'gestor') {
      // keep entity for convenience when returning to gestor
    }
  }

  function setActiveEntity(entityId: number | null) {
    activeEntityId.value = entityId
    if (entityId != null) localStorage.setItem(ENTITY_KEY, String(entityId))
    else localStorage.removeItem(ENTITY_KEY)
  }

  function applySession(data: LoginUsuarioResponse) {
    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || 'No se pudo iniciar sesión')
    }
    persistToken(data.token)
    user.value = data.user
    seller.value = data.seller ?? null
    manager.value = data.manager ?? null

    const entities = data.manager?.entities ?? []
    if (entities.length === 1) {
      setActiveEntity(entities[0].id)
    } else if (
      activeEntityId.value &&
      !entities.some((e) => e.id === activeEntityId.value)
    ) {
      setActiveEntity(null)
    }

    if (!mode.value) {
      if (data.seller) setMode('vendedor')
      else if (data.manager) setMode('gestor')
      else setMode('usuario')
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<LoginUsuarioResponse>('/auth/login-usuario', {
        email,
        password,
      })
      applySession(data)
      return data
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error de acceso'
      error.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    if (!token.value) return
    const { data } = await api.post<LoginUsuarioResponse>('/auth/refresh')
    applySession(data)
  }

  async function fetchUser() {
    if (!token.value) return
    const { data } = await api.get<{ success?: boolean; user?: User } | User>('/auth/user')
    const payload = data as { user?: User } & User
    user.value = payload.user ?? (payload.id ? (payload as User) : user.value)
  }

  function logout() {
    persistToken(null)
    user.value = null
    seller.value = null
    manager.value = null
    setMode(null)
    setActiveEntity(null)
  }

  function enterGestorMode() {
    setMode('gestor')
    if (managerEntities.value.length > 1) {
      setActiveEntity(null)
    } else if (managerEntities.value.length === 1) {
      setActiveEntity(managerEntities.value[0].id)
    }
  }

  return {
    token,
    user,
    seller,
    manager,
    mode,
    activeEntityId,
    loading,
    error,
    isAuthenticated,
    canUsuario,
    canVendedor,
    canGestor,
    managerEntities,
    needsEntityPick,
    activeEntity,
    login,
    logout,
    refresh,
    fetchUser,
    setMode,
    setActiveEntity,
    enterGestorMode,
  }
})
