<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { money } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { EntityRef, TacoItem, TacoSummary, TacosResponse } from '@/types'

const auth = useAuthStore()
const entities = ref<EntityRef[]>([...(auth.seller?.entities ?? [])])
const entityId = ref<number | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const summary = ref<TacoSummary | null>(null)
const tacos = ref<TacoItem[]>([])

async function ensureEntities() {
  if (entities.value.length) return
  try {
    const { data } = await api.get<{ success: boolean; entities: EntityRef[] }>('/sellers/me/entities')
    entities.value = data.entities || []
  } catch {
    /* keep empty */
  }
}

async function load() {
  if (!entityId.value) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<TacosResponse>('/sellers/me/tacos', {
      params: { entity_id: entityId.value },
    })
    summary.value = data.summary ?? null
    tacos.value = data.tacos || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'No se pudieron cargar las participaciones.'
    summary.value = null
    tacos.value = []
  } finally {
    loading.value = false
  }
}

watch(entityId, () => {
  void load()
})

onMounted(async () => {
  await ensureEntities()
  if (entities.value.length) {
    entityId.value = entities.value[0].id
  }
})
</script>

<template>
  <section class="card stack">
    <RouterLink class="back-link" :to="{ name: 'vendedor' }">← Volver a vendedor</RouterLink>
    <div>
      <h2>Mis participaciones</h2>
      <p class="muted">Tacos asignados por entidad (como en la app).</p>
    </div>

    <label v-if="entities.length > 1" class="field">
      <span>Entidad</span>
      <select v-model.number="entityId">
        <option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}</option>
      </select>
    </label>
    <p v-else-if="entities.length === 1" class="muted">Entidad: {{ entities[0].name }}</p>
    <p v-else class="muted">No hay entidades asociadas a este vendedor.</p>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="summary" class="summary-strip">
      <div class="summary-chip">
        <strong>{{ summary.available_participations }}</strong>
        <span>Disponibles</span>
      </div>
      <div class="summary-chip">
        <strong>{{ summary.sales_registered }}</strong>
        <span>Vendidas</span>
      </div>
      <div class="summary-chip">
        <strong>{{ money(summary.available_amount) }}</strong>
        <span>Importe disp.</span>
      </div>
    </div>

    <article v-for="t in tacos" :key="`${t.set_id}-${t.book_number}`" class="taco">
      <div>
        <strong>{{ t.lottery_name || t.set_name || 'Set' }}</strong>
        <p class="muted">{{ t.participations_range }}</p>
      </div>
      <div class="meta">
        <span>{{ t.available_participations }} disp.</span>
        <span>{{ t.sales_registered }} vend.</span>
        <span>{{ money(t.available_amount) }}</span>
      </div>
    </article>

    <p v-if="!loading && entityId && !tacos.length && !error" class="muted">
      No hay tacos asignados en esta entidad.
    </p>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.25rem;
}
.taco {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  background: #fff;
}
.taco p {
  margin: 0.15rem 0 0;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.85rem;
  color: var(--muted);
  white-space: nowrap;
}
</style>
