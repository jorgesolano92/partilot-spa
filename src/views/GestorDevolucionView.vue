<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

type Step = 'vendedor' | 'sorteo' | 'participaciones' | 'liquidacion' | 'exito'

interface NamedItem {
  id: number
  name: string
  user?: { name?: string; email?: string }
}

interface LotteryItem {
  id: number
  name: string
  draw_date?: string | null
}

interface ReserveItem {
  id: number
  display_label?: string
  reservation_numbers?: number[]
}

interface ValidatedParticipation {
  id: number
  number?: number | string
  participation_code?: string
  set_id?: number
  set_name?: string
}

interface LiquidationSummary {
  total_to_return?: number
  amount_sold?: number
  amount_pending?: number
  message?: string
  [key: string]: unknown
}

const auth = useAuthStore()
const entityId = computed(() => auth.activeEntityId)

const step = ref<Step>('vendedor')
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const sellers = ref<NamedItem[]>([])
const lotteries = ref<LotteryItem[]>([])
const reserves = ref<ReserveItem[]>([])
const sellerId = ref<number | null>(null)
const lotteryId = ref<number | null>(null)
const reserveId = ref<number | null>(null)

const addMode = ref<'rango' | 'referencia'>('rango')
const desde = ref<number | null>(null)
const hasta = ref<number | null>(null)
const referencia = ref('')
const selected = ref<ValidatedParticipation[]>([])

const summary = ref<LiquidationSummary | null>(null)
const soloDevolucion = ref(true)
const pagos = reactive({ efectivo: 0, bizum: 0, transferencia: 0 })

const sellerName = computed(() => {
  const s = sellers.value.find((x) => x.id === sellerId.value)
  return s?.name || s?.user?.name || s?.user?.email || 'Vendedor'
})

async function loadSellers() {
  if (!entityId.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<{ success: boolean; sellers: NamedItem[] }>(
      '/management/devolutions/sellers',
      { params: { entity_id: entityId.value } },
    )
    sellers.value = data.sellers || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar vendedores.'
    sellers.value = []
  } finally {
    loading.value = false
  }
}

async function loadLotteries() {
  if (!entityId.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<{ success: boolean; lotteries: LotteryItem[] }>(
      '/management/devolutions/lotteries',
      { params: { entity_id: entityId.value } },
    )
    lotteries.value = data.lotteries || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar sorteos.'
    lotteries.value = []
  } finally {
    loading.value = false
  }
}

async function loadReserves() {
  if (!entityId.value || !lotteryId.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<{ success: boolean; reserves: ReserveItem[] }>(
      '/management/devolutions/reserves-by-entity',
      {
        params: {
          entity_id: entityId.value,
          lottery_id: lotteryId.value,
          ...(sellerId.value ? { seller_id: sellerId.value } : {}),
        },
      },
    )
    reserves.value = data.reserves || []
    reserveId.value = reserves.value[0]?.id ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar reservas.'
    reserves.value = []
  } finally {
    loading.value = false
  }
}

function pickSeller(id: number) {
  sellerId.value = id
  lotteryId.value = null
  reserveId.value = null
  selected.value = []
  step.value = 'sorteo'
  void loadLotteries()
}

function pickLottery(id: number) {
  lotteryId.value = id
  selected.value = []
  step.value = 'participaciones'
  void loadReserves()
}

function removeParticipation(id: number) {
  selected.value = selected.value.filter((p) => p.id !== id)
}

async function validateAdd() {
  if (!entityId.value || !lotteryId.value || !sellerId.value) return
  error.value = null
  busy.value = true
  try {
    const body: Record<string, unknown> = {
      entity_id: entityId.value,
      lottery_id: lotteryId.value,
      seller_id: sellerId.value,
    }
    if (addMode.value === 'referencia') {
      body.referencia = referencia.value.trim()
    } else {
      if (!reserveId.value) {
        error.value = 'Selecciona una reserva.'
        return
      }
      body.reserve_id = reserveId.value
      body.desde = desde.value
      body.hasta = hasta.value
    }
    const { data } = await api.post<{
      success: boolean
      message?: string
      participations: ValidatedParticipation[]
    }>('/management/devolutions/validate', body)

    const incoming = data.participations || []
    if (!incoming.length) {
      error.value = data.message || 'No hay participaciones válidas para devolver.'
      return
    }
    const map = new Map(selected.value.map((p) => [p.id, p]))
    for (const p of incoming) map.set(p.id, p)
    selected.value = Array.from(map.values())
    desde.value = null
    hasta.value = null
    referencia.value = ''
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo validar el rango.'
  } finally {
    busy.value = false
  }
}

