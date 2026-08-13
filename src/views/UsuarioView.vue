<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import { isoDate, mediaUrl, money } from '@/lib/format'
import type { WalletListResponse, WalletParticipation } from '@/types'

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<WalletParticipation[]>([])
const expandedId = ref<number | null>(null)
const feedback = ref<string | null>(null)

const dateTo = new Date()
const dateFrom = new Date()
dateFrom.setMonth(dateFrom.getMonth() - 3)

const filters = reactive({
  date_from: isoDate(dateFrom),
  date_to: isoDate(dateTo),
  include_expired: false,
  page: 1,
  per_page: 20,
})
const lastPage = ref(1)
const total = ref(0)

const modal = ref<'none' | 'digitalizar' | 'codigo' | 'regalo'>('none')
const busy = ref(false)
const modalError = ref<string | null>(null)
const referencia = ref('')
const codigo = ref('')
const giftEmail = ref('')
const giftMessage = ref('')
const giftTarget = ref<WalletParticipation | null>(null)

const cartera = computed(() => items.value.filter((p) => !p.is_storage))
const almacen = computed(() => items.value.filter((p) => p.is_storage))

function estadoLabel(estado?: string) {
  const map: Record<string, string> = {
    cobrada: 'Pagada',
    donada: 'Donada',
    caducada: 'Caducada',
    regalada: 'Regalada',
    pendiente_regalo: 'Regalo pendiente',
  }
  return estado ? map[estado] || '' : ''
}

function atenuada(p: WalletParticipation) {
  return p.estado === 'regalada' || p.estado === 'pendiente_regalo'
}

function puedeRegalar(p: WalletParticipation) {
  if (p.is_storage) return false
  const e = p.estado || 'activa'
  if (['cobrada', 'donada', 'caducada', 'regalada', 'pendiente_regalo'].includes(e)) return false
  if (p.received_from_email || p.gift_status === 'accepted') return false
  return true
}

function closeModal() {
  modal.value = 'none'
  modalError.value = null
  busy.value = false
  referencia.value = ''
  codigo.value = ''
  giftEmail.value = ''
  giftMessage.value = ''
  giftTarget.value = null
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<WalletListResponse>('/wallet/participations', {
      params: {
        page: filters.page,
        per_page: filters.per_page,
        date_from: filters.date_from,
        date_to: filters.date_to,
        paginate: 1,
        ...(filters.include_expired ? { include_expired: 1 } : {}),
      },
    })
    items.value = data.participations || []
    lastPage.value = data.meta?.last_page || 1
    total.value = data.meta?.total || items.value.length
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo cargar la cartera'
    items.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  filters.page = 1
  void load()
}

