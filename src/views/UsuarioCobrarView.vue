<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import {
  formatearIbanDigits,
  normalizeIbanEs,
  validarDocumentoEspanol,
  validarIbanEspanol,
} from '@/lib/spanishDocs'
import { useAuthStore } from '@/stores/auth'
import type {
  CobrablesResponse,
  CobroRequest,
  DonacionRequest,
  DonacionResponse,
  WalletListResponse,
  WalletParticipation,
} from '@/types'

type Mode = 'cobro' | 'donacion'
type Step =
  | 'lista'
  | 'datos'
  | 'iban'
  | 'config-donacion'
  | 'confirm-cobro'
  | 'confirm-donacion'
  | 'exito'

const auth = useAuthStore()

const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const mode = ref<Mode>('cobro')
const step = ref<Step>('lista')
const cobrables = ref<WalletParticipation[]>([])
const bloqueadas = ref<WalletParticipation[]>([])
const selected = ref<Set<number>>(new Set())

const datos = reactive({ nombre: '', apellidos: '', nif: '' })
const ibanDigits = ref('')
const confirmPaso = ref(0)
const certificadoFiscal = ref(false)

const importeDonacion = ref(0)
const importeCodigo = ref(0)
const porcentajeDonacion = ref(50)

const successKind = ref<'cobro' | 'donacion' | 'codigo'>('cobro')
const codigoRecarga = ref('')
const pendingCodigoAfterDonacion = ref(false)

const legalCobro = ref({
  title: 'Confirmar cobro',
  irreversibility_warning:
    'El cobro es irreversible. Revisa IBAN e importe antes de confirmar.',
  confirm_label: 'Confirmar cobro',
  confirm_again_label: 'Pulsa de nuevo para confirmar',
  double_confirm_message: 'Pulsa dos veces para confirmar.',
})
const legalDonacion = ref({
  title: 'Confirmar donación',
  notice_template:
    'El importe donado será transferido íntegramente a :entity_name. La donación es irreversible.',
  rgpd_notice_template:
    'Tus datos fiscales se transmitirán a :entity_name para la emisión del certificado.',
  confirm_label: 'Confirmar donación',
  confirm_again_label: 'Pulsa de nuevo para confirmar',
  fiscal_certificate_question: 'Solicitar certificado fiscal',
})

const avisoDonacion = computed(() =>
  (legalDonacion.value.notice_template || '').replace(
    ':entity_name',
    entidadSeleccion.value || 'la entidad',
  ),
)
const avisoRgpd = computed(() =>
  (legalDonacion.value.rgpd_notice_template || '').replace(
    ':entity_name',
    entidadSeleccion.value || 'la entidad',
  ),
)

async function loadLegalConfig() {
  try {
    const { data } = await api.get<{
      success?: boolean
      data?: {
        prize_collection?: Partial<typeof legalCobro.value>
        prize_donation?: Partial<typeof legalDonacion.value>
      }
    }>('/legal/config')
    if (data.data?.prize_collection) {
      legalCobro.value = { ...legalCobro.value, ...data.data.prize_collection }
    }
    if (data.data?.prize_donation) {
      legalDonacion.value = { ...legalDonacion.value, ...data.data.prize_donation }
    }
  } catch {
    /* defaults */
  }
}

const importeTotal = computed(() =>
  Array.from(selected.value).reduce((sum, id) => {
    const p = cobrables.value.find((x) => x.id === id)
    return sum + (p?.premio ?? p?.importeTotal ?? 0)
  }, 0),
)

const entityIdSeleccion = computed(() => {
  const firstId = selected.value.values().next().value as number | undefined
  if (firstId == null) return null
  return cobrables.value.find((x) => x.id === firstId)?.entity_id ?? null
})

const entidadSeleccion = computed(() => {
  const firstId = selected.value.values().next().value as number | undefined
  if (firstId == null) return null
  return cobrables.value.find((x) => x.id === firstId)?.entidad ?? null
})

const codigoRecargaDisponible = computed(() => {
  const ids = Array.from(selected.value)
  if (!ids.length) return false
  return ids.every((id) => cobrables.value.find((x) => x.id === id)?.can_generate_recharge_code === true)
})

const puedeDonarImporte = computed(() => {
  const ids = Array.from(selected.value)
  if (!ids.length) return false
  return ids.every((id) => cobrables.value.find((x) => x.id === id)?.can_donate === true)
})

const ibanFormateado = computed(() => formatearIbanDigits(ibanDigits.value))
const ibanResumen = computed(() => {
  const raw = ibanDigits.value.replace(/\D/g, '')
  if (raw.length < 4) return 'ES ****'
  return `ES **** **** **** ${raw.slice(-4)}`
})

