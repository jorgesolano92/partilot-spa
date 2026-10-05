<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { formatDateTime, money } from '@/lib/format'
import type { UserHistorialItem, UserHistorialResponse, WalletListMeta } from '@/types'

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<UserHistorialItem[]>([])
const expandedId = ref<string | number | null>(null)
const meta = ref<WalletListMeta | null>(null)

const filters = reactive({
  page: 1,
  per_page: 20,
})

const TIPO_LABEL: Record<string, string> = {
  digitalizacion: 'Digitalización',
  venta_digital_recibida: 'Venta digital',
  regalo: 'Regalo',
  cobro: 'Cobro',
  donacion: 'Donación',
}

function tipoLabel(tipo?: string) {
  return tipo ? TIPO_LABEL[tipo] || tipo : 'Movimiento'
}

function toggle(id: string | number) {
  expandedId.value = expandedId.value === id ? null : id
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<UserHistorialResponse>('/wallet/historial', {
      params: {
        page: filters.page,
        per_page: filters.per_page,
        paginate: 1,
      },
    })
    items.value = data.historial || []
    meta.value = data.meta ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo cargar el historial.'
    items.value = []
    meta.value = null
  } finally {
    loading.value = false
  }
}

function prevPage() {
  if (filters.page <= 1) return
  filters.page -= 1
  void load()
}

function nextPage() {
  if (!meta.value || filters.page >= meta.value.last_page) return
  filters.page += 1
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'usuario' }">← Volver a cartera</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Historial</h1>
      <p class="section-subtitle">Digitalizaciones, regalos, cobros y donaciones.</p>
    </div>

    <p v-if="loading" class="loading-block">Cargando historial…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="!loading">
      <p v-if="!items.length && !error" class="muted">Aún no hay movimientos en tu historial.</p>

      <article v-for="item in items" :key="String(item.id)" class="item">
        <button type="button" class="item-btn" @click="toggle(item.id)">
          <div class="info">
            <strong>{{ tipoLabel(item.tipo) }}</strong>
            <span class="muted">{{ item.descripcion || '—' }}</span>
          </div>
          <div class="meta">
            <span class="pill">{{ tipoLabel(item.tipo) }}</span>
            <span class="muted">{{ formatDateTime(item.fecha) }}</span>
            <span v-if="item.importeTotal != null" class="prize">{{ money(item.importeTotal) }}</span>
            <span v-else-if="item.importeDonacion != null" class="prize">{{
              money(item.importeDonacion)
            }}</span>
          </div>
        </button>

        <div v-if="expandedId === item.id" class="detail">
          <p v-if="item.direccion">
            <span>Dirección</span>
            {{ item.direccion === 'enviado' ? 'Enviado' : item.direccion === 'recibido' ? 'Recibido' : item.direccion }}
          </p>
          <p v-if="item.emailDestinatario || item.destinatario">
            <span>Destinatario</span> {{ item.emailDestinatario || item.destinatario }}
          </p>
          <p v-if="item.emailRemitente || item.remitente">
            <span>Remitente</span> {{ item.emailRemitente || item.remitente }}
          </p>
          <p v-if="item.estado"><span>Estado</span> {{ item.estado }}</p>
          <p v-if="item.codigoRecarga"><span>Código</span> {{ item.codigoRecarga }}</p>
          <p v-if="item.importeCodigo != null && item.importeCodigo > 0">
            <span>Importe código</span> {{ money(item.importeCodigo) }}
          </p>
          <p v-if="item.participacion?.entidad">
            <span>Entidad</span> {{ item.participacion.entidad }}
          </p>
          <p v-if="item.participacion?.sorteo">
            <span>Sorteo</span> {{ item.participacion.sorteo }}
          </p>
          <p v-if="item.participacion?.numeroReferencia || item.participacion?.numeroParticipacion">
            <span>Referencia</span>
            {{ item.participacion.numeroReferencia || item.participacion.numeroParticipacion }}
          </p>
          <p v-if="item.participaciones?.length">
            <span>Participaciones</span> {{ item.participaciones.length }}
          </p>
        </div>
      </article>

      <div v-if="meta && meta.last_page > 1" class="row pager">
        <button class="btn btn-ghost" type="button" :disabled="filters.page <= 1" @click="prevPage">
          Anterior
        </button>
        <span class="muted">Pág. {{ filters.page }} / {{ meta.last_page }} · {{ meta.total }}</span>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="filters.page >= meta.last_page"
          @click="nextPage"
        >
          Siguiente
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.item {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.item-btn {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.7rem;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.75rem 0.85rem;
  cursor: pointer;
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
  font-size: 0.82rem;
}
.pill {
  display: inline-flex;
  align-self: flex-end;
  background: #eef2f6;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
}
.prize {
  font-weight: 800;
  color: var(--accent);
}
.detail {
  border-top: 1px solid var(--border);
  padding: 0.75rem 0.85rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}
.detail p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}
.detail span {
  color: var(--muted);
}
.pager {
  justify-content: space-between;
}
</style>