async function goLiquidacion() {
  if (!selected.value.length) {
    error.value = 'Añade al menos una participación.'
    return
  }
  if (!entityId.value || !lotteryId.value || !sellerId.value) return
  error.value = null
  busy.value = true
  try {
    const { data } = await api.get<{ success: boolean } & LiquidationSummary>(
      '/management/devolutions/liquidation-summary',
      {
        params: {
          entity_id: entityId.value,
          lottery_id: lotteryId.value,
          seller_id: sellerId.value,
          tipo_devolucion: 'vendedor',
          participations: selected.value.map((p) => p.id),
          ...(reserveId.value ? { reserve_id: reserveId.value } : {}),
        },
      },
    )
    summary.value = data
    step.value = 'liquidacion'
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo obtener el resumen de liquidación.'
  } finally {
    busy.value = false
  }
}

async function submit() {
  if (!entityId.value || !lotteryId.value || !sellerId.value) return
  error.value = null
  busy.value = true
  try {
    const paymentList: Array<{ payment_method: string; amount: number }> = []
    if (!soloDevolucion.value) {
      if (pagos.efectivo > 0) paymentList.push({ payment_method: 'efectivo', amount: pagos.efectivo })
      if (pagos.bizum > 0) paymentList.push({ payment_method: 'bizum', amount: pagos.bizum })
      if (pagos.transferencia > 0) {
        paymentList.push({ payment_method: 'transferencia', amount: pagos.transferencia })
      }
      if (!paymentList.length) {
        error.value = 'Indica al menos un pago o marca solo devolución.'
        busy.value = false
        return
      }
    }

    const { data } = await api.post<{ success: boolean; message?: string; queued?: boolean }>(
      '/management/devolutions',
      {
        entity_id: entityId.value,
        lottery_id: lotteryId.value,
        seller_id: sellerId.value,
        reserve_id: reserveId.value,
        tipo_devolucion: 'vendedor',
        return_reason: 'Devolución de vendedor a entidad',
        solo_devolucion: soloDevolucion.value,
        force_sync: true,
        liquidacion: {
          devolver: selected.value.map((p) => p.id),
          vender: [],
          pagos: paymentList,
        },
      },
    )
    successMsg.value = data.message || (data.queued ? 'Devolución encolada.' : 'Devolución registrada.')
    step.value = 'exito'
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo registrar la devolución.'
  } finally {
    busy.value = false
  }
}

function resetAll() {
  step.value = 'vendedor'
  sellerId.value = null
  lotteryId.value = null
  reserveId.value = null
  selected.value = []
  summary.value = null
  soloDevolucion.value = true
  pagos.efectivo = 0
  pagos.bizum = 0
  pagos.transferencia = 0
  successMsg.value = null
  error.value = null
  void loadSellers()
}

watch(entityId, () => {
  resetAll()
})

