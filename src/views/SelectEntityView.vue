<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function pick(entityId: number) {
  auth.setActiveEntity(entityId)
  auth.setMode('gestor')
  router.push({ name: 'gestor' })
}
</script>

<template>
  <section class="card stack">
    <div>
      <h2>¿De qué entidad?</h2>
      <p class="muted">
        Vas a trabajar como gestor. Elige la entidad; todo lo que hagas usará este contexto hasta
        que lo cambies.
      </p>
    </div>

    <button
      v-for="entity in auth.managerEntities"
      :key="entity.id"
      class="entity-btn"
      type="button"
      @click="pick(entity.id)"
    >
      <strong>{{ entity.name }}</strong>
      <span class="muted">{{ entity.is_primary ? 'Gestor responsable' : 'Gestor' }}</span>
    </button>
  </section>
</template>

<style scoped>
.entity-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  cursor: pointer;
}
.entity-btn:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
</style>
