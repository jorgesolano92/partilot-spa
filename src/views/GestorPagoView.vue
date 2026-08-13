<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'gestor' }">← Volver a gestor</RouterLink>
    <div>
      <h2>Pago</h2>
      <p class="muted">
        Control de pagos de participaciones físicas de
        {{ auth.activeEntity?.name || 'la entidad' }}.
      </p>
    </div>
    <div class="info">
      <p>
        Esta vertical se conectará al flujo de pago del gestor (validar premio físico y registrar
        pago), igual que en la app. De momento el cobro online de usuario sigue fuera de alcance.
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
  margin: 0;
}
</style>
