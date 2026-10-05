<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { EntityRef, TacoItem, TacoSummary, TacosResponse } from '@/types'

const auth = useAuthStore()
const entities = ref<EntityRef[]>([...(auth.seller?.entities ?? [])])
const entityId = ref<number | ''>('')
const loading = ref(false)
const error = ref<string | null>(null)
const summary = ref<TacoSummary | null>(null)
const tacos = ref<TacoItem[]>([])

async function ensureEntities() {
  if (entities.value.length) return
  try {
    const { data } = await api.get<{ success: boolean; entities: EntityRef[] }>('/sellers/me/entities')
    entities.value = data.entities || []
  } catch {
    /* keep empty */
  }
}

async function load() {
  if (!entityId.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<TacosResponse>('/sellers/me/tacos', {
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

onMounted(async () => {
  await ensureEntities()
  if (entities.value.length === 1) {
    entityId.value = entities.value[0].id
  }
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>

    <div class="section-header">
      <h1 class="section-title">Mis participaciones</h1>
      <p class="section-subtitle">Tacos asignados por entidad.</p>
    </div>

    <div v-if="entities.length > 1" class="filters-card">
      <label class="field">
        <span>¿De qué entidad?</span>
        <select v-model="entityId">
          <option disabled value="">Selecciona una entidad</option>
          <option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
      </label>
    </div>
    <div v-else-if="entities.length === 1" class="entity-banner">
      <div class="entity-banner-text">
        <span class="muted">Entidad</span>
        <strong>{{ entities[0].name }}</strong>
      </div>
    </div>

    <p v-if="entities.length > 1 && !entityId" class="muted">
      Elige una entidad para ver sus tacos asignados.
    </p>
    <p v-if="loading" class="loading-block">Cargando participaciones…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="summary" class="summary-card">
      <p class="summary-card-title">Resumen</p>
      <div class="summary-metrics">
        <div class="summary-metric">
          <strong>{{ summary.available_participations }}</strong>
          <span>Disponibles</span>
        </div>
        <div class="summary-metric">
          <strong>{{ summary.sales_registered }}</strong>
          <span>Vendidas</span>
        </div>
        <div class="summary-metric">
          <strong>{{ money(summary.available_amount) }}</strong>
          <span>Importe disp.</span>
        </div>
      </div>
    </div>

    <div v-if="tacos.length" class="tacos-list">
      <article
        v-for="t in tacos"
        :key="`${t.set_id}-${t.book_number}`"
        class="taco-card"
      >
        <div class="taco-card-header">
          <div>
            <h3 class="taco-card-title">{{ t.lottery_name || t.set_name || 'Set' }}</h3>
            <p class="taco-card-sub">{{ t.participations_range }}</p>
          </div>
          <div class="taco-card-meta">
            <span>{{ money(t.available_amount) }}</span>
          </div>
        </div>
        <div class="taco-stats">
          <span class="taco-stat"><strong>{{ t.available_participations }}</strong> disponibles</span>
          <span class="taco-stat"><strong>{{ t.sales_registered }}</strong> vendidas</span>
        </div>
      </article>
    </div>

    <div v-if="!loading && entityId && !tacos.length && !error" class="empty-state">
      <div class="empty-state-icon">🎫</div>
      <h3>Sin tacos asignados</h3>
      <p>No hay participaciones asignadas en esta entidad.</p>
    </div>
  </section>
</template>
