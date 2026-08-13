<script setup lang="ts">
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
  <section class="card stack">
    <div>
      <h2>Modo gestor</h2>
      <p class="muted">
        Sin escáner genérico: elige la acción. La devolución a administración del gestor responsable
        sigue en el panel Laravel.
      </p>
    </div>

    <div v-if="auth.activeEntity" class="entity-box">
      <div class="entity-text">
        <span class="muted">Entidad activa</span>
        <strong>{{ auth.activeEntity.name }}</strong>
      </div>
      <span v-if="auth.activeEntity.is_primary" class="badge">Responsable</span>
      <button
        v-if="auth.managerEntities.length > 1"
        class="btn btn-ghost"
        type="button"
        @click="changeEntity"
      >
        Cambiar
      </button>
    </div>

    <div class="action-grid">
      <RouterLink class="action-card" :to="{ name: 'gestor-participaciones' }">
        <h3>Participaciones</h3>
        <p>Estado de los tacos de la entidad.</p>
      </RouterLink>
      <RouterLink class="action-card" :to="{ name: 'gestor-vendedores' }">
        <h3>Vendedores</h3>
        <p>Lista y liquidaciones pendientes.</p>
      </RouterLink>
      <RouterLink class="action-card" :to="{ name: 'gestor-devolucion' }">
        <h3>Devolución</h3>
        <p>Devoluciones de vendedores (app) y a administración (panel).</p>
      </RouterLink>
      <RouterLink class="action-card" :to="{ name: 'gestor-pago' }">
        <h3>Pago</h3>
        <p>Pagos de participaciones físicas (próximo).</p>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.entity-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--accent-soft);
  border-radius: 12px;
}
.entity-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-right: auto;
}
.badge {
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
}
</style>
