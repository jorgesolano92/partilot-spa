<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AppNotification, NotificationsListResponse } from '@/types'

interface RoleInvitationDetail {
  key: string
  screen_title?: string
  intro_sentence?: string
  accept_label?: string
  reject_label?: string
  summary_bullets?: string[]
  context?: { entity_name?: string }
}

const props = defineProps<{ refreshKey?: number }>()
const emit = defineEmits<{ (e: 'answered'): void }>()

const auth = useAuthStore()
const route = useRoute()

const pending = ref<AppNotification | null>(null)
const detail = ref<RoleInvitationDetail | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)
const showTerms = ref(false)

// En la propia bandeja ya se ve el detalle completo de la invitación.
const visible = computed(
  () => route.name !== 'usuario-notificaciones' && (pending.value !== null || done.value !== null),
)

function isActionableInvite(n: AppNotification): boolean {
  return (
    n.tipo === 'invitacion_vendedor' &&
    Boolean(n.roleInvitationKey) &&
    (n.actionable === true || n.assignmentState === 'pending' || n.assignmentState === 'sent')
  )
}

async function load() {
  if (!auth.isAuthenticated) {
    pending.value = null
    detail.value = null
    return
  }
  try {
    const { data } = await api.get<NotificationsListResponse>('/notifications')
    const next = (data.notifications || []).find(isActionableInvite) ?? null
    if (next?.roleInvitationKey !== pending.value?.roleInvitationKey) {
      detail.value = null
      showTerms.value = false
    }
    pending.value = next
    if (next?.roleInvitationKey && !detail.value) {
      const res = await api.get<{ success: boolean; invitation?: RoleInvitationDetail }>(
        `/legal/role-invitations/${encodeURIComponent(next.roleInvitationKey)}`,
      )
      detail.value = res.data.invitation ?? null
    }
  } catch {
    /* el banner es opcional: si falla, la invitación sigue en Notificaciones */
  }
}

async function respond(action: 'accept' | 'reject') {
  const key = pending.value?.roleInvitationKey
  if (!key) return
  busy.value = true
  error.value = null
  try {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      `/legal/role-invitations/${encodeURIComponent(key)}/respond`,
      { action },
    )
    if (!data.success) {
      error.value = data.message || 'No se pudo procesar la invitación.'
      return
    }
    done.value =
      data.message || (action === 'accept' ? 'Invitación aceptada.' : 'Invitación rechazada.')
    pending.value = null
    detail.value = null
    await auth.refresh()
    emit('answered')
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo procesar la invitación.'
  } finally {
    busy.value = false
  }
}

watch(
  () => props.refreshKey,
  () => void load(),
)
watch(
  () => auth.isAuthenticated,
  () => void load(),
)

function onVisibilityChange() {
  if (document.visibilityState === 'visible') void load()
}

onMounted(() => {
  void load()
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div v-if="visible" class="invite-banner" role="status">
    <template v-if="pending">
      <div class="invite-text">
        <strong>
          {{ detail?.context?.entity_name || pending.entidadNombre || pending.titulo }}
          te ha invitado como vendedor
        </strong>
        <p v-if="detail?.intro_sentence" class="muted small">{{ detail.intro_sentence }}</p>
        <button
          v-if="detail?.summary_bullets?.length"
          class="link-btn small"
          type="button"
          @click="showTerms = !showTerms"
        >
          {{ showTerms ? 'Ocultar responsabilidades del rol' : 'Ver responsabilidades del rol' }}
        </button>
        <ul v-if="showTerms && detail?.summary_bullets?.length" class="bullets small">
          <li v-for="(b, i) in detail.summary_bullets" :key="i">{{ b }}</li>
        </ul>
        <p v-if="error" class="error small">{{ error }}</p>
      </div>
      <div class="invite-actions">
        <button class="btn" type="button" :disabled="busy || !detail" @click="respond('accept')">
          {{ detail?.accept_label || 'Aceptar' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="busy || !detail" @click="respond('reject')">
          {{ detail?.reject_label || 'Rechazar' }}
        </button>
        <RouterLink
          class="link-btn small"
          :to="{ name: 'usuario-notificaciones', query: { invitation: pending.roleInvitationKey } }"
        >
          Ver detalle
        </RouterLink>
      </div>
    </template>
    <template v-else-if="done">
      <span class="invite-text"><strong>{{ done }}</strong></span>
      <button class="btn btn-ghost" type="button" @click="done = null">Cerrar</button>
    </template>
  </div>
</template>

<style scoped>
.invite-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid var(--accent);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.invite-text {
  flex: 1 1 260px;
  min-width: 0;
}
.invite-text p {
  margin: 0.25rem 0 0;
}
.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.small {
  font-size: 0.85rem;
}
.bullets {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--ink);
  text-decoration: underline;
  cursor: pointer;
}
.error {
  color: #c62828;
}
</style>
