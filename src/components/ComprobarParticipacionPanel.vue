<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { formatDrawDate } from '@/lib/lottery'
import type { DrawStatus, PublicCheckResponse, PublicCheckTicket } from '@/types'

const referencia = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const ticket = ref<PublicCheckTicket | null>(null)

const drawStatus = computed<DrawStatus>(() => ticket.value?.draw_status || 'pending_celebration')

const drawStatusLabel = computed(() => {
  switch (drawStatus.value) {
    case 'completed':
      return 'Sorteado'
    case 'pending_results':
      return 'Pendiente de resultados'
    default:
      return 'Pendiente de sorteo'
  }
})

const prizeStatus = computed(() => {
  if (!ticket.value) return null
  if (drawStatus.value === 'pending_celebration') return 'pending_celebration'
  if (drawStatus.value === 'pending_results') return 'pending_results'
  return ticket.value.prize_info?.has_won ? 'winner' : 'no_prize'
})

const numbers = computed(
  () => ticket.value?.reserve?.reservation_numbers ?? ticket.value?.data?.numbers ?? [],
)

function padNumber(value: number | string) {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (Number.isNaN(num)) return String(value)
  return String(num).padStart(5, '0')
}

function reset() {
  ticket.value = null
  error.value = null
  referencia.value = ''
}

async function consultar() {
  const ref = referencia.value.trim()
  if (!ref) return
  loading.value = true
  error.value = null
  ticket.value = null
  try {
    const { data } = await api.get<PublicCheckResponse>('/public/participation-check', {
      params: { ref },
    })
    if (data.success && data.ticket) {
      ticket.value = data.ticket
      return
    }
    error.value = data.error || data.message || 'No se encontró esa participación.'
  } catch (e: unknown) {
    const err = e as { response?: { data?: PublicCheckResponse } }
    error.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      'No se pudo comprobar la participación.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <aside class="panel card stack">
    <div>
      <h2>Comprobar</h2>
      <p class="muted">Consulta si una participación tiene premio (como en la app).</p>
    </div>

    <form class="stack" @submit.prevent="consultar">
      <label class="field">
        <span>Referencia</span>
        <input
          v-model="referencia"
          type="text"
          placeholder="Número de referencia"
          autocomplete="off"
        />
      </label>
      <button class="btn" type="submit" :disabled="loading || !referencia.trim()">
        {{ loading ? 'Comprobando…' : 'Comprobar premio' }}
      </button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="ticket" class="result stack">
      <div>
        <strong>{{ ticket.lottery?.name || 'Sorteo' }}</strong>
        <p class="muted tiny">{{ formatDrawDate(ticket.lottery?.draw_date) }}</p>
        <p class="muted tiny">{{ ticket.reserve?.entity?.name || '—' }}</p>
      </div>

      <div class="badge" :class="drawStatus === 'completed' ? 'done' : 'pending'">
        {{ drawStatusLabel }}
        <template v-if="prizeStatus === 'winner'">
          · {{ Number(ticket.prize_info?.prize_amount ?? 0).toFixed(2) }} €
        </template>
        <template v-if="prizeStatus === 'no_prize'"> · Sin premio</template>
      </div>

      <div v-if="numbers.length" class="nums">
        <span v-for="n in numbers" :key="String(n)" class="num">{{ padNumber(n) }}</span>
      </div>

      <dl class="meta">
        <div>
          <dt>Referencia</dt>
          <dd>{{ ticket.data?.participation_number || '—' }}</dd>
        </div>
        <div>
          <dt>Participación</dt>
          <dd>{{ ticket.data?.participation_code || '—' }}</dd>
        </div>
      </dl>

      <p v-if="prizeStatus === 'winner'" class="win">¡Felicidades! Esta participación tiene premio.</p>
      <p v-else-if="prizeStatus === 'no_prize'" class="muted">Esta participación no tiene premio.</p>

      <button class="btn btn-ghost" type="button" @click="reset">Nueva consulta</button>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  height: 100%;
  min-height: 0;
  overflow: auto;
}
h2 {
  margin: 0 0 0.2rem;
  font-size: 1.1rem;
}
.tiny {
  margin: 0.1rem 0 0;
  font-size: 0.82rem;
}
.badge {
  display: inline-flex;
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
}
.badge.done {
  background: var(--accent-soft);
  color: var(--accent);
}
.badge.pending {
  background: #eef2f6;
  color: var(--muted);
}
.nums {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.num {
  font-variant-numeric: tabular-nums;
  background: #f4f6f8;
  border-radius: 8px;
  padding: 0.25rem 0.45rem;
  font-size: 0.82rem;
  font-weight: 700;
}
.meta {
  margin: 0;
  display: grid;
  gap: 0.4rem;
}
.meta div {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.meta dt {
  color: var(--muted);
}
.meta dd {
  margin: 0;
  font-weight: 600;
}
.win {
  margin: 0;
  color: var(--accent);
  font-weight: 700;
}
</style>