function toggle(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

async function digitalizar() {
  const ref = referencia.value.trim()
  if (!ref) return
  busy.value = true
  modalError.value = null
  try {
    await api.post('/wallet/participations/link', { referencia: ref })
    closeModal()
    feedback.value = 'Participación digitalizada y añadida a tu cartera.'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    modalError.value = err.response?.data?.message || 'No se pudo digitalizar.'
  } finally {
    busy.value = false
  }
}

async function vincularCodigo() {
  const code = codigo.value.trim()
  if (!code) return
  busy.value = true
  modalError.value = null
  try {
    const { data } = await api.post<{ success: boolean; message?: string; quantity?: number }>(
      '/wallet/digital-pending/claim',
      { link_code: code },
    )
    closeModal()
    feedback.value = data.message || 'Participaciones vinculadas a tu cartera.'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    modalError.value = err.response?.data?.message || 'Código no válido o ya utilizado.'
  } finally {
    busy.value = false
  }
}

function openGift(p: WalletParticipation, event: Event) {
  event.stopPropagation()
  giftTarget.value = p
  giftEmail.value = ''
  giftMessage.value = ''
  modal.value = 'regalo'
}

async function enviarRegalo() {
  if (!giftTarget.value || !giftEmail.value.trim()) return
  if (!confirm(`¿Enviar la participación a ${giftEmail.value.trim()}? No se puede deshacer.`)) return
  busy.value = true
  modalError.value = null
  try {
    await api.post('/wallet/participations/gift', {
      participation_id: giftTarget.value.id,
      email: giftEmail.value.trim(),
      message: giftMessage.value.trim() || undefined,
    })
    closeModal()
    feedback.value = 'Participación enviada. El destinatario recibirá un email.'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    modalError.value = err.response?.data?.message || 'No se pudo enviar el regalo.'
  } finally {
    busy.value = false
  }
}

async function aceptarRegalo(p: WalletParticipation, event: Event) {
  event.stopPropagation()
  if (!p.gift_id) return
  if (!confirm('Al aceptar, la participación pasará a tu cartera de forma definitiva.')) return
  try {
    await api.post(`/wallet/gifts/${p.gift_id}/accept`)
    feedback.value = 'Regalo aceptado. La participación ya es tuya.'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo aceptar el regalo.'
  }
}

async function rechazarRegalo(p: WalletParticipation, event: Event) {
  event.stopPropagation()
  if (!p.gift_id) return
  if (!confirm('¿Rechazar? La participación volverá a quien te la envió.')) return
  try {
    await api.post(`/wallet/gifts/${p.gift_id}/reject`)
    feedback.value = 'Has rechazado el regalo.'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo rechazar el regalo.'
  }
}

function hideBrokenImage(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (img) img.style.display = 'none'
}

function prevPage() {
  if (filters.page <= 1) return
  filters.page -= 1
  void load()
}

function nextPage() {
  if (filters.page >= lastPage.value) return
  filters.page += 1
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="card stack cartera">
    <div>
      <h2>Mi cartera</h2>
      <p class="muted">Gestiona tus participaciones digitalizadas.</p>
    </div>

    <form class="filters" @submit.prevent="applyFilters">
      <label class="field">
        <span>Desde</span>
        <input v-model="filters.date_from" type="date" />
      </label>
      <label class="field">
        <span>Hasta</span>
        <input v-model="filters.date_to" type="date" />
      </label>
      <label class="check">
        <input v-model="filters.include_expired" type="checkbox" />
        Incluir caducadas
      </label>
      <button class="btn" type="submit">Filtrar</button>
    </form>

    <div class="row">
      <button class="btn btn-ghost" type="button" @click="modal = 'digitalizar'">Digitalizar</button>
      <button class="btn btn-ghost" type="button" @click="modal = 'codigo'">Vincular código</button>
    </div>

    <p v-if="feedback" class="ok">{{ feedback }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando cartera…</p>

    <template v-else>
      <p v-if="!cartera.length && !almacen.length" class="muted">
        No tienes participaciones aún. Usa Digitalizar o el panel de Comprobar.
      </p>

      <h3 v-if="cartera.length" class="heading">Mi cartera</h3>
      <article
        v-for="p in cartera"
        :key="p.id"
        class="ticket"
        :class="{ dim: atenuada(p) }"
      >
        <button type="button" class="ticket-btn" @click="toggle(p.id)">
          <img
            v-if="p.snapshot_path || p.preview_image_url"
            class="thumb"
            :src="mediaUrl(p.snapshot_path || p.preview_image_url)"
            alt=""
            @error="hideBrokenImage"
          />
          <div v-else class="thumb ph">🎫</div>
          <div class="info">
            <strong>{{ p.entidad || 'Entidad' }}</strong>
            <span class="muted">{{ p.numeroReservado || p.numero || p.id }}</span>
            <span v-if="p.is_digital" class="pill">Digital</span>
          </div>
          <div class="meta">
            <span class="muted">{{ p.sorteo }}</span>
            <span class="muted">{{ p.fechaSorteo }}</span>
            <span v-if="p.estado !== 'regalada' && (p.premio ?? 0) > 0" class="prize">{{ money(p.premio) }}</span>
            <span v-if="estadoLabel(p.estado)" class="pill">{{ estadoLabel(p.estado) }}</span>
            <span v-if="p.cobrable && (p.premio ?? 0) > 0" class="pill ok-pill">Cobro disponible</span>
            <span v-if="p.payment_blocked && (p.premio ?? 0) > 0 && p.estado !== 'cobrada'" class="pill warn">
              Premio bloqueado
            </span>
          </div>
        </button>

        <div v-if="expandedId === p.id" class="detail">
          <p><span>Sorteo</span> {{ p.sorteo || '—' }}</p>
          <p><span>Fecha</span> {{ p.fechaSorteo || '—' }}</p>
          <p><span>Importe jugado</span> {{ money(p.importeJugado) }}</p>
          <p><span>Donativo</span> {{ money(p.donativo) }}</p>
          <p><span>Total</span> {{ money(p.importeTotal) }}</p>
          <p v-if="(p.premio ?? 0) > 0"><span>Premio</span> {{ money(p.premio) }}</p>
          <p v-if="p.user_message"><span>Cobro</span> {{ p.user_message }}</p>
          <p v-if="p.presencial_contact?.formatted">
            <span>Cobro presencial</span> {{ p.presencial_contact.formatted }}
          </p>
          <p><span>Nº</span> {{ p.numeroParticipacion || '—' }}</p>
          <p><span>Referencia</span> {{ p.numeroReferencia || '—' }}</p>
          <p v-if="p.gifted_to_email"><span>Enviado a</span> {{ p.gifted_to_email }}</p>
          <p v-if="p.received_from_name || p.received_from_email">
            <span>Regalada por</span> {{ p.received_from_name || p.received_from_email }}
          </p>
          <p v-if="p.gift_message"><span>Mensaje</span> {{ p.gift_message }}</p>

          <div v-if="p.estado === 'pendiente_regalo' && p.gift_id" class="row">
            <button class="btn" type="button" @click="aceptarRegalo(p, $event)">Aceptar regalo</button>
            <button class="btn btn-ghost" type="button" @click="rechazarRegalo(p, $event)">Rechazar</button>
          </div>
          <button v-if="puedeRegalar(p)" class="btn btn-soft" type="button" @click="openGift(p, $event)">
            Regalar
          </button>
        </div>
      </article>

      <template v-if="almacen.length">
        <h3 class="heading">Almacén</h3>
        <p class="muted">Solo consulta. Para cobrar, acude a la entidad o digitaliza.</p>
        <article v-for="p in almacen" :key="'s' + p.id" class="ticket">
          <button type="button" class="ticket-btn" @click="toggle(p.id)">
            <div class="info">
              <strong>{{ p.entidad || 'Entidad' }}</strong>
              <span class="pill">Almacén</span>
            </div>
            <span v-if="(p.premio ?? 0) > 0" class="prize">{{ money(p.premio) }}</span>
          </button>
          <div v-if="expandedId === p.id" class="detail">
            <p v-if="p.storage_message">{{ p.storage_message }}</p>
            <p v-if="(p.premio ?? 0) > 0"><span>Premio orientativo</span> {{ money(p.premio) }}</p>
            <p v-if="p.presencial_contact?.formatted">
              <span>Cobro presencial</span> {{ p.presencial_contact.formatted }}
            </p>
          </div>
        </article>
      </template>

      <div v-if="lastPage > 1" class="row pager">
        <button class="btn btn-ghost" type="button" :disabled="filters.page <= 1" @click="prevPage">
          Anterior
        </button>
        <span class="muted">Pág. {{ filters.page }} / {{ lastPage }} · {{ total }}</span>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="filters.page >= lastPage"
          @click="nextPage"
        >
          Siguiente
        </button>
      </div>
    </template>
  </section>

  <div v-if="modal !== 'none'" class="overlay" @click.self="closeModal">
    <div class="card sheet stack">
      <template v-if="modal === 'digitalizar'">
        <h3>Digitalizar participación</h3>
        <p class="muted">Introduce la referencia del QR. El proceso no se puede deshacer.</p>
        <label class="field">
          <span>Referencia</span>
          <input v-model="referencia" type="text" @keyup.enter="digitalizar" />
        </label>
        <p v-if="modalError" class="error">{{ modalError }}</p>
        <div class="row">
          <button class="btn" type="button" :disabled="busy || !referencia.trim()" @click="digitalizar">
            {{ busy ? 'Procesando…' : 'Digitalizar' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="closeModal">Cancelar</button>
        </div>
      </template>

      <template v-else-if="modal === 'codigo'">
        <h3>Vincular con código</h3>
        <p class="muted">Código que te dio el vendedor al comprar participaciones digitales.</p>
        <label class="field">
          <span>Código</span>
          <input v-model="codigo" type="text" @keyup.enter="vincularCodigo" />
        </label>
        <p v-if="modalError" class="error">{{ modalError }}</p>
        <div class="row">
          <button class="btn" type="button" :disabled="busy || !codigo.trim()" @click="vincularCodigo">
            {{ busy ? 'Vinculando…' : 'Vincular' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="closeModal">Cancelar</button>
        </div>
      </template>

      <template v-else>
        <h3>Regalar participación</h3>
        <p class="muted">Asegúrate de que el email es correcto: no se puede deshacer.</p>
        <label class="field">
          <span>Email destinatario</span>
          <input v-model="giftEmail" type="email" />
        </label>
        <label class="field">
          <span>Mensaje (opcional)</span>
          <textarea v-model="giftMessage" />
        </label>
        <p v-if="modalError" class="error">{{ modalError }}</p>
        <div class="row">
          <button class="btn" type="button" :disabled="busy || !giftEmail.trim()" @click="enviarRegalo">
            {{ busy ? 'Enviando…' : 'Regalar' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="closeModal">Cancelar</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
h2,
h3 {
  margin: 0 0 0.25rem;
}
.heading {
  font-size: 1rem;
  margin-top: 0.4rem;
}
.ok {
  color: var(--accent);
  font-weight: 600;
  margin: 0;
}
.filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  align-items: end;
}
.filters .field {
  margin: 0;
}
.filters .check {
  grid-column: 1 / -1;
}
.filters .btn {
  grid-column: 1 / -1;
}
.check {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.88rem;
  padding-bottom: 0.1rem;
}
.ticket {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.ticket.dim {
  opacity: 0.7;
}
.ticket-btn {
  width: 100%;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 0.7rem;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.7rem;
  cursor: pointer;
}
.thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 8px;
  background: #eef2f6;
}
.ph {
  display: grid;
  place-items: center;
  font-size: 1.3rem;
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
  align-self: flex-start;
  background: #eef2f6;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
}
.ok-pill {
  background: var(--accent-soft);
  color: var(--accent);
}
.warn {
  background: #fde8e8;
  color: var(--danger);
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
@media (max-width: 700px) {
  .ticket-btn {
    grid-template-columns: 44px 1fr;
  }
  .meta {
    grid-column: 1 / -1;
    align-items: flex-start;
  }
}
</style>
