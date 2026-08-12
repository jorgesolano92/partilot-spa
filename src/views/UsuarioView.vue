<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/api/client'
import type { ParticipationCheckResponse } from '@/types'

const referencia = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<ParticipationCheckResponse | null>(null)

async function consultar() {
  error.value = null
  result.value = null
  loading.value = true
  try {
    const { data } = await api.get<ParticipationCheckResponse>('/wallet/participations/check', {
      params: { referencia: referencia.value.trim() },
    })
    result.value = data
  } catch (e: unknown) {
    const err = e as { response?: { data?: ParticipationCheckResponse } }
    result.value = err.response?.data ?? null
    error.value = err.response?.data?.message || 'No se pudo consultar la participación'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card stack">
    <div>
      <h2>Modo usuario</h2>
      <p class="muted">
        Consulta una participación por referencia (mismo flujo de lectura que la app; el escáner
        de cámara se puede añadir después).
      </p>
    </div>

    <label class="field">
      <span>Referencia / código</span>
      <input v-model="referencia" type="text" placeholder="Código de la participación" />
    </label>

    <div class="row">
      <button class="btn" type="button" :disabled="loading || !referencia.trim()" @click="consultar">
        {{ loading ? 'Consultando…' : 'Consultar' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <pre v-if="result" class="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </section>
</template>

<style scoped>
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
