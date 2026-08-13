import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import { mapLotteryCard } from '@/lib/lottery'
import type { LotteryCard, LotteryResultRaw } from '@/types'

export const useLotteriesStore = defineStore('lotteries', () => {
  const items = ref<LotteryCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<LotteryResultRaw[]>('/lottery/results')
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      items.value = (Array.isArray(data) ? data : [])
        .filter((lottery) => lottery.result)
        .filter((lottery) => {
          if (!lottery.draw_date) return false
          return new Date(lottery.draw_date) >= sixMonthsAgo
        })
        .map(mapLotteryCard)
      loaded.value = true
    } catch {
      error.value = 'No se pudieron cargar los sorteos'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, loaded, load }
})
