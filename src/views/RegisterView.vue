<script setup lang="ts">
import { asset } from '@/lib/asset'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const fechaNacimiento = ref('')
const aceptar = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  if (!aceptar.value) {
    error.value = 'Debes aceptar las condiciones de uso.'
    return
  }
  try {
    await auth.register({
      email: email.value.trim(),
      password: password.value,
      fecha_nacimiento: fechaNacimiento.value,
      aceptar_condiciones: true,
    })
    await router.replace({ name: 'usuario' })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    const firstFieldError = err.response?.data?.errors
      ? Object.values(err.response.data.errors)[0]?.[0]
      : null
    error.value = firstFieldError || auth.error || 'No se pudo completar el registro.'
  }
}
</script>

<template>
  <div class="wrap">
    <form class="card login-card stack" @submit.prevent="onSubmit">
      <div class="brand-section">
        <img :src="asset('assets/logo_menu.svg')" alt="Partilot" class="brand-logo brand-logo--auth" />
        <h1>Crear cuenta</h1>
        <p class="muted">Registro de usuario <strong>PARTILOT</strong></p>
      </div>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" required autocomplete="username" />
      </label>
      <label class="field">
        <span>Contraseña</span>
        <input v-model="password" type="password" required autocomplete="new-password" minlength="8" />
      </label>
      <label class="field">
        <span>Fecha de nacimiento</span>
        <input v-model="fechaNacimiento" type="date" required />
      </label>
      <label class="check">
        <input v-model="aceptar" type="checkbox" />
        Acepto las condiciones de uso
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn" type="submit" :disabled="auth.loading">
        {{ auth.loading ? 'Registrando…' : 'Registrarme' }}
      </button>
      <p class="muted center">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ name: 'login' }">Entrar</RouterLink>
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
.check {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
  font-size: 0.9rem;
}
.center {
  text-align: center;
  margin: 0;
}
</style>
