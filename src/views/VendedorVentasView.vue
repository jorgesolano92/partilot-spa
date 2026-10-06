<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { formatDateTime, money } from '@/lib/format'
import type { MySalesResponse, SaleHistorialItem } from '@/types'

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<SaleHistorialItem[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<MySalesResponse>('/sales/me', {
      params: { paginate: 1, per_page: 30, page: 1 },
    })
    items.value = data.historial || data.sales || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo cargar el historial de ventas.'
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Mis ventas</h1>
      <p class="section-subtitle">Participaciones marcadas como vendidas.</p>
    </div>

    <p v-if="loading" class="loading-block">Cargando ventas…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <article v-for="item in items" :key="item.id" class="list-card">
      <div>
        <h3 class="list-card-title">{{ item.participacion?.entidad || item.descripcion || 'Venta' }}</h3>
        <p class="list-card-sub">{{ item.sorteo || item.participacion?.sorteo }}</p>
        <p class="list-card-sub">
          {{ item.participacion?.numeroParticipacion || item.participacion?.numeroReferencia }}
        </p>
      </div>
      <div class="list-card-meta">
        <span>Vendida {{ formatDateTime(item.fecha) }}</span>
        <span v-if="item.fechaSorteo || item.participacion?.fechaSorteo" class="muted">
          Sorteo {{ item.fechaSorteo || item.participacion?.fechaSorteo }}
        </span>
        <span>{{ item.formaPago || '—' }}</span>
        <span v-if="item.participacion?.importeTotal != null" class="highlight">
          {{ money(item.participacion.importeTotal) }}
        </span>
      </div>
    </article>

    <div v-if="!loading && !error && !items.length" class="empty-state">
      <div class="empty-state-icon">🧾</div>
      <h3>Sin ventas</h3>
      <p>Aún no hay ventas registradas.</p>
    </div>
  </section>
</template>

<style scoped>
</style>
