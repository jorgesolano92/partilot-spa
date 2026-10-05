<script setup lang="ts">
import { asset } from '@/lib/asset'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <section class="page stack">
    <div class="section-header">
      <h1 class="section-title">Modo vendedor</h1>
      <p class="section-subtitle">Consulta lo asignado, vende y revisa tus ventas.</p>
    </div>

    <div v-if="auth.seller?.entities?.length" class="entity-banner">
      <div class="entity-banner-text">
        <span class="muted">Entidades</span>
        <strong>{{ auth.seller.entities.map((e) => e.name).join(' · ') }}</strong>
      </div>
    </div>

    <div class="acciones-principales">
      <RouterLink class="accion-card participaciones-card" :to="{ name: 'vendedor-participaciones' }">
        <h3 class="card-title">Participaciones</h3>
        <p class="card-description">Controla el estado de tus tacos asignados.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/participaciones.png')" alt="" />
        </div>
      </RouterLink>
      <RouterLink class="accion-card escaner-card" :to="{ name: 'vendedor-venta' }">
        <h3 class="card-title">Vender</h3>
        <p class="card-description">Referencia, rango manual o digitales.</p>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/escaner.png')" alt="" />
        </div>
      </RouterLink>
      <RouterLink class="accion-card venta-card wide" :to="{ name: 'vendedor-ventas' }">
        <div>
          <h3 class="card-title">Mis ventas</h3>
          <p class="card-description">Historial de participaciones vendidas.</p>
        </div>
        <div class="card-illustration">
          <img class="card-image" :src="asset('assets/images/venta.png')" alt="" />
        </div>
      </RouterLink>
    </div>
  </section>
</template>
