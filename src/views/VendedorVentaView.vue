<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { mediaUrl, money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type {
  EntityRef,
  PublicCheckResponse,
  PublicCheckTicket,
  SellByQrResponse,
} from '@/types'

type SaleTab = 'referencia' | 'manual' | 'digital'

interface LotteryItem {
  id: number
  name: string
  draw_date?: string | null
}

interface SetItem {
  id: number
  name?: string
  set_name?: string
  set_number?: number | string
  available?: number
}

const auth = useAuthStore()
const entities = ref<EntityRef[]>([...(auth.seller?.entities ?? [])])
const selectedEntityId = ref<number | null>(null)
const pickingEntity = ref(false)
const tab = ref<SaleTab>('referencia')

const lotteries = ref<LotteryItem[]>([])
const lotteryId = ref<number | null>(null)
const sets = ref<SetItem[]>([])
const setId = ref<number | null>(null)

const referencia = ref('')
const ticket = ref<PublicCheckTicket | null>(null)
const sold = ref(false)

const desde = ref<number | null>(null)
const hasta = ref<number | null>(null)
const quantity = ref(1)
const buyerEmail = ref('')
const paymentMethod = ref<'omitir' | 'efectivo' | 'bizum' | 'transferencia'>('omitir')
const digitalAvailable = ref<number | null>(null)
const digitalPrice = ref<number | null>(null)

const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

const selectedEntity = computed(
  () => entities.value.find((e) => e.id === selectedEntityId.value) ?? null,
)
const needsEntityPick = computed(() => entities.value.length > 1 && !selectedEntityId.value)

async function ensureEntities() {
  if (entities.value.length) return
  try {
    const { data } = await api.get<{ success: boolean; entities: EntityRef[] }>('/sellers/me/entities')
    entities.value = data.entities || []
  } catch {
    /* empty */
  }
}

function pickEntity(id: number) {
  selectedEntityId.value = id
  pickingEntity.value = false
  lotteryId.value = null
  setId.value = null
  resetMessages()
  void loadLotteries()
}

function changeEntity() {
  if (entities.value.length <= 1) return
  selectedEntityId.value = null
  pickingEntity.value = true
  resetPreview()
  referencia.value = ''
}

function resetMessages() {
  error.value = null
  message.value = null
}

function resetPreview() {
  ticket.value = null
  sold.value = false
  resetMessages()
}

async function loadLotteries() {
  if (!selectedEntityId.value) return
  loading.value = true
  try {
    const { data } = await api.get<{ success: boolean; lotteries: LotteryItem[] }>(
      '/sellers/me/lotteries',
      { params: { entity_id: selectedEntityId.value } },
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

async function onLotteryChange() {
  setId.value = null
  sets.value = []
  digitalAvailable.value = null
  if (!selectedEntityId.value || !lotteryId.value) return
  if (tab.value === 'manual') await loadSets()
  if (tab.value === 'digital') await loadDigitalAvailable()
}

async function loadSets() {
  if (!selectedEntityId.value || !lotteryId.value) return
  try {
    const { data } = await api.get<{
      success: boolean
      reserves?: Array<{
        lottery_id?: number
        lottery?: { id?: number }
        sets?: Array<{
          id: number
          set_name?: string
          set_number?: number | string
          physical_available_to_seller?: number
          physical_participations?: number
        }>
      }>
    }>('/sellers/me/reserves')

    const filtered = (data.reserves || []).filter((r) => {
      const lid = r.lottery_id ?? r.lottery?.id
      return lid === lotteryId.value
    })
    const physicalSets = filtered
      .flatMap((r) => r.sets || [])
      .filter((s) => (s.physical_participations ?? 0) > 0 || (s.physical_available_to_seller ?? 0) > 0)
      .map((s) => ({
        id: s.id,
        set_name: s.set_name,
        set_number: s.set_number,
        available: s.physical_available_to_seller,
      }))
    sets.value = physicalSets
    setId.value = sets.value[0]?.id ?? null
  } catch {
    sets.value = []
  }
}

async function loadDigitalAvailable() {
  if (!selectedEntityId.value || !lotteryId.value) return
  try {
    const { data } = await api.get<{
      success: boolean
      total_digital_available?: number
      price_per_participation?: number
    }>('/sellers/me/digital-available', {
      params: { entity_id: selectedEntityId.value, lottery_id: lotteryId.value },
    })
    digitalAvailable.value = data.total_digital_available ?? 0
    digitalPrice.value = data.price_per_participation ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo consultar stock digital.'
    digitalAvailable.value = null
  }
}

function switchTab(next: SaleTab) {
  tab.value = next
  resetPreview()
  resetMessages()
  if (next === 'manual') void onLotteryChange()
  if (next === 'digital') void onLotteryChange()
}

function ticketEntityName(t: PublicCheckTicket | null): string {
  return t?.reserve?.entity?.name?.trim() || ''
}

function entityMatchesTicket(t: PublicCheckTicket): boolean {
  if (!selectedEntity.value) return true
  const name = ticketEntityName(t)
  if (!name) return true
  return name.toLowerCase() === selectedEntity.value.name.trim().toLowerCase()
}

async function consultar() {
  const ref = referencia.value.trim()
  if (!ref || needsEntityPick.value) {
    error.value = 'Elige entidad e introduce una referencia.'
    return
  }
  busy.value = true
  resetPreview()
  try {
    const { data } = await api.get<PublicCheckResponse>('/public/participation-check', {
      params: { ref },
    })
    if (data.success && data.ticket) {
      if (!entityMatchesTicket(data.ticket)) {
        error.value = `Esta participación es de «${ticketEntityName(data.ticket)}», no de «${selectedEntity.value?.name}».`
        return
      }
      ticket.value = data.ticket
      return
    }
    error.value = data.error || data.message || 'No se encontró esa participación.'
  } catch (e: unknown) {
    const err = e as { response?: { data?: PublicCheckResponse } }
    error.value =
      err.response?.data?.error || err.response?.data?.message || 'No se pudo consultar.'
  } finally {
    busy.value = false
  }
}

async function confirmarVentaQr() {
  const ref = referencia.value.trim()
  if (!ref) return
  busy.value = true
  resetMessages()
  try {
    const { data } = await api.post<SellByQrResponse>('/sales/qr', {
      referencia: ref,
      payment_method: paymentMethod.value,
    })
    sold.value = true
    message.value = data.message || 'Participación marcada como vendida.'
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo completar la venta.'
  } finally {
    busy.value = false
  }
}

async function venderManual() {
  if (!setId.value || !desde.value || !hasta.value) {
    error.value = 'Indica set y rango.'
    return
  }
  busy.value = true
  resetMessages()
  try {
    const { data } = await api.post<{ success: boolean; message?: string; count?: number }>(
      '/sales/manual',
      {
        set_id: setId.value,
        desde: desde.value,
        hasta: hasta.value,
        payment_method: paymentMethod.value,
      },
    )
    message.value = data.message || `Vendidas ${data.count ?? 0} participación(es).`
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo vender el rango.'
  } finally {
    busy.value = false
  }
}

async function venderDigital() {
  if (!selectedEntityId.value || !lotteryId.value || !buyerEmail.value.trim() || quantity.value < 1) {
    error.value = 'Completa sorteo, cantidad y email del comprador.'
    return
  }
  busy.value = true
  resetMessages()
  try {
    const email = buyerEmail.value.trim()
    const { data: existsRes } = await api.post<{ exists?: boolean; success?: boolean }>(
      '/users/check-exists',
      { email },
    )
    if (existsRes.exists) {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        '/sales/digital',
        {
          entity_id: selectedEntityId.value,
          lottery_id: lotteryId.value,
          quantity: quantity.value,
          buyer_email: email,
          payment_method: paymentMethod.value,
        },
      )
      message.value = data.message || 'Venta digital registrada en la cartera del comprador.'
    } else {
      const { data } = await api.post<{
        success: boolean
        message?: string
        buyer_registration_url?: string
      }>('/sales/digital/pending', {
        entity_id: selectedEntityId.value,
        lottery_id: lotteryId.value,
        quantity: quantity.value,
        buyer_email: email,
        notify_channel: 'email',
        payment_method: paymentMethod.value,
      })
      message.value =
        data.message ||
        'Venta pendiente creada. El comprador recibirá invitación para registrarse y reclamar.'
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo completar la venta digital.'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await ensureEntities()
  if (entities.value.length === 1) {
    selectedEntityId.value = entities.value[0].id
    void loadLotteries()
  } else if (entities.value.length > 1) {
    pickingEntity.value = true
  }
})
</script>

<template>
  <section class="page stack">
    <RouterLink class="page-back" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>
    <div class="section-header">
      <h1 class="section-title">Vender</h1>
      <p class="section-subtitle">Referencia QR, venta manual por rango o participaciones digitales.</p>
    </div>

    <template v-if="pickingEntity || needsEntityPick">
      <div class="pick stack">
        <h3>¿De qué entidad vas a vender?</h3>
        <button
          v-for="e in entities"
          :key="e.id"
          class="btn btn-soft entity-btn"
          type="button"
          @click="pickEntity(e.id)"
        >
          {{ e.name }}
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="selectedEntity" class="entity-bar">
        <span class="muted">Vendiendo como</span>
        <strong>{{ selectedEntity.name }}</strong>
        <button
          v-if="entities.length > 1"
          class="btn btn-ghost tiny-btn"
          type="button"
          @click="changeEntity"
        >
          Cambiar
        </button>
      </div>

      <div class="row tabs">
        <button
          class="btn"
          :class="{ 'btn-ghost': tab !== 'referencia' }"
          type="button"
          @click="switchTab('referencia')"
        >
          Referencia
        </button>
        <button
          class="btn"
          :class="{ 'btn-ghost': tab !== 'manual' }"
          type="button"
          @click="switchTab('manual')"
        >
          Manual
        </button>
        <button
          class="btn"
          :class="{ 'btn-ghost': tab !== 'digital' }"
          type="button"
          @click="switchTab('digital')"
        >
          Digital
        </button>
      </div>

      <label class="field">
        <span>Forma de pago</span>
        <select v-model="paymentMethod">
          <option value="omitir">Omitir / sin registrar</option>
          <option value="efectivo">Efectivo</option>
          <option value="bizum">Bizum</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </label>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="loading" class="muted">Cargando sorteos…</p>

      <template v-if="tab === 'referencia'">
        <form class="stack" @submit.prevent="consultar">
          <label class="field">
            <span>Referencia QR</span>
            <input v-model="referencia" type="text" @input="resetPreview" />
          </label>
          <div class="row">
            <button class="btn" type="submit" :disabled="busy || !referencia.trim()">
              {{ busy ? 'Consultando…' : 'Comprobar' }}
            </button>
          </div>
        </form>
        <div v-if="ticket" class="preview stack">
          <img
            v-if="ticket.preview_image_url"
            class="thumb"
            :src="mediaUrl(ticket.preview_image_url)"
            alt=""
          />
          <strong>{{ ticket.reserve?.entity?.name || 'Entidad' }}</strong>
          <p class="muted">{{ ticket.lottery?.name }} · {{ money(ticket.lottery?.ticket_price) }}</p>
          <div v-if="!sold" class="row">
            <button class="btn" type="button" :disabled="busy" @click="confirmarVentaQr">
              Confirmar venta
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="tab === 'manual'">
        <label class="field">
          <span>Sorteo</span>
          <select v-model.number="lotteryId" @change="onLotteryChange">
            <option :value="null" disabled>Selecciona sorteo</option>
            <option v-for="l in lotteries" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
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
        <button class="btn" type="button" :disabled="busy" @click="venderManual">
          {{ busy ? 'Vendiendo…' : 'Vender rango' }}
        </button>
      </template>

      <template v-else>
        <label class="field">
          <span>Sorteo</span>
          <select v-model.number="lotteryId" @change="onLotteryChange">
            <option :value="null" disabled>Selecciona sorteo</option>
            <option v-for="l in lotteries" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <p v-if="digitalAvailable != null" class="muted">
          Disponibles: <strong>{{ digitalAvailable }}</strong>
          <template v-if="digitalPrice != null"> · {{ money(digitalPrice) }} / ud.</template>
        </p>
        <label class="field">
          <span>Cantidad</span>
          <input v-model.number="quantity" type="number" min="1" />
        </label>
        <label class="field">
          <span>Email comprador</span>
          <input v-model="buyerEmail" type="email" />
        </label>
        <button class="btn" type="button" :disabled="busy" @click="venderDigital">
          {{ busy ? 'Vendiendo…' : 'Vender digital' }}
        </button>
      </template>
    </template>
  </section>
</template>

<style scoped>
h2,
h3 {
  margin: 0 0 0.25rem;
}
.ok {
  color: var(--accent);
  font-weight: 600;
  margin: 0;
}
.pick,
.preview {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem;
  background: #fff;
}
.entity-btn {
  justify-content: flex-start;
  text-align: left;
}
.entity-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.7rem;
  align-items: center;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--accent-soft);
}
.tiny-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  margin-left: auto;
}
.tabs .btn {
  flex: 1;
}
.grow {
  flex: 1;
  margin-bottom: 0;
}
.thumb {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 8px;
  background: #eef2f6;
}
</style>
