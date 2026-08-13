<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AppMode } from '@/types'
import ComprobarParticipacionPanel from '@/components/ComprobarParticipacionPanel.vue'
import SorteosPanel from '@/components/SorteosPanel.vue'

type MobileTab = 'comprobar' | 'home' | 'sorteos'

const auth = useAuthStore()
const router = useRouter()
const mobileTab = ref<MobileTab>('home')

const displayName = computed(() => {
  if (!auth.user) return 'Usuario'
  return [auth.user.name, auth.user.last_name].filter(Boolean).join(' ')
})

function goMode(next: AppMode) {
  mobileTab.value = 'home'
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

    <div class="workspace" :class="`tab-${mobileTab}`">
      <ComprobarParticipacionPanel class="col col-side col-comprobar" />
      <main class="col col-main">
        <RouterView />
      </main>
      <SorteosPanel class="col col-side col-sorteos" />
    </div>

    <nav class="mobile-tabs" aria-label="Navegación">
      <button
        type="button"
        class="tab"
        :class="{ active: mobileTab === 'comprobar' }"
        @click="mobileTab = 'comprobar'"
      >
        Comprobar
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mobileTab === 'home' }"
        @click="mobileTab = 'home'"
      >
        Home
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mobileTab === 'sorteos' }"
        @click="mobileTab = 'sorteos'"
      >
        Sorteos
      </button>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  margin-bottom: 1rem;
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
.workspace {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}
.col {
  min-height: 520px;
  max-height: calc(100vh - 170px);
  overflow: auto;
}
.col-comprobar {
  grid-column: span 3;
}
.col-main {
  grid-column: span 6;
  min-height: 520px;
}
.col-sorteos {
  grid-column: span 3;
}
.mobile-tabs {
  display: none;
}
@media (max-width: 900px) {
  .shell {
    padding: 0.85rem 0.85rem 5.5rem;
    max-width: none;
  }
  .tiny {
    display: none;
  }
  .workspace {
    grid-template-columns: 1fr;
    flex: 1;
  }
  .col,
  .col-comprobar,
  .col-main,
  .col-sorteos {
    grid-column: 1 / -1;
    max-height: none;
    min-height: 0;
  }
  .col-side {
    display: none;
  }
  .workspace.tab-comprobar .col-comprobar {
    display: block;
  }
  .workspace.tab-comprobar .col-main,
  .workspace.tab-comprobar .col-sorteos {
    display: none;
  }
  .workspace.tab-sorteos .col-sorteos {
    display: block;
  }
  .workspace.tab-sorteos .col-main,
  .workspace.tab-sorteos .col-comprobar {
    display: none;
  }
  .mobile-tabs {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background: #fff;
    border-top: 1px solid var(--border);
    padding: 0.35rem 0.5rem calc(0.45rem + env(safe-area-inset-bottom));
    justify-content: space-around;
    gap: 0.25rem;
  }
  .tab {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.7rem 0.4rem;
    font-weight: 700;
    font-size: 0.82rem;
    color: var(--muted);
    cursor: pointer;
    border-radius: 12px;
  }
  .tab.active {
    color: var(--accent);
    background: var(--accent-soft);
  }
}
</style>
