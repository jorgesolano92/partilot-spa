<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { mediaUrl, money } from '@/lib/format'
import type { PublicCheckResponse, PublicCheckTicket, SellByQrResponse } from '@/types'

const referencia = ref('')
const loadingCheck = ref(false)
const loadingSell = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)
const ticket = ref<PublicCheckTicket | null>(null)
const sold = ref(false)

function resetPreview() {
  ticket.value = null
  sold.value = false
  message.value = null
  error.value = null
}

async function consultar() {
  const ref = referencia.value.trim()
  if (!ref) return
  loadingCheck.value = true
  resetPreview()
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
      'No se pudo consultar la referencia.'
  } finally {
    loadingCheck.value = false
  }
}

async function confirmarVenta() {
  const ref = referencia.value.trim()
  if (!ref) return
  loadingSell.value = true
  error.value = null
  message.value = null
  try {
    const { data } = await api.post<SellByQrResponse>('/sales/qr', {
      referencia: ref,
      payment_method: 'omitir',
    })
    sold.value = true
    message.value = data.message || 'Participación marcada como vendida.'
  } catch (e: unknown) {
    const err = e as { response?: { data?: SellByQrResponse } }
    error.value = err.response?.data?.message || 'No se pudo completar la venta.'
  } finally {
    loadingSell.value = false
  }
}

function cancelar() {
  referencia.value = ''
  resetPreview()
}
</script>

<template>
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>
    <div>
      <h2>Vender por referencia</h2>
      <p class="muted">
        Equivalente al escáner: comprueba la participación y, si está asignada a ti, confírmala.
      </p>
    </div>

    <form class="stack" @submit.prevent="consultar">
      <label class="field">
        <span>Referencia QR</span>
        <input
          v-model="referencia"
          type="text"
          placeholder="Código leído del QR"
          autocomplete="off"
          @input="resetPreview"
        />
      </label>
      <div class="row">
        <button class="btn" type="submit" :disabled="loadingCheck || !referencia.trim()">
          {{ loadingCheck ? 'Consultando…' : 'Comprobar' }}
        </button>
        <button class="btn btn-ghost" type="button" @click="cancelar">Limpiar</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>

    <div v-if="ticket" class="preview stack">
      <img
        v-if="ticket.preview_image_url"
        class="thumb"
        :src="mediaUrl(ticket.preview_image_url)"
        alt=""
      />
      <div>
        <strong>{{ ticket.reserve?.entity?.name || 'Entidad' }}</strong>
        <p class="muted">{{ ticket.lottery?.name || 'Sorteo' }}</p>
        <p class="muted">
          Ref. {{ ticket.data?.participation_number || referencia }}
          · Precio {{ money(ticket.lottery?.ticket_price) }}
        </p>
      </div>

      <div v-if="!sold" class="row">
        <button class="btn" type="button" :disabled="loadingSell" @click="confirmarVenta">
          {{ loadingSell ? 'Vendiendo…' : 'Confirmar venta' }}
        </button>
        <button class="btn btn-ghost" type="button" @click="cancelar">Cancelar</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.ok {
  color: var(--accent);
  font-weight: 600;
  margin: 0;
}
.preview {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem;
  background: #fff;
}
.thumb {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 8px;
  background: #eef2f6;
}
</style>
