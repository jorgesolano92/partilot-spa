<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { ManagerSellerItem, ManagerSellersResponse } from '@/types'

const auth = useAuthStore()
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const feedback = ref<string | null>(null)
const sellers = ref<ManagerSellerItem[]>([])

const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteName = ref('')
const inviteLastName = ref('')
const inviteMode = ref<'check' | 'existing' | 'new'>('check')

const entityId = computed(() => auth.activeEntityId)

async function load() {
  if (!entityId.value) {
    sellers.value = []
    error.value = 'Selecciona una entidad primero.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<ManagerSellersResponse>(
      `/managers/me/entities/${entityId.value}/sellers`,
    )
    sellers.value = data.sellers || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar los vendedores.'
    sellers.value = []
  } finally {
    loading.value = false
  }
}

function openInvite() {
  inviteOpen.value = true
  inviteEmail.value = ''
  inviteName.value = ''
  inviteLastName.value = ''
  inviteMode.value = 'check'
  feedback.value = null
  error.value = null
}

function closeInvite() {
  inviteOpen.value = false
}

async function checkEmail() {
  const email = inviteEmail.value.trim()
  if (!email) return
  busy.value = true
  error.value = null
  try {
    const { data } = await api.post<{ exists: boolean }>('/managers/me/check-user-email', { email })
    inviteMode.value = data.exists ? 'existing' : 'new'
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo comprobar el email.'
  } finally {
    busy.value = false
  }
}

async function confirmInvite() {
  if (!entityId.value) return
  const email = inviteEmail.value.trim()
  busy.value = true
  error.value = null
  try {
    if (inviteMode.value === 'existing') {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        '/managers/me/store-existing-user',
        { entity_id: entityId.value, email },
      )
      feedback.value = data.message || 'Invitación enviada al usuario existente.'
    } else {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        '/managers/me/store-new-user',
        {
          entity_id: entityId.value,
          email,
          name: inviteName.value.trim() || undefined,
          last_name: inviteLastName.value.trim() || undefined,
        },
      )
      feedback.value = data.message || 'Invitación enviada.'
    }
    inviteOpen.value = false
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo invitar al vendedor.'
  } finally {
    busy.value = false
  }
}

watch(entityId, () => {
  void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div class="page-toolbar">
      <div class="section-header">
        <h1 class="section-title">Vendedores</h1>
        <p class="section-subtitle">{{ auth.activeEntity?.name || 'Entidad' }}</p>
      </div>
      <button class="btn" type="button" :disabled="!entityId" @click="openInvite">
        Invitar
      </button>
    </div>

    <p v-if="feedback" class="feedback-ok">{{ feedback }}</p>
    <p v-if="loading" class="loading-block">Cargando vendedores…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <article v-for="s in sellers" :key="s.id" class="list-card">
      <div>
        <h3 class="list-card-title">{{ s.name }}</h3>
        <p class="list-card-sub">
          {{ s.is_external ? 'Externo' : 'PARTILOT' }}
          <template v-if="s.group_name?.length"> · {{ s.group_name.join(', ') }}</template>
        </p>
      </div>
      <div class="list-card-meta">
        <span>{{ s.participations_count }} part.</span>
        <span :class="{ highlight: s.pending_amount > 0 }">
          {{ money(s.pending_amount) }} pend.
        </span>
      </div>
    </article>

    <div v-if="!loading && !error && !sellers.length" class="empty-state">
      <div class="empty-state-icon">👤</div>
      <h3>Sin vendedores</h3>
      <p>No hay vendedores en esta entidad.</p>
    </div>
  </section>

  <div v-if="inviteOpen" class="overlay" @click.self="closeInvite">
    <div class="card sheet stack">
      <h3>Invitar vendedor</h3>
      <label class="field">
        <span>Email</span>
        <input v-model="inviteEmail" type="email" />
      </label>

      <template v-if="inviteMode === 'check'">
        <button class="btn" type="button" :disabled="busy || !inviteEmail.trim()" @click="checkEmail">
          {{ busy ? 'Comprobando…' : 'Comprobar email' }}
        </button>
      </template>

      <template v-else-if="inviteMode === 'existing'">
        <p class="muted">Ese email ya tiene cuenta. Se enviará la invitación de vendedor.</p>
        <button class="btn" type="button" :disabled="busy" @click="confirmInvite">
          {{ busy ? 'Enviando…' : 'Invitar usuario existente' }}
        </button>
      </template>

      <template v-else>
        <p class="muted">No hay cuenta con ese email. Se creará una invitación PARTILOT.</p>
        <label class="field">
          <span>Nombre (opcional)</span>
          <input v-model="inviteName" type="text" />
        </label>
        <label class="field">
          <span>Apellidos (opcional)</span>
          <input v-model="inviteLastName" type="text" />
        </label>
        <button class="btn" type="button" :disabled="busy" @click="confirmInvite">
          {{ busy ? 'Enviando…' : 'Enviar invitación' }}
        </button>
      </template>

      <button class="btn btn-ghost" type="button" @click="closeInvite">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 0.25rem;
}
</style>
