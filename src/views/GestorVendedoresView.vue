<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { ManagerSellerItem, ManagerSellersResponse } from '@/types'

const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)
const sellers = ref<ManagerSellerItem[]>([])

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

watch(entityId, () => {
  void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div>
      <h2>Vendedores</h2>
      <p class="muted">
        {{ auth.activeEntity?.name || 'Entidad' }} · alta completa sigue disponible en panel si eres
        responsable.
      </p>
    </div>

    <p v-if="loading" class="muted">Cargando vendedores…</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!loading && !sellers.length" class="muted">No hay vendedores en esta entidad.</p>

    <article v-for="s in sellers" :key="s.id" class="seller">
      <div>
        <strong>{{ s.name }}</strong>
        <p class="muted">
          {{ s.is_external ? 'Externo' : 'PARTILOT' }}
          <template v-if="s.group_name?.length"> · {{ s.group_name.join(', ') }}</template>
        </p>
      </div>
      <div class="meta">
        <span>{{ s.participations_count }} part.</span>
        <span :class="{ pending: s.pending_amount > 0 }">
          {{ money(s.pending_amount) }} pend.
        </span>
      </div>
    </article>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.seller {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  background: #fff;
}
.seller p {
  margin: 0.15rem 0 0;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.85rem;
  color: var(--muted);
  white-space: nowrap;
}
.pending {
  color: var(--accent);
  font-weight: 700;
}
</style>