function cargarDatosDesdeUsuario() {
  const u = auth.user
  if (!u) return
  if (!datos.nombre.trim()) datos.nombre = String(u.name || '').trim()
  if (!datos.apellidos.trim()) {
    datos.apellidos = [u.last_name, u.last_name2]
      .filter((v) => v != null && String(v).trim() !== '')
      .map((v) => String(v).trim())
      .join(' ')
  }
  if (!datos.nif.trim()) datos.nif = String(u.nif_cif || '').trim()
}

function resetSeleccion() {
  selected.value = new Set()
}

function setMode(next: Mode) {
  mode.value = next
  step.value = 'lista'
  confirmPaso.value = 0
  error.value = null
  resetSeleccion()
}

function puedeSeleccionar(p: WalletParticipation): boolean {
  if (mode.value === 'cobro') return true
  if (selected.value.size === 0) return true
  if (entityIdSeleccion.value != null && p.entity_id != null) {
    return p.entity_id === entityIdSeleccion.value
  }
  return (p.entidad ?? '') === (entidadSeleccion.value ?? '')
}

function toggle(p: WalletParticipation) {
  error.value = null
  const next = new Set(selected.value)
  if (next.has(p.id)) {
    next.delete(p.id)
  } else {
    if (!puedeSeleccionar(p)) {
      error.value = `Solo puedes donar participaciones de la misma entidad («${entidadSeleccion.value || ''}»).`
      return
    }
    next.add(p.id)
  }
  selected.value = next
}

function aplicarDistribucionDonacion() {
  if (codigoRecargaDisponible.value && puedeDonarImporte.value) {
    porcentajeDonacion.value = 50
    importeDonacion.value = Math.round(importeTotal.value * 0.5 * 100) / 100
    importeCodigo.value = Math.round((importeTotal.value - importeDonacion.value) * 100) / 100
    return
  }
  if (codigoRecargaDisponible.value && !puedeDonarImporte.value) {
    porcentajeDonacion.value = 0
    importeDonacion.value = 0
    importeCodigo.value = importeTotal.value
    return
  }
  porcentajeDonacion.value = 100
  importeDonacion.value = importeTotal.value
  importeCodigo.value = 0
}

function onSlider(val: number) {
  if (!codigoRecargaDisponible.value || !puedeDonarImporte.value) {
    aplicarDistribucionDonacion()
    return
  }
  porcentajeDonacion.value = val
  importeDonacion.value = Math.round(((importeTotal.value * val) / 100) * 100) / 100
  importeCodigo.value = Math.round((importeTotal.value - importeDonacion.value) * 100) / 100
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [{ data: cobroRes }, { data: walletRes }] = await Promise.all([
      api.get<CobrablesResponse>('/wallet/participations/cobrables'),
      api.get<WalletListResponse>('/wallet/participations', {
        params: { paginate: 0, include_expired: 0 },
      }),
    ])
    cobrables.value = cobroRes.participations || []
    const wallet = walletRes.participations || []
    bloqueadas.value = wallet.filter(
      (p) =>
        (p.premio ?? 0) > 0 &&
        p.payment_blocked &&
        !['cobrada', 'donada', 'caducada', 'regalada'].includes(p.estado || ''),
    )
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar las participaciones cobrables.'
    cobrables.value = []
    bloqueadas.value = []
  } finally {
    loading.value = false
  }
}

function continuar() {
  error.value = null
  if (selected.value.size === 0) {
    error.value = mode.value === 'cobro'
      ? 'Selecciona al menos una participación para cobrar.'
      : 'Selecciona al menos una participación para donar.'
    return
  }
  if (mode.value === 'cobro') {
    cargarDatosDesdeUsuario()
    step.value = 'datos'
    return
  }
  aplicarDistribucionDonacion()
  if (!puedeDonarImporte.value && !codigoRecargaDisponible.value) {
    error.value = 'Esta entidad no admite donación ni código de recarga.'
    return
  }
  step.value = 'config-donacion'
}

function validarDatosPersonales(strict: boolean): string | null {
  if (strict) {
    if (!datos.nombre.trim() || !datos.apellidos.trim() || !datos.nif.trim()) {
      return 'Completa nombre, apellidos y NIF/NIE.'
    }
  }
  if (datos.nif.trim() && !validarDocumentoEspanol(datos.nif)) {
    return 'El NIF/NIE/DNI/CIF no es válido.'
  }
  return null
}

