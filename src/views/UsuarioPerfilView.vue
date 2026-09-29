<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)

const displayName = computed(() => {
  if (!auth.user) return '—'
  return [auth.user.name, auth.user.last_name, auth.user.last_name2].filter(Boolean).join(' ') || '—'
})

const roleSummary = computed(() => {
  const parts: string[] = []
  if (auth.canVendedor) parts.push('Vendedor')
  if (auth.canGestor) parts.push('Gestor')
  return parts.length ? parts.join(' · ') : '—'
})

async function refresh() {
  loading.value = true
  error.value = null
  try {
    await auth.refresh()
  } catch {
    error.value = 'No se pudo actualizar el perfil.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'usuario' }">← Volver a cartera</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Mi perfil</h1>
      <p class="section-subtitle">Datos de tu cuenta (lectura). La edición completa llegará cuando la API de perfil esté activa.</p>
    </div>

    <p v-if="loading" class="muted">Actualizando…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="box">
      <p><span>Nombre</span> <strong>{{ displayName }}</strong></p>
      <p><span>Email</span> <strong>{{ auth.user?.email || '—' }}</strong></p>
      <p><span>NIF/CIF</span> <strong>{{ auth.user?.nif_cif || '—' }}</strong></p>
      <p v-if="auth.canVendedor || auth.canGestor">
        <span>Roles</span>
        <strong>{{ roleSummary }}</strong>
      </p>
    </div>

    <div class="row">
      <button class="btn btn-ghost" type="button" :disabled="loading" @click="refresh">
        Actualizar
      </button>
      <RouterLink class="btn btn-ghost" :to="{ name: 'usuario-notificaciones' }">
        Notificaciones
      </RouterLink>
      <RouterLink class="btn btn-ghost" :to="{ name: 'usuario-historial' }">Historial</RouterLink>
    </div>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.box p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}
.box span {
  color: var(--muted);
}
</style>
