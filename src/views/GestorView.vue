<script setup lang="ts">
import { useRouter } from 'vue-router'
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
        Sin escáner genérico: primero eliges la acción. La devolución a administración se hace
        en el panel de administración (gestor responsable).
      </p>
    </div>

    <div v-if="auth.activeEntity" class="entity-box">
      <span class="muted">Entidad activa</span>
      <strong>{{ auth.activeEntity.name }}</strong>
      <span v-if="auth.activeEntity.is_primary" class="badge">Responsable</span>
      <button
        v-if="auth.managerEntities.length > 1"
        class="btn btn-ghost"
        type="button"
        @click="changeEntity"
      >
        Cambiar entidad
      </button>
    </div>

    <ul class="actions">
      <li>Asignar / gestionar vendedores (próximo)</li>
      <li>Consultas de stock y liquidaciones (próximo)</li>
      <li>Devolución a administración → panel Laravel</li>
    </ul>
  </section>
</template>

<style scoped>
.entity-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--accent-soft);
  border-radius: 12px;
}
.badge {
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
}
.actions {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--muted);
}
</style>