function guardarDatos() {
  const msg = validarDatosPersonales(true)
  if (msg) {
    error.value = msg
    return
  }
  error.value = null
  step.value = 'iban'
}

function irAConfirmCobro() {
  const iban = normalizeIbanEs(ibanDigits.value)
  if (iban.length !== 24) {
    error.value = 'Introduce los 22 dígitos del IBAN (ES está incluido).'
    return
  }
  if (!validarIbanEspanol(iban)) {
    error.value = 'El IBAN no es correcto. Comprueba los dígitos de control.'
    return
  }
  error.value = null
  confirmPaso.value = 0
  step.value = 'confirm-cobro'
}

async function confirmarCobro() {
  if (confirmPaso.value === 0) {
    confirmPaso.value = 1
    return
  }
  busy.value = true
  error.value = null
  try {
    const body: CobroRequest = {
      participation_ids: Array.from(selected.value),
      nombre: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      nif: datos.nif.trim().toUpperCase(),
      iban: normalizeIbanEs(ibanDigits.value),
      importe_total: Math.round(importeTotal.value * 100) / 100,
      confirmacion_cobro_irreversible: true,
    }
    await api.post('/wallet/cobro', body)
    successKind.value = 'cobro'
    pendingCodigoAfterDonacion.value = false
    codigoRecarga.value = ''
    resetSeleccion()
    step.value = 'exito'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo registrar el cobro.'
    step.value = 'iban'
  } finally {
    busy.value = false
  }
}

function irAConfirmDonacion() {
  error.value = null
  confirmPaso.value = 0
  certificadoFiscal.value = false
  if (importeDonacion.value > 0) cargarDatosDesdeUsuario()
  step.value = 'confirm-donacion'
}

async function confirmarDonacion() {
  if (importeDonacion.value > 0 && certificadoFiscal.value) {
    const msg = validarDatosPersonales(true)
    if (msg) {
      error.value = msg
      return
    }
  }
  if (confirmPaso.value === 0) {
    confirmPaso.value = 1
    return
  }

  busy.value = true
  error.value = null
  try {
    let don = Math.round(importeDonacion.value * 100) / 100
    let cod = Math.round(importeCodigo.value * 100) / 100
    const diff = Math.round((importeTotal.value - (don + cod)) * 100) / 100
    if (Math.abs(diff) > 0.001) cod = Math.round((cod + diff) * 100) / 100

    const body: DonacionRequest = {
      participation_ids: Array.from(selected.value),
      importe_donacion: don,
      importe_codigo: cod,
      confirmacion_operacion_irreversible: true,
    }
    if (don > 0) {
      body.confirmacion_donacion_irreversible = true
      body.certificado_fiscal = certificadoFiscal.value
    }
    if (datos.nombre.trim()) body.nombre = datos.nombre.trim()
    if (datos.apellidos.trim()) body.apellidos = datos.apellidos.trim()
    if (datos.nif.trim()) body.nif = datos.nif.trim().toUpperCase()

    const { data } = await api.post<DonacionResponse>('/wallet/donacion', body)
    codigoRecarga.value = data.codigo_recarga || ''
    if (don > 0 && cod > 0 && codigoRecarga.value) {
      successKind.value = 'donacion'
      pendingCodigoAfterDonacion.value = true
    } else if (don > 0) {
      successKind.value = 'donacion'
      pendingCodigoAfterDonacion.value = false
    } else {
      successKind.value = 'codigo'
      pendingCodigoAfterDonacion.value = false
    }
    resetSeleccion()
    step.value = 'exito'
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudo registrar la donación.'
    step.value = 'config-donacion'
  } finally {
    busy.value = false
  }
}

function cerrarExito() {
  if (pendingCodigoAfterDonacion.value && codigoRecarga.value) {
    successKind.value = 'codigo'
    pendingCodigoAfterDonacion.value = false
    return
  }
  step.value = 'lista'
  mode.value = 'cobro'
  successKind.value = 'cobro'
  codigoRecarga.value = ''
}

onMounted(() => {
  void load()
  void loadLegalConfig()
})
</script>

