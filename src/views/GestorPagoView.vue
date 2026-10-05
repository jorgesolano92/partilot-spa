<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

type Step = 'sorteo' | 'participaciones' | 'exito'

interface LotteryItem {
  id: number
  name: string
}

interface SetItem {
  id: number
  name?: string
  set_name?: string
  set_number?: number | string
}

interface PaymentParticipation {
  id: number
  participation_number?: number | string
  participation_code?: string
  set_name?: string
  premio?: number
  premio_categoria?: string
}

const auth = useAuthStore()
const entityId = computed(() => auth.activeEntityId)

const step = ref<Step>('sorteo')
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const lotteries = ref<LotteryItem[]>([])
const sets = ref<SetItem[]>([])
const lotteryId = ref<number | null>(null)
const setId = ref<number | null>(null)
const addMode = ref<'rango' | 'referencia'>('rango')
const desde = ref<number | null>(null)
const hasta = ref<number | null>(null)
const referencia = ref('')
const selected = ref<PaymentParticipation[]>([])

const totalPremio = computed(() =>
  selected.value.reduce((sum, p) => sum + (p.premio ?? 0), 0),
)

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

async function loadSets() {
  if (!entityId.value || !lotteryId.value) return
  loading.value = true
  try {
    const { data } = await api.get<{ success: boolean; sets: SetItem[] }>(
      '/management/devolutions/sets-by-entity',
      { params: { entity_id: entityId.value, lottery_id: lotteryId.value } },
    )
    sets.value = data.sets || []
    setId.value = sets.value[0]?.id ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar sets.'
    sets.value = []
  } finally {
    loading.value = false
  }
}

function pickLottery(id: number) {
  lotteryId.value = id
  selected.value = []
  step.value = 'participaciones'
  void loadSets()
}

function removeOne(id: number) {
  selected.value = selected.value.filter((p) => p.id !== id)
}

async function validateAdd() {
  if (!entityId.value || !lotteryId.value) return
  error.value = null
  busy.value = true
  try {
    const body: Record<string, unknown> = {
      entity_id: entityId.value,
      lottery_id: lotteryId.value,
    }
    if (addMode.value === 'referencia') {
      body.referencia = referencia.value.trim()
    } else {
      if (!setId.value) {
        error.value = 'Selecciona un set.'
        return
      }
      body.set_id = setId.value
      body.desde = desde.value
      body.hasta = hasta.value
    }

    const { data } = await api.post<{
      success: boolean
      message?: string
      participations: PaymentParticipation[]
      rejected?: Array<{ message?: string }>
    }>('/management/participations/validate-for-payment', body)

    const incoming = data.participations || []
    if (!incoming.length) {
      const rejectedMsg = data.rejected?.[0]?.message
      error.value = rejectedMsg || data.message || 'Ninguna participación válida para pago.'
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
    error.value = err.response?.data?.message || 'No se pudo validar.'
  } finally {
    busy.value = false
  }
}

async function registerPayment() {
  if (!selected.value.length) {
    error.value = 'Añade participaciones premiadas primero.'
    return
  }
  if (!confirm(`¿Registrar pago de ${selected.value.length} participación(es) por ${money(totalPremio.value)}?`)) {
    return
  }
  busy.value = true
  error.value = null
  try {
    const { data } = await api.post<{ success: boolean; message?: string; count?: number }>(
      '/management/participations/register-payment',
      { participation_ids: selected.value.map((p) => p.id) },
    )
    successMsg.value =
      data.message || `Se registró el pago de ${data.count ?? selected.value.length} participación(es).`
    step.value = 'exito'
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo registrar el pago.'
  } finally {
    busy.value = false
  }
}

function resetAll() {
  step.value = 'sorteo'
  lotteryId.value = null
  setId.value = null
  selected.value = []
  successMsg.value = null
  error.value = null
  void loadLotteries()
}

watch(entityId, () => resetAll())

onMounted(() => {
  void loadLotteries()
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Pago presencial</h1>
      <p class="section-subtitle">
        Validar participaciones físicas con premio y registrar el pago en
        {{ auth.activeEntity?.name || 'la entidad' }}.
      </p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando…</p>

    <template v-if="step === 'sorteo' && !loading">
      <h3>1. Sorteo</h3>
      <p v-if="!lotteries.length" class="muted">No hay sorteos disponibles.</p>
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
      <h3>2. Participaciones a pagar</h3>
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
          <span>Set</span>
          <select v-model.number="setId">
            <option v-for="s in sets" :key="s.id" :value="s.id">
              {{ s.name || s.set_name || `Set ${s.set_number || s.id}` }}
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
          <span>Referencia</span>
          <input v-model="referencia" type="text" />
        </label>
      </template>

      <button class="btn" type="button" :disabled="busy" @click="validateAdd">
        {{ busy ? 'Validando…' : 'Añadir premiadas' }}
      </button>

      <h3>Pendientes de pago ({{ selected.length }}) · {{ money(totalPremio) }}</h3>
      <article v-for="p in selected" :key="p.id" class="item">
        <div>
          <strong>#{{ p.participation_number || p.participation_code || p.id }}</strong>
          <p class="muted">{{ p.set_name }} · {{ p.premio_categoria || 'Premio' }}</p>
        </div>
        <div class="meta">
          <strong class="prize">{{ money(p.premio) }}</strong>
          <button class="btn btn-ghost tiny" type="button" @click="removeOne(p.id)">Quitar</button>
        </div>
      </article>

      <button
        class="btn"
        type="button"
        :disabled="!selected.length || busy"
        @click="registerPayment"
      >
        {{ busy ? 'Registrando…' : 'Registrar pago' }}
      </button>
    </template>

    <template v-else-if="step === 'exito'">
      <div class="ok-box">
        <h3>Pago registrado</h3>
        <p>{{ successMsg }}</p>
      </div>
      <button class="btn" type="button" @click="resetAll">Nuevo pago</button>
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
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #fff;
}
.item p {
  margin: 0.15rem 0 0;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}
.prize {
  color: var(--accent);
}
.tiny {
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
}
.ok-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: var(--accent-soft);
}
</style>
