<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (auth.managerEntities.length === 1) {
    auth.setActiveEntity(auth.managerEntities[0].id)
    auth.setMode('gestor')
    router.replace({ name: 'gestor-participaciones' })
  }
})

function pick(entityId: number) {
  auth.setActiveEntity(entityId)
  auth.setMode('gestor')
  router.push({ name: 'gestor' })
}
</script>

<template>
  <section class="page stack">
    <div class="section-header">
      <h1 class="section-title">¿De qué entidad?</h1>
      <p class="section-subtitle">
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
  border: 1px solid #dfe4eb;
  background: #fff;
  border-radius: 16px;
  padding: 1rem 1.1rem;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(10, 20, 40, 0.08);
}
.entity-btn:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
</style>
