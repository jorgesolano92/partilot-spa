<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/api/client'
import type { SellByQrResponse } from '@/types'

const referencia = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)
const result = ref<SellByQrResponse | null>(null)

async function vender() {
  error.value = null
  message.value = null
  result.value = null
  loading.value = true
  try {
    const { data } = await api.post<SellByQrResponse>('/sales/qr', {
      referencia: referencia.value.trim(),
      payment_method: 'omitir',
    })
    result.value = data
    message.value = data.message || (data.success ? 'Venta registrada' : 'Sin mensaje')
  } catch (e: unknown) {
    const err = e as { response?: { data?: SellByQrResponse } }
    result.value = err.response?.data ?? null
    error.value = err.response?.data?.message || 'No se pudo completar la venta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card stack">
    <div>
      <h2>Modo vendedor</h2>
      <p class="muted">
        Solo venta: introduce la referencia del QR. Si está disponible, se registra la venta
        (sin cobro en este MVP).
      </p>
    </div>

    <label class="field">
      <span>Referencia QR</span>
      <input v-model="referencia" type="text" placeholder="Código leído del QR" />
    </label>

    <div class="row">
      <button class="btn" type="button" :disabled="loading || !referencia.trim()" @click="vender">
        {{ loading ? 'Vendiendo…' : 'Vender' }}
      </button>
    </div>

    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <pre v-if="result" class="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </section>
</template>

<style scoped>
.ok {
  color: var(--accent);
  font-weight: 600;
}
.result {
  margin: 0;
  padding: 0.85rem;
  background: #0f1720;
  color: #e8eef5;
  border-radius: 10px;
  overflow: auto;
  font-size: 0.82rem;
}
</style>