<template>
  <section class="page stack cobrar">
    <RouterLink class="page-back" :to="{ name: 'usuario' }">← Volver a cartera</RouterLink>

    <div class="section-header">
      <h1 class="section-title">Cobrar / Donar</h1>
      <p class="section-subtitle">Gestiona premios desbloqueados para cobro online, igual que en la app.</p>
    </div>

    <div v-if="step === 'lista'" class="row modes">
      <button class="btn" :class="{ 'btn-ghost': mode !== 'cobro' }" type="button" @click="setMode('cobro')">
        Cobrar
      </button>
      <button
        class="btn"
        :class="{ 'btn-ghost': mode !== 'donacion' }"
        type="button"
        @click="setMode('donacion')"
      >
        Donar / código
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando…</p>

    <template v-if="!loading && step === 'lista'">
      <p v-if="!cobrables.length" class="muted">
        No tienes participaciones disponibles para cobro online ahora mismo.
      </p>

      <article v-for="p in cobrables" :key="p.id" class="item" :class="{ on: selected.has(p.id) }">
        <label class="item-row">
          <input
            type="checkbox"
            :checked="selected.has(p.id)"
            @change="toggle(p)"
          />
          <div class="info">
            <strong>{{ p.entidad || 'Entidad' }}</strong>
            <span class="muted">{{ p.sorteo }} · {{ p.fechaSorteo }}</span>
            <span class="muted">{{ p.numeroReservado || p.numeroParticipacion || p.id }}</span>
          </div>
          <strong class="prize">{{ money(p.premio) }}</strong>
        </label>
      </article>

      <template v-if="bloqueadas.length">
        <h3 class="heading">Premios bloqueados</h3>
        <p class="muted">Aún no se puede cobrar online. El mensaje lo marca la entidad o Partilot.</p>
        <article v-for="p in bloqueadas" :key="'b' + p.id" class="item dim">
          <div class="item-row">
            <div class="info">
              <strong>{{ p.entidad || 'Entidad' }}</strong>
              <span class="muted">{{ p.user_message || 'Cobro pendiente de activación' }}</span>
            </div>
            <strong class="prize">{{ money(p.premio) }}</strong>
          </div>
        </article>
      </template>

      <div v-if="cobrables.length" class="footer-bar">
        <span
          >{{ selected.size }} seleccionada(s) · <strong>{{ money(importeTotal) }}</strong></span
        >
        <button class="btn" type="button" :disabled="!selected.size" @click="continuar">Continuar</button>
      </div>
    </template>

    <template v-else-if="step === 'datos'">
      <h3>Datos personales</h3>
      <p class="muted">Necesarios para la transferencia del premio.</p>
      <label class="field">
        <span>Nombre</span>
        <input v-model="datos.nombre" type="text" autocomplete="given-name" />
      </label>
      <label class="field">
        <span>Apellidos</span>
        <input v-model="datos.apellidos" type="text" autocomplete="family-name" />
      </label>
      <label class="field">
        <span>NIF / NIE</span>
        <input v-model="datos.nif" type="text" autocomplete="off" />
      </label>
      <div class="row">
        <button class="btn" type="button" @click="guardarDatos">Continuar</button>
        <button class="btn btn-ghost" type="button" @click="step = 'lista'">Atrás</button>
      </div>
    </template>

    <template v-else-if="step === 'iban'">
      <h3>Cuenta bancaria</h3>
      <p class="muted">Importe a transferir: <strong>{{ money(importeTotal) }}</strong></p>
      <label class="field">
        <span>IBAN</span>
        <div class="iban">
          <span class="addon">ES</span>
          <input
            :value="ibanFormateado"
            type="text"
            inputmode="numeric"
            placeholder="12 1234 1234 12 1234567890"
            @input="ibanDigits = ($event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 22)"
          />
        </div>
      </label>
      <div class="row">
        <button class="btn" type="button" @click="irAConfirmCobro">Continuar</button>
        <button class="btn btn-ghost" type="button" @click="step = 'datos'">Atrás</button>
      </div>
    </template>

    <template v-else-if="step === 'config-donacion'">
      <h3>Distribuir premio</h3>
      <p class="muted">
        Total {{ money(importeTotal) }}
        <template v-if="entidadSeleccion"> · {{ entidadSeleccion }}</template>
      </p>

      <template v-if="codigoRecargaDisponible && puedeDonarImporte">
        <label class="field">
          <span>Donación {{ porcentajeDonacion }}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            :value="porcentajeDonacion"
            @input="onSlider(Number(($event.target as HTMLInputElement).value))"
          />
        </label>
      </template>
      <p v-else-if="!puedeDonarImporte && codigoRecargaDisponible" class="muted">
        Esta entidad no admite donación: todo el importe irá a código de recarga.
      </p>
      <p v-else class="muted">Todo el importe se donará a la entidad.</p>

      <p><span class="muted">Donación</span> <strong>{{ money(importeDonacion) }}</strong></p>
      <p><span class="muted">Código de recarga</span> <strong>{{ money(importeCodigo) }}</strong></p>

      <div class="row">
        <button class="btn" type="button" @click="irAConfirmDonacion">Continuar</button>
        <button class="btn btn-ghost" type="button" @click="step = 'lista'">Atrás</button>
      </div>
    </template>

    <template v-else-if="step === 'confirm-cobro'">
      <h3>{{ legalCobro.title }}</h3>
      <p class="warn-box">
        {{ legalCobro.irreversibility_warning || 'El cobro es irreversible.' }}
        Se transferirán {{ money(importeTotal) }} a la cuenta {{ ibanResumen }}.
      </p>
      <p class="muted">{{ legalCobro.double_confirm_message || 'Pulsa dos veces para confirmar.' }}</p>
      <div class="row">
        <button class="btn" type="button" :disabled="busy" @click="confirmarCobro">
          {{
            busy
              ? 'Procesando…'
              : confirmPaso === 0
                ? legalCobro.confirm_label
                : legalCobro.confirm_again_label
          }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="busy" @click="step = 'iban'">Atrás</button>
      </div>
    </template>

    <template v-else-if="step === 'confirm-donacion'">
      <h3>{{ legalDonacion.title }}</h3>
      <p class="warn-box">{{ avisoDonacion }}</p>
      <p><span class="muted">Donación</span> <strong>{{ money(importeDonacion) }}</strong></p>
      <p><span class="muted">Código</span> <strong>{{ money(importeCodigo) }}</strong></p>

      <template v-if="importeDonacion > 0">
        <label class="check">
          <input v-model="certificadoFiscal" type="checkbox" />
          {{ legalDonacion.fiscal_certificate_question || 'Solicitar certificado fiscal' }}
        </label>
        <div v-if="certificadoFiscal" class="stack tight">
          <p class="muted">{{ avisoRgpd }}</p>
          <label class="field">
            <span>Nombre</span>
            <input v-model="datos.nombre" type="text" />
          </label>
          <label class="field">
            <span>Apellidos</span>
            <input v-model="datos.apellidos" type="text" />
          </label>
          <label class="field">
            <span>NIF / NIE</span>
            <input v-model="datos.nif" type="text" />
          </label>
        </div>
      </template>

      <p class="muted">Pulsa dos veces para confirmar.</p>
      <div class="row">
        <button class="btn" type="button" :disabled="busy" @click="confirmarDonacion">
          {{
            busy
              ? 'Procesando…'
              : confirmPaso === 0
                ? legalDonacion.confirm_label
                : legalDonacion.confirm_again_label
          }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="busy"
          @click="step = 'config-donacion'"
        >
          Atrás
        </button>
      </div>
    </template>

    <template v-else-if="step === 'exito'">
      <div class="ok-box">
        <h3 v-if="successKind === 'cobro'">Cobro registrado</h3>
        <h3 v-else-if="successKind === 'donacion'">Donación registrada</h3>
        <h3 v-else>Código de recarga</h3>
        <p v-if="successKind === 'cobro'" class="muted">
          Recibirás la transferencia en la cuenta indicada según los plazos bancarios.
        </p>
        <p v-else-if="successKind === 'donacion'" class="muted">
          Gracias. La entidad recibirá el importe donado.
        </p>
        <p v-if="successKind === 'codigo' && codigoRecarga" class="code">{{ codigoRecarga }}</p>
        <p v-if="successKind === 'codigo'" class="muted">
          Guarda este código; lo necesitarás para usarlo en la administración.
        </p>
      </div>
      <button class="btn" type="button" @click="cerrarExito">
        {{ pendingCodigoAfterDonacion ? 'Ver código' : 'Volver' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
h2,
h3 {
  margin: 0 0 0.25rem;
}
.heading {
  font-size: 1rem;
  margin-top: 0.5rem;
}
.modes .btn {
  flex: 1;
}
.item {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}
.item.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.item.dim {
  opacity: 0.85;
}
.item-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.prize {
  color: var(--accent);
  white-space: nowrap;
}
.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border);
}
.iban {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.iban .addon {
  display: grid;
  place-items: center;
  padding: 0 0.75rem;
  background: #eef2f6;
  font-weight: 700;
}
.iban input {
  border: none;
  padding: 0.7rem 0.8rem;
  flex: 1;
  min-width: 0;
}
.warn-box,
.ok-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: #fff;
}
.warn-box {
  background: #fff8e8;
  border-color: #f0d9a0;
}
.code {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0.5rem 0;
}
.check {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  font-size: 0.92rem;
}
.tight {
  gap: 0.35rem;
}
.stack.tight .field {
  margin-bottom: 0.45rem;
}
</style>
