<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <section class="card stack">
    <div>
      <h2>Modo vendedor</h2>
      <p class="muted">
        Como en la app: consulta lo asignado, vende por referencia y revisa tus ventas. Sin cobro en
        esta vertical.
      </p>
    </div>

    <p v-if="auth.seller?.entities?.length" class="muted tiny">
      Entidades:
      {{ auth.seller.entities.map((e) => e.name).join(' · ') }}
    </p>

    <div class="action-grid">
      <RouterLink class="action-card" :to="{ name: 'vendedor-participaciones' }">
        <h3>Participaciones</h3>
        <p>Controla el estado de tus tacos asignados.</p>
      </RouterLink>
      <RouterLink class="action-card" :to="{ name: 'vendedor-venta' }">
        <h3>Vender</h3>
        <p>Introduce la referencia del QR: disponible → confirmar venta.</p>
      </RouterLink>
      <RouterLink class="action-card wide" :to="{ name: 'vendedor-ventas' }">
        <div>
          <h3>Mis ventas</h3>
          <p>Historial de participaciones que has marcado como vendidas.</p>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.tiny {
  margin: 0;
  font-size: 0.85rem;
}
h2 {
  margin: 0 0 0.25rem;
}
</style>
