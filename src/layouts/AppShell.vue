<script setup lang="ts">
import { asset } from '@/lib/asset'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AppMode, UnreadCountResponse } from '@/types'
import ComprobarParticipacionPanel from '@/components/ComprobarParticipacionPanel.vue'
import SorteosPanel from '@/components/SorteosPanel.vue'

type MobileTab = 'comprobar' | 'home' | 'sorteos'

const auth = useAuthStore()
const router = useRouter()
const mobileTab = ref<MobileTab>('home')
const unreadCount = ref(0)
let unreadTimer: ReturnType<typeof setInterval> | null = null

const displayName = computed(() => {
  if (!auth.user) return 'Usuario'
  return [auth.user.name, auth.user.last_name].filter(Boolean).join(' ')
})

const showUsuarioMode = computed(() => auth.canVendedor || auth.canGestor)

async function refreshUnread() {
  if (!auth.isAuthenticated) {
    unreadCount.value = 0
    return
  }
  try {
    const { data } = await api.get<UnreadCountResponse>('/notifications/unread/count')
    unreadCount.value = data.count || 0
  } catch {
    /* silent */
  }
}

function goMode(next: AppMode) {
  mobileTab.value = 'home'
  if (next === 'gestor') {
    auth.enterGestorMode()
    if (auth.managerEntities.length > 1) {
      router.push({ name: 'gestor-entidad' })
      return
    }
    router.push({ name: 'gestor-participaciones' })
    return
  }
  auth.setMode(next)
  router.push({ name: next })
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

watch(
  () => auth.isAuthenticated,
  (ok) => {
    if (ok) void refreshUnread()
    else unreadCount.value = 0
  },
)

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && auth.isAuthenticated) {
    void auth.refresh()
    void refreshUnread()
  }
}

onMounted(() => {
  void refreshUnread()
  unreadTimer = setInterval(() => {
    void refreshUnread()
  }, 60000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="shell">
    <header class="top">
      <div class="brand-block">
        <RouterLink class="brand" to="/">
          <img :src="asset('assets/logo_menu.svg')" alt="Partilot" class="brand-logo" />
        </RouterLink>
      </div>
      <div class="top-right">
        <RouterLink
          class="bell"
          :to="{ name: 'usuario-notificaciones' }"
          title="Notificaciones"
          aria-label="Notificaciones"
        >
          <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
            <path d="M427 168.8A178.45 178.45 0 0 0 256 64C147.45 64 59.6 147.8 49.59 254.5A16 16 0 0 0 65.49 272h30.1a14 14 0 0 0 13.96-13.29A145 145 0 0 1 256 96a145.53 145.53 0 0 1 146.2 162.64 14 14 0 0 0 13.95 13.36h30.1a16 16 0 0 0 15.49-17.32zM441.33 289.6A16 16 0 0 0 427 272H85a16 16 0 0 0-14.33 17.6C80.51 370.57 157.07 448 256 448s175.49-77.43 185.33-158.4z"/>
          </svg>
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </RouterLink>
        <RouterLink class="btn btn-ghost tiny-link" :to="{ name: 'usuario-perfil' }">Perfil</RouterLink>
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
        v-if="showUsuarioMode"
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
        <img
          :src="mobileTab === 'comprobar' ? asset('assets/menu/escaner_s.svg') : asset('assets/menu/escaner.svg')"
          alt=""
          class="tab-icon"
        />
        <span>Comprobar</span>
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mobileTab === 'home' }"
        @click="mobileTab = 'home'"
      >
        <img
          :src="mobileTab === 'home' ? asset('assets/menu/home_s.svg') : asset('assets/menu/home.svg')"
          alt=""
          class="tab-icon"
        />
        <span>Home</span>
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mobileTab === 'sorteos' }"
        @click="mobileTab = 'sorteos'"
      >
        <img
          :src="mobileTab === 'sorteos' ? asset('assets/menu/sorteos_s.svg') : asset('assets/menu/sorteos.svg')"
          alt=""
          class="tab-icon"
        />
        <span>Sorteos</span>
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
.brand-block {
  display: flex;
  align-items: center;
}
.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
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
.bell {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  text-decoration: none;
  color: var(--ink);
}
.bell svg {
  display: block;
}
.tiny-link {
  padding: 0.4rem 0.75rem;
  text-decoration: none;
  font-size: 0.85rem;
  color: var(--ink);
}
.badge {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  line-height: 1;
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
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.mode {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  cursor: pointer;
  font-weight: 600;
  color: var(--muted);
}
.mode.active {
  background: var(--primary);
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
  background: transparent;
  box-shadow: none;
  border: none;
  padding: 0;
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
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(14px + env(safe-area-inset-bottom));
    z-index: 20;
    width: min(92%, 420px);
    background: var(--tab-bar);
    border-radius: 50px;
    padding: 8px 10px;
    justify-content: space-around;
    gap: 0.35rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
  }
  .tab {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.35rem 0.25rem;
    font-weight: 600;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    border-radius: 999px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    min-height: 58px;
  }
  .tab-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .tab.active {
    color: var(--ink);
    background: #fff;
    min-width: 64px;
    max-width: 64px;
    min-height: 64px;
    max-height: 64px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }
  .tab span {
    line-height: 1.1;
    white-space: nowrap;
  }
}
</style>
