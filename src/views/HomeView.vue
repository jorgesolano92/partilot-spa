<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function open(mode: 'usuario' | 'vendedor' | 'gestor') {
  if (mode === 'gestor') {
    auth.enterGestorMode()
    router.push({
      name: auth.managerEntities.length > 1 ? 'gestor-entidad' : 'gestor',
    })
    return
  }
  auth.setMode(mode)
  router.push({ name: mode })
}
</script>

<template>
  <section class="card stack">
    <div>
      <h2>Hola{{ auth.user ? `, ${auth.user.name}` : '' }}</h2>
      <p class="muted">
        Elige cómo quieres trabajar. El panel de administración (Laravel) es otra superficie;
        esta web app es la experiencia tipo app.
      </p>
    </div>

    <div class="row">
      <button class="btn" type="button" @click="open('usuario')">Modo usuario</button>
      <button
        v-if="auth.canVendedor"
        class="btn btn-soft"
        type="button"
        @click="open('vendedor')"
      >
        Modo vendedor
      </button>
      <button
        v-if="auth.canGestor"
        class="btn btn-soft"
        type="button"
        @click="open('gestor')"
      >
        Modo gestor
      </button>
    </div>
  </section>
</template>
