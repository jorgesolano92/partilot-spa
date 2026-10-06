<script setup lang="ts">
import { asset } from '@/lib/asset'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/api/client'

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const doneMessage = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  loading.value = true
  try {
    const { data } = await api.post<{ message?: string }>('/auth/password/reset', {
      token: token.value,
      email: email.value.trim(),
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    doneMessage.value = data.message || 'Contraseña actualizada. Ya puedes iniciar sesión.'
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    const firstFieldError = err.response?.data?.errors
      ? Object.values(err.response.data.errors)[0]?.[0]
      : null
    error.value =
      err.response?.status === 429
        ? 'Demasiados intentos. Espera un minuto y vuelve a probar.'
        : firstFieldError || err.response?.data?.message || 'No se pudo restablecer la contraseña.'
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
        <h1>Nueva contraseña</h1>
      </div>

      <template v-if="doneMessage">
        <p class="center">{{ doneMessage }}</p>
        <RouterLink class="btn center" :to="{ name: 'login' }">Entrar</RouterLink>
      </template>
      <template v-else-if="!token">
        <p class="error center">El enlace no es válido. Solicita uno nuevo.</p>
        <p class="muted center">
          <RouterLink :to="{ name: 'recuperar-contrasena' }">Recuperar contraseña</RouterLink>
        </p>
      </template>
      <template v-else>
        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <label class="field">
          <span>Nueva contraseña</span>
          <input v-model="password" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <label class="field">
          <span>Repite la contraseña</span>
          <input v-model="passwordConfirmation" type="password" autocomplete="new-password" minlength="8" required />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
        <p class="muted center">
          <RouterLink :to="{ name: 'recuperar-contrasena' }">Pedir un enlace nuevo</RouterLink>
        </p>
      </template>
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
.center {
  text-align: center;
  margin: 0;
}
</style>
