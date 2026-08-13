<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLotteriesStore } from '@/stores/lotteries'

const lotteries = useLotteriesStore()
const expandedId = ref<number | null>(null)

onMounted(() => {
  void lotteries.load()
})

function toggle(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <aside class="panel card stack">
    <div>
      <h2>Sorteos</h2>
      <p class="muted">Resultados recientes (pestaña Sorteos de la app).</p>
    </div>

    <p v-if="lotteries.loading" class="muted">Cargando sorteos…</p>
    <p v-else-if="lotteries.error" class="error">{{ lotteries.error }}</p>
    <p v-else-if="!lotteries.items.length" class="muted">No hay sorteos con resultados.</p>

    <ul v-else class="list">
      <li
        v-for="item in lotteries.items"
        :key="item.id"
        class="item"
        :class="{ open: expandedId === item.id }"
      >
        <button type="button" class="item-btn" @click="toggle(item.id)">
          <strong>{{ item.name }}</strong>
          <span class="muted date">{{ item.dateLabel }}</span>
          <span class="prizes">
            1º {{ item.firstPrize }}
            <span class="sep">·</span>
            2º {{ item.secondPrize }}
          </span>
        </button>
        <div v-if="expandedId === item.id && item.reintegros.length" class="extra muted">
          Reintegros: {{ item.reintegros.join(', ') }}
        </div>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.panel {
  height: 100%;
  min-height: 0;
  overflow: auto;
}
h2 {
  margin: 0 0 0.2rem;
  font-size: 1.1rem;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.item {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}
.item.open {
  border-color: var(--accent);
}
.item-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
}
.date {
  font-size: 0.8rem;
}
.prizes {
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.sep {
  color: var(--muted);
  font-weight: 500;
}
.extra {
  padding: 0 0.8rem 0.7rem;
  font-size: 0.82rem;
}
</style>
