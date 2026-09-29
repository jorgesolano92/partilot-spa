<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { formatDateTime, mediaUrl } from '@/lib/format'
import { notificationKindLabel } from '@/lib/notificationLabels'
import { useAuthStore } from '@/stores/auth'
import type { AppNotification, NotificationsListResponse } from '@/types'

interface RoleInvitationDetail {
  key: string
  screen_title?: string
  intro_sentence?: string
  accept_label?: string
  reject_label?: string
  summary_bullets?: string[]
  context?: {
    entity_name?: string
    invited_at?: string
  }
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const items = ref<AppNotification[]>([])
const selected = ref<AppNotification | null>(null)
const invitation = ref<RoleInvitationDetail | null>(null)
const invitationError = ref<string | null>(null)

const unread = computed(() => items.value.filter((n) => !n.leida).length)

function isActionableInvite(n: AppNotification): boolean {
  return (
    n.tipo === 'invitacion_vendedor' &&
    (n.actionable === true ||
      n.assignmentState === 'pending' ||
      n.assignmentState === 'sent' ||
      Boolean(n.roleInvitationKey))
  )
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<NotificationsListResponse>('/notifications')
    items.value = data.notifications || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar las notificaciones.'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadInvitation(key: string) {
  invitation.value = null
  invitationError.value = null
  try {
    const { data } = await api.get<{ success: boolean; invitation?: RoleInvitationDetail }>(
      `/legal/role-invitations/${encodeURIComponent(key)}`,
    )
    invitation.value = data.invitation ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    invitationError.value = err.response?.data?.message || 'No se pudo cargar la invitación.'
  }
}

async function openItem(n: AppNotification) {
  selected.value = n
  invitation.value = null
  invitationError.value = null

  if (!n.leida) {
    try {
      await api.put(`/notifications/${n.id}/read`)
      n.leida = true
    } catch {
      /* keep unread visually if API fails */
    }
  }

  if (isActionableInvite(n) && n.roleInvitationKey) {
    await loadInvitation(n.roleInvitationKey)
  }
}

function closeDetail() {
  selected.value = null
  invitation.value = null
  invitationError.value = null
  if (route.query.invitation) {
    void router.replace({ name: 'usuario-notificaciones' })
  }
}

async function respondInvitation(action: 'accept' | 'reject') {
  const key = selected.value?.roleInvitationKey
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
    await auth.refresh()
    closeDetail()
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo procesar la invitación.'
  } finally {
    busy.value = false
  }
}

async function markAllRead() {
  if (!unread.value) return
  busy.value = true
  try {
    await api.post('/notifications/mark-all-read')
    items.value = items.value.map((n) => ({ ...n, leida: true }))
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron marcar como leídas.'
  } finally {
    busy.value = false
  }
}

async function openFromDeepLink(key: string) {
  let target = items.value.find((n) => n.roleInvitationKey === key)
  if (!target) {
    const sellerId = key.startsWith('seller-') ? key.slice('seller-'.length) : ''
    if (sellerId) {
      try {
        await api.post(`/notifications/seller-invitations/${sellerId}/notify`)
        await load()
        target = items.value.find((n) => n.roleInvitationKey === key)
      } catch {
        /* fall through */
      }
    }
  }
  if (target) {
    await openItem(target)
    return
  }
  invitationError.value = 'Invitación no disponible o ya procesada.'
  selected.value = {
    id: 0,
    tipo: 'invitacion_vendedor',
    titulo: 'Invitación vendedor',
    mensaje: '',
    fecha: new Date().toISOString(),
    leida: true,
    roleInvitationKey: key,
    actionable: true,
  }
  await loadInvitation(key)
}

watch(
  () => route.query.invitation,
  (key) => {
    if (typeof key === 'string' && key.length > 0) {
      void openFromDeepLink(key)
    }
  },
)

