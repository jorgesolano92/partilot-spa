<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AppMode } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const displayName = computed(() => {
  if (!auth.user) return 'Usuario'
  return [auth.user.name, auth.user.last_name].filter(Boolean).join(' ')
})

function goMode(next: AppMode) {
  if (next === 'gestor') {
    auth.enterGestorMode()
    if (auth.managerEntities.length > 1) {
      router.push({ name: 'gestor-entidad' })
      return
    }
    router.push({ name: 'gestor' })
    return
  }
  auth.setMode(next)
  router.push({ name: next })
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="shell">
    <header class="top">
      <div>
        <RouterLink class="brand" to="/">Partilot</RouterLink>
        <p class="muted tiny">Web app · usuario / vendedor / gestor</p>
      </div>
      <div class="top-right">
        <div class="who">
          <strong>{{ displayName }}</strong>
          <span v-if="auth.mode === 'gestor' && auth.activeEntity" class="muted tiny">
            {{ auth.activeEntity.name }}
          </span>
        </div>
        <button class="btn btn-ghost" type="button" @click="logout">Salir</button>
      </div>
    </header>

    <nav class="modes">
      <button
        class="mode"
        :class="{ active: auth.mode === 'usuario' }"
        type="button"
        @click="goMode('usuario')"
      >
        Usuario
      </button>
      <button
        v-if="auth.canVendedor"
        class="mode"
        :class="{ active: auth.mode === 'vendedor' }"
        type="button"
        @click="goMode('vendedor')"
      >
        Vendedor
      </button>
      <button
        v-if="auth.canGestor"
        class="mode"
        :class="{ active: auth.mode === 'gestor' }"
        type="button"
        @click="goMode('gestor')"
      >
        Gestor
      </button>
    </nav>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
}
.top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.brand {
  font-size: 1.45rem;
  font-weight: 800;
  text-decoration: none;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.tiny {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
}
.top-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.who {
  text-align: right;
  display: flex;
  flex-direction: column;
}
.modes {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
  flex-wrap: wrap;
}
.mode {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  cursor: pointer;
  font-weight: 600;
}
.mode.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.main {
  min-height: 50vh;
}
</style>
