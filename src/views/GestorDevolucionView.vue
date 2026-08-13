<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div>
      <h2>Devolución</h2>
      <p class="muted">
        En la app el gestor gestiona devoluciones de vendedores. La devolución a administración del
        <strong>gestor responsable</strong> se hace en el panel Laravel.
      </p>
    </div>

    <div class="info">
      <p>
        Entidad activa:
        <strong>{{ auth.activeEntity?.name || '—' }}</strong>
      </p>
      <p v-if="auth.activeEntity?.is_primary">
        Eres gestor responsable: usa el panel de administración para devolver a la administración.
      </p>
      <p v-else>
        Como gestor normal, la devolución operativa de vendedores llegará aquí en la siguiente
        vertical (flujo con acción previa, sin escáner genérico).
      </p>
    </div>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.info {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: #fff;
}
.info p {
  margin: 0 0 0.55rem;
}
.info p:last-child {
  margin-bottom: 0;
}
</style>