onMounted(async () => {
  await load()
  const key = route.query.invitation
  if (typeof key === 'string' && key.length > 0) {
    await openFromDeepLink(key)
  }
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'usuario' }">← Volver a cartera</RouterLink>
    <div class="page-toolbar">
      <div class="section-header">
        <h1 class="section-title">Notificaciones</h1>
        <p class="section-subtitle">
          {{ unread ? `${unread} sin leer` : 'Todas leídas' }}
        </p>
      </div>
      <button
        class="btn-outline"
        type="button"
        :disabled="busy || !unread"
        @click="markAllRead"
      >
        Marcar todas
      </button>
    </div>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="!loading">
      <p v-if="!items.length && !error" class="muted">No tienes notificaciones.</p>

      <article
        v-for="n in items"
        :key="n.id"
        class="item"
        :class="{ unread: !n.leida }"
      >
        <button type="button" class="item-btn" @click="openItem(n)">
          <img
            v-if="n.entity_image"
            class="thumb"
            :src="mediaUrl(n.entity_image)"
            alt=""
          />
          <div v-else class="thumb ph">●</div>
          <div class="info">
            <strong>{{ n.titulo || notificationKindLabel(n.tipo) }}</strong>
            <span class="muted clamp">{{ n.mensaje }}</span>
            <span v-if="n.entidadNombre" class="muted">{{ n.entidadNombre }}</span>
            <span v-if="isActionableInvite(n)" class="tag-pending">Acción pendiente</span>
          </div>
          <div class="meta">
            <span class="pill">{{ notificationKindLabel(n.tipo) }}</span>
            <span class="muted">{{ formatDateTime(n.fecha) }}</span>
          </div>
        </button>
      </article>
    </template>
  </section>

  <div v-if="selected" class="overlay" @click.self="closeDetail">
    <div class="card sheet stack">
      <span class="pill">{{ notificationKindLabel(selected.tipo) }}</span>
      <h3>{{ invitation?.screen_title || selected.titulo }}</h3>
      <p class="muted">{{ formatDateTime(selected.fecha) }}</p>
      <p v-if="selected.mensaje">{{ selected.mensaje }}</p>
      <p v-if="invitation?.intro_sentence" class="muted">{{ invitation.intro_sentence }}</p>
      <ul v-if="invitation?.summary_bullets?.length" class="bullets">
        <li v-for="(b, i) in invitation.summary_bullets" :key="i">{{ b }}</li>
      </ul>
      <p v-if="selected.detalle">{{ selected.detalle }}</p>
      <p v-if="selected.entidadNombre || invitation?.context?.entity_name" class="muted">
        Entidad: {{ invitation?.context?.entity_name || selected.entidadNombre }}
      </p>
      <p v-if="selected.invitadorTexto" class="muted">{{ selected.invitadorTexto }}</p>
      <p v-if="invitationError" class="error">{{ invitationError }}</p>

      <template v-if="isActionableInvite(selected) && invitation">
        <div class="row-actions">
          <button class="btn" type="button" :disabled="busy" @click="respondInvitation('accept')">
            {{ invitation.accept_label || 'Aceptar' }}
          </button>
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="busy"
            @click="respondInvitation('reject')"
          >
            {{ invitation.reject_label || 'Rechazar' }}
          </button>
        </div>
      </template>

      <button class="btn btn-ghost" type="button" @click="closeDetail">Cerrar</button>
    </div>
  </div>
</template>

<style scoped>
h2,
h3 {
  margin: 0 0 0.25rem;
}
.item {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.item.unread {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.item-btn {
  width: 100%;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 0.7rem;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
}
.thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  background: #eef2f6;
}
.ph {
  display: grid;
  place-items: center;
  color: var(--accent);
  font-size: 0.7rem;
}
.info,
.meta {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}
.meta {
  align-items: flex-end;
  font-size: 0.78rem;
}
.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pill {
  display: inline-flex;
  align-self: flex-start;
  background: #eef2f6;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
}
.meta .pill {
  align-self: flex-end;
}
.tag-pending {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
}
.bullets {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.sheet h3 {
  margin-top: 0.2rem;
}
@media (max-width: 700px) {
  .item-btn {
    grid-template-columns: 36px 1fr;
  }
  .meta {
    grid-column: 1 / -1;
    align-items: flex-start;
  }
}
</style>