onMounted(() => {
  void loadSellers()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Devolución de vendedor</h1>
      <p class="section-subtitle">
        {{ auth.activeEntity?.name || 'Entidad' }} · devolver participaciones asignadas al vendedor.
      </p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando…</p>

    <template v-if="step === 'vendedor' && !loading">
      <h3>1. Vendedor</h3>
      <p v-if="!sellers.length" class="muted">No hay vendedores activos en esta entidad.</p>
      <button
        v-for="s in sellers"
        :key="s.id"
        class="btn btn-soft entity-btn"
        type="button"
        @click="pickSeller(s.id)"
      >
        {{ s.name || s.user?.name || s.user?.email || `Vendedor #${s.id}` }}
      </button>
    </template>

    <template v-else-if="step === 'sorteo'">
      <h3>2. Sorteo · {{ sellerName }}</h3>
      <button class="btn btn-ghost" type="button" @click="step = 'vendedor'">← Cambiar vendedor</button>
      <p v-if="!lotteries.length && !loading" class="muted">No hay sorteos disponibles.</p>
      <button
        v-for="l in lotteries"
        :key="l.id"
        class="btn btn-soft entity-btn"
        type="button"
        @click="pickLottery(l.id)"
      >
        {{ l.name }}
      </button>
    </template>

    <template v-else-if="step === 'participaciones'">
      <h3>3. Participaciones</h3>
      <button class="btn btn-ghost" type="button" @click="step = 'sorteo'">← Cambiar sorteo</button>

      <div class="row">
        <button
          class="btn"
          :class="{ 'btn-ghost': addMode !== 'rango' }"
          type="button"
          @click="addMode = 'rango'"
        >
          Por rango
        </button>
        <button
          class="btn"
          :class="{ 'btn-ghost': addMode !== 'referencia' }"
          type="button"
          @click="addMode = 'referencia'"
        >
          Por referencia
        </button>
      </div>

      <template v-if="addMode === 'rango'">
        <label class="field">
          <span>Reserva</span>
          <select v-model.number="reserveId">
            <option v-for="r in reserves" :key="r.id" :value="r.id">
              {{ r.display_label || `Reserva #${r.id}` }}
            </option>
          </select>
        </label>
        <div class="row">
          <label class="field grow">
            <span>Desde</span>
            <input v-model.number="desde" type="number" min="1" />
          </label>
          <label class="field grow">
            <span>Hasta</span>
            <input v-model.number="hasta" type="number" min="1" />
          </label>
        </div>
      </template>
      <template v-else>
        <label class="field">
          <span>Referencia QR</span>
          <input v-model="referencia" type="text" />
        </label>
      </template>

      <button class="btn" type="button" :disabled="busy" @click="validateAdd">
        {{ busy ? 'Validando…' : 'Añadir' }}
      </button>

      <h3>Seleccionadas ({{ selected.length }})</h3>
      <article v-for="p in selected" :key="p.id" class="item row">
        <span>#{{ p.number || p.participation_code || p.id }} · {{ p.set_name || 'Set' }}</span>
        <button class="btn btn-ghost tiny" type="button" @click="removeParticipation(p.id)">Quitar</button>
      </article>

      <button class="btn" type="button" :disabled="!selected.length || busy" @click="goLiquidacion">
        Continuar a liquidación
      </button>
    </template>

    <template v-else-if="step === 'liquidacion'">
      <h3>4. Liquidación</h3>
      <button class="btn btn-ghost" type="button" @click="step = 'participaciones'">← Atrás</button>
      <p class="muted">{{ selected.length }} participación(es) a devolver.</p>
      <p v-if="summary?.amount_pending != null" class="muted">
        Pendiente estimado: <strong>{{ money(Number(summary.amount_pending)) }}</strong>
      </p>

      <label class="check">
        <input v-model="soloDevolucion" type="checkbox" />
        Solo devolución (sin registrar pagos)
      </label>

      <template v-if="!soloDevolucion">
        <label class="field">
          <span>Efectivo (€)</span>
          <input v-model.number="pagos.efectivo" type="number" min="0" step="0.01" />
        </label>
        <label class="field">
          <span>Bizum (€)</span>
          <input v-model.number="pagos.bizum" type="number" min="0" step="0.01" />
        </label>
        <label class="field">
          <span>Transferencia (€)</span>
          <input v-model.number="pagos.transferencia" type="number" min="0" step="0.01" />
        </label>
      </template>

      <button class="btn" type="button" :disabled="busy" @click="submit">
        {{ busy ? 'Registrando…' : 'Confirmar devolución' }}
      </button>
    </template>

    <template v-else-if="step === 'exito'">
      <div class="ok-box">
        <h3>Listo</h3>
        <p>{{ successMsg }}</p>
      </div>
      <button class="btn" type="button" @click="resetAll">Nueva devolución</button>
    </template>
  </section>
</template>

<style scoped>
h2,
h3 {
  margin: 0 0 0.25rem;
}
.entity-btn {
  justify-content: flex-start;
  text-align: left;
}
.grow {
  flex: 1;
  margin-bottom: 0;
}
.item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: #fff;
  justify-content: space-between;
}
.tiny {
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
}
.check {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
.ok-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: var(--accent-soft);
}
</style>
