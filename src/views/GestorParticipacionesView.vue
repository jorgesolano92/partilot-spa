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
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>

    <div class="section-header">
      <h1 class="section-title">Participaciones</h1>
      <p class="section-subtitle">
        Gestiona los tacos de {{ auth.activeEntity?.name || 'la entidad' }}.
      </p>
    </div>

    <p v-if="loading" class="loading-block">Cargando participaciones…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="summary" class="summary-card">
      <p class="summary-card-title">Resumen de la entidad</p>
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
          <strong>{{ summary.returned_participations }}</strong>
          <span>Devueltas</span>
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
        :key="`${t.set_id}-${t.book_number}-${t.seller_name || ''}`"
        class="taco-card"
      >
        <div class="taco-card-header">
          <div>
            <h3 class="taco-card-title">{{ t.lottery_name || t.set_name || 'Set' }}</h3>
            <p class="taco-card-sub">{{ t.participations_range }}</p>
            <p v-if="t.seller_name" class="taco-card-sub">{{ t.seller_name }}</p>
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

    <div v-if="!loading && !error && !tacos.length" class="empty-state">
      <div class="empty-state-icon">🎫</div>
      <h3>No hay tacos</h3>
      <p>No hay participaciones asignadas en esta entidad.</p>
    </div>
  </section>
</template>
