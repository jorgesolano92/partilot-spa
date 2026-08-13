<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { TacoItem, TacoSummary, TacosResponse } from '@/types'

const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)
const summary = ref<TacoSummary | null>(null)
const tacos = ref<TacoItem[]>([])
const entityId = computed(() => auth.activeEntityId)

async function load() {
  if (!entityId.value) {
    error.value = 'Selecciona una entidad primero.'
    summary.value = null
    tacos.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<TacosResponse>('/managers/me/tacos', {
      params: { entity_id: entityId.value },
    })
    summary.value = data.summary ?? null
    tacos.value = data.tacos || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar las participaciones.'
    summary.value = null
    tacos.value = []
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
      <h2>Participaciones</h2>
      <p class="muted">Resumen de tacos de {{ auth.activeEntity?.name || 'la entidad' }}.</p>
    </div>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="summary" class="summary-strip">
      <div class="summary-chip">
        <strong>{{ summary.available_participations }}</strong>
        <span>Disponibles</span>
      </div>
      <div class="summary-chip">
        <strong>{{ summary.sales_registered }}</strong>
        <span>Vendidas</span>
      </div>
      <div class="summary-chip">
        <strong>{{ summary.returned_participations }}</strong>
        <span>Devueltas</span>
      </div>
      <div class="summary-chip">
        <strong>{{ money(summary.available_amount) }}</strong>
        <span>Importe disp.</span>
      </div>
    </div>

    <article v-for="t in tacos" :key="`${t.set_id}-${t.book_number}-${t.seller_name || ''}`" class="taco">
      <div>
        <strong>{{ t.lottery_name || t.set_name || 'Set' }}</strong>
        <p class="muted">{{ t.participations_range }}</p>
        <p v-if="t.seller_name" class="muted tiny">{{ t.seller_name }}</p>
      </div>
      <div class="meta">
        <span>{{ t.available_participations }} disp.</span>
        <span>{{ t.sales_registered }} vend.</span>
        <span>{{ money(t.available_amount) }}</span>
      </div>
    </article>

    <p v-if="!loading && !error && !tacos.length" class="muted">No hay tacos en esta entidad.</p>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.tiny {
  font-size: 0.82rem;
}
.taco {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  background: #fff;
}
.taco p {
  margin: 0.12rem 0 0;
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
</style>
