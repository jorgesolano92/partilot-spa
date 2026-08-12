<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const localError = ref<string | null>(null)

async function onSubmit() {
  localError.value = null
  try {
    await auth.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch {
    localError.value = auth.error || 'No se pudo iniciar sesión'
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="card login-card stack" @submit.prevent="onSubmit">
      <div>
        <h1>Partilot</h1>
        <p class="muted">Acceso web como usuario, vendedor o gestor</p>
      </div>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="username" required />
      </label>

      <label class="field">
        <span>Contraseña</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="localError" class="error">{{ localError }}</p>

      <button class="btn" type="submit" :disabled="auth.loading">
        {{ auth.loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}
.login-card {
  width: min(100%, 420px);
}
h1 {
  margin: 0 0 0.25rem;
  letter-spacing: -0.03em;
}
</style>
