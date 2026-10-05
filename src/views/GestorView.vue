<script setup lang="ts">
import { asset } from '@/lib/asset'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function changeEntity() {
  auth.setActiveEntity(null)
  router.push({ name: 'gestor-entidad' })
}
</script>

<template>
  <section class="page stack">
    <div class="section-header">
      <h1 class="section-title">Modo gestor</h1>
      <p class="section-subtitle">Elige la acción que quieres realizar.</p>
    </div>

    <div v-if="auth.activeEntity" class="entity-banner">
      <div class="entity-banner-text">
        <span class="muted">Entidad activa</span>
        <strong>{{ auth.activeEntity.name }}</strong>
      </div>
      <span v-if="auth.activeEntity.is_primary" class="pill-badge">Responsable</span>
      <button
        v-if="auth.managerEntities.length > 1"
        class="btn-outline"
        type="button"
        @click="changeEntity"
      >
        Cambiar
      </button>
    </div>

    <div class="acciones-principales">
      <RouterLink class="accion-card participaciones-card" :to="{ name: 'gestor-participaciones' }">
        <h3 class="card-title">Participaciones</h3>
        <p class="card-description">Estado de los tacos de la entidad.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/participaciones.png')" alt="" />
        </div>
      </RouterLink>
      <RouterLink class="accion-card vendedores-card" :to="{ name: 'gestor-vendedores' }">
        <h3 class="card-title">Vendedores</h3>
        <p class="card-description">Lista y liquidaciones pendientes.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/vendedores.png')" alt="" />
        </div>
      </RouterLink>
      <RouterLink class="accion-card devolucion-card" :to="{ name: 'gestor-devolucion' }">
        <h3 class="card-title">Devolución</h3>
        <p class="card-description">Devolver participaciones de vendedores a la entidad.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/devolucion.png')" alt="" />
        </div>
      </RouterLink>
      <RouterLink class="accion-card pago-card" :to="{ name: 'gestor-pago' }">
        <h3 class="card-title">Pago</h3>
        <p class="card-description">Validar premio físico y registrar pago presencial.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/pago.png')" alt="" />
        </div>
      </RouterLink>
    </div>
  </section>
</template>
