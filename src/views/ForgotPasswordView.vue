<script setup lang="ts">
import { asset } from '@/lib/asset'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'

const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const sentMessage = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    const { data } = await api.post<{ message?: string }>('/auth/password/forgot', {
      email: email.value.trim(),
    })
    sentMessage.value =
      data.message ||
      'Si existe una cuenta con ese email, recibirás un correo con un enlace para restablecer la contraseña.'
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    const firstFieldError = err.response?.data?.errors
      ? Object.values(err.response.data.errors)[0]?.[0]
      : null
    error.value =
      err.response?.status === 429
        ? 'Demasiados intentos. Espera un minuto y vuelve a probar.'
        : firstFieldError || err.response?.data?.message || 'No se pudo enviar la solicitud.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <form class="card login-card stack" @submit.prevent="onSubmit">
      <div class="brand-section">
        <img :src="asset('assets/logo_menu.svg')" alt="Partilot" class="brand-logo brand-logo--auth" />
        <h1>Recuperar contraseña</h1>
        <p class="muted">Te enviaremos un enlace para crear una nueva.</p>
      </div>

      <template v-if="!sentMessage">
        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="username" required />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </button>
      </template>
      <p v-else class="center">{{ sentMessage }}</p>

      <p class="muted center">
        <RouterLink :to="{ name: 'login' }">Volver a entrar</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: #f8f8f8;
}
.login-card {
  width: min(100%, 420px);
}
.brand-section {
  text-align: center;
  margin-bottom: 0.25rem;
}
h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}
.brand-section .muted {
  margin: 0;
}
.center {
  text-align: center;
  margin: 0;
}
</style>
