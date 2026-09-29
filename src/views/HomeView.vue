<script setup lang="ts">
import { asset } from '@/lib/asset'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function open(mode: 'usuario' | 'vendedor' | 'gestor') {
  if (mode === 'gestor') {
    auth.enterGestorMode()
    router.push({
      name: auth.managerEntities.length > 1 ? 'gestor-entidad' : 'gestor-participaciones',
    })
    return
  }
  auth.setMode(mode)
  router.push({ name: mode })
}
</script>

<template>
  <section class="page stack">
    <div class="section-header">
      <h1 class="section-title">Hola{{ auth.user ? `, ${auth.user.name}` : '' }}</h1>
      <p class="section-subtitle">Elige cómo quieres trabajar hoy.</p>
    </div>

    <div class="tutorial-card">
      <img :src="asset('assets/images/play.png')" alt="" />
      <h4>¿Primera vez aquí?</h4>
      <p>Usa los modos de abajo o el selector superior para cambiar entre usuario, vendedor y gestor.</p>
    </div>

    <div class="acciones-principales">
      <button class="accion-card cartera-card" type="button" @click="open('usuario')">
        <h3 class="card-title">Usuario</h3>
        <p class="card-description">Cartera, cobros, historial y notificaciones.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/cartera.png')" alt="" />
        </div>
      </button>
      <button
        v-if="auth.canVendedor"
        class="accion-card escaner-card"
        type="button"
        @click="open('vendedor')"
      >
        <h3 class="card-title">Vendedor</h3>
        <p class="card-description">Participaciones, venta y mis ventas.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/escaner.png')" alt="" />
        </div>
      </button>
      <button
        v-if="auth.canGestor"
        class="accion-card participaciones-card wide"
        type="button"
        @click="open('gestor')"
      >
        <div>
          <h3 class="card-title">Gestor</h3>
          <p class="card-description">Participaciones, vendedores, devolución y pago.</p>
        </div>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/participaciones.png')" alt="" />
        </div>
      </button>
    </div>
  </section>
</template>
