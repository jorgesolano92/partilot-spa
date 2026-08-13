<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
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
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>
    <div>
      <h2>Mis ventas</h2>
      <p class="muted">Participaciones marcadas como vendidas.</p>
    </div>

    <p v-if="loading" class="muted">Cargando ventas…</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!loading && !items.length" class="muted">Aún no hay ventas registradas.</p>

    <article v-for="item in items" :key="item.id" class="sale">
      <div>
        <strong>{{ item.participacion?.entidad || item.descripcion || 'Venta' }}</strong>
        <p class="muted">{{ item.sorteo || item.participacion?.sorteo }}</p>
        <p class="muted tiny">
          {{ item.participacion?.numeroParticipacion || item.participacion?.numeroReferencia }}
        </p>
      </div>
      <div class="meta">
        <span>{{ item.fechaSorteo || item.participacion?.fechaSorteo || '—' }}</span>
        <span class="pay">{{ item.formaPago || '—' }}</span>
        <span v-if="item.participacion?.importeTotal != null" class="amount">
          {{ money(item.participacion.importeTotal) }}
        </span>
      </div>
    </article>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.sale {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  background: #fff;
}
.sale p {
  margin: 0.12rem 0 0;
}
.tiny {
  font-size: 0.82rem;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.85rem;
  color: var(--muted);
}
.pay {
  text-transform: capitalize;
}
.amount {
  color: var(--accent);
  font-weight: 700;
}
</style>
