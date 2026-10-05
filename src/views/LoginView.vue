<script setup lang="ts">
import { asset } from '@/lib/asset'
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
      <div class="brand-section">
        <img :src="asset('assets/logo_menu.svg')" alt="Partilot" class="brand-logo brand-logo--auth" />
        <h1>Bienvenido</h1>
        <p class="muted">Accede a tu cuenta <strong>PARTILOT</strong></p>
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
      <p class="muted center">
        ¿No tienes cuenta?
        <RouterLink :to="{ name: 'registro' }">Regístrate</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
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
