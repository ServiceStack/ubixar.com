import { inject, onMounted, onUnmounted, ref, nextTick, computed } from "vue"
import { useClient } from "@servicestack/vue"
import { formatDate, humanifyNumber } from "../lib/utils.mjs"
import { MyCreditHistory } from "../../mjs/dtos.mjs";

export default {
    template:`
    <div class="mt-2 space-y-1">
      <p class="m-2 text-sm text-gray-500 dark:text-gray-400">
        Get unlimited generations by
        <RouterLink :to="{query:{tab:'devices'}}" class="text-blue-500 dark:text-blue-400 hover:underline">
          adding your NVIDIA GPU
        </RouterLink>
        to the
        <RouterLink :to="{query:{tab:'pool'}}" class="text-blue-500 dark:text-blue-400 hover:underline">
          Device Pool
        </RouterLink>
      </p>

      <!-- Grouped credit history -->
      <div v-for="group in groupedResults" :key="group.key" class="space-y-1">
        <div class="sticky top-0 bg-white dark:bg-gray-900 py-2 px-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
             @click="toggleGroup(group.key)">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200"
                   :class="{ 'rotate-90': !isGroupCollapsed(group.key) }"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ group.label }}</h3>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">({{ group.logs.length }})</span>
          </div>
        </div>
        <div v-if="!isGroupCollapsed(group.key)" class="space-y-1">
          <div v-for="log in group.logs" :key="log.createdDate" :title="formatDate(new Date(log.createdDate)) + ' ' + log.description"
               class="flex items-center justify-between space-x-2 text-sm py-1 rounded bg-gray-50 dark:bg-gray-800/50 mx-2"
               :class="{'cursor-pointer': !!log.refId }"
               @click="log.refId ? store.goto('/generations/' + log.refId) : null">
                <span class="font-mono font-semibold inline-block w-12 text-right" :class="{'text-green-600 dark:text-green-400': log.credits > 0, 'text-red-600 dark:text-red-400': log.credits < 0, 'text-gray-600 dark:text-gray-400': log.credits === 0}">
                  {{log.credits > 0 ? '+' : ''}}{{humanifyNumber(log.credits)}}
                </span>
                <span class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {{log.description}}
                </span>
          </div>
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="loading" class="flex justify-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>

      <!-- Intersection observer target -->
      <div ref="loadMoreTrigger" class="h-1"></div>
    </div>
    `,
    setup() {
        const store = inject('store')
        const client = useClient()
        const results = ref([])
        const loading = ref(false)
        const hasMore = ref(true)
        const loadMoreTrigger = ref(null)
        const observer = ref(null)
        const collapsedGroups = ref(new Set())

        const pageSize = 50
        let currentOffset = 0

        // Date grouping helper functions
        function getDateGroup(dateStr) {
            const date = new Date(dateStr)
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

            const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

            if (logDate.getTime() === today.getTime()) {
                return { key: 'today', label: 'Today', order: 0 }
            } else if (logDate.getTime() === yesterday.getTime()) {
                return { key: 'yesterday', label: 'Yesterday', order: 1 }
            } else if (logDate >= sevenDaysAgo) {
                return { key: 'last7days', label: 'Last 7 days', order: 2 }
            } else if (logDate >= thirtyDaysAgo) {
                return { key: 'last30days', label: 'Last 30 days', order: 3 }
            } else {
                const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                const yearMonth = date.getFullYear() * 100 + date.getMonth() // For sorting
                return { key: `month-${yearMonth}`, label: monthYear, order: 1000 - yearMonth }
            }
        }

        // Toggle group collapse state
        const toggleGroup = (groupKey) => {
            if (collapsedGroups.value.has(groupKey)) {
                collapsedGroups.value.delete(groupKey)
            } else {
                collapsedGroups.value.add(groupKey)
            }
            // Trigger reactivity
            collapsedGroups.value = new Set(collapsedGroups.value)
            // Trigger loadMore to refresh data on collapse
            setTimeout(loadMore, 100)
        }

        // Check if group is collapsed
        const isGroupCollapsed = (groupKey) => {
            return collapsedGroups.value.has(groupKey)
        }

        // Computed property for grouped results
        const groupedResults = computed(() => {
            const groups = {}

            results.value.forEach(log => {
                const group = getDateGroup(log.createdDate)
                if (!groups[group.key]) {
                    groups[group.key] = {
                        key: group.key,
                        label: group.label,
                        order: group.order,
                        logs: []
                    }
                }
                groups[group.key].logs.push(log)
            })

            // Sort groups by order and return as array
            return Object.values(groups).sort((a, b) => a.order - b.order)
        })

        const loadMore = async () => {
            // console.log('loadMore', currentOffset, loading.value, hasMore.value)
            if (loading.value || !hasMore.value) return

            loading.value = true
            try {
                const api = await client.api(new MyCreditHistory({
                    skip: currentOffset,
                    take: pageSize,
                    orderBy: '-id',
                    include: 'total',
                }))

                const newResults = api.response?.results ?? []
                const total = api.response?.total ?? 0

                if (newResults.length > 0) {
                    results.value.push(...newResults)
                    currentOffset += newResults.length
                    hasMore.value = currentOffset < total
                } else {
                    hasMore.value = false
                }

                // console.log('loadMore', newResults.length, results.value.length, 'of', total, 'total')
                
            } catch (error) {
                console.error('Error loading more credit history:', error)
            } finally {
                loading.value = false
            }
        }

        const setupIntersectionObserver = () => {
            if (!loadMoreTrigger.value) return

            observer.value = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0]
                    if (entry.isIntersecting && hasMore.value && !loading.value) {
                        loadMore()
                    }
                },
                {
                    rootMargin: '100px' // Start loading when trigger is 100px from viewport
                }
            )

            observer.value.observe(loadMoreTrigger.value)
        }

        onMounted(async () => {
            // Load initial data
            loading.value = true
            try {
                const api = await client.api(new MyCreditHistory({
                    skip: currentOffset,
                    take: pageSize,
                    orderBy: '-id',
                    include: 'total',
                }))

                const initialResults = api.response?.results ?? []
                const total = api.response?.total ?? 0

                if (initialResults.length > 0) {
                    results.value = initialResults
                    currentOffset = initialResults.length
                    hasMore.value = currentOffset < total
                } else {
                    hasMore.value = false
                }
            } catch (error) {
                console.error('Error loading initial credit history:', error)
            } finally {
                loading.value = false
            }

            // Setup intersection observer after DOM is ready
            await nextTick()
            setupIntersectionObserver()
        })

        onUnmounted(() => {
            if (observer.value) {
                observer.value.disconnect()
            }
        })

        return {
            store,
            results,
            groupedResults,
            loading,
            loadMoreTrigger,
            toggleGroup,
            isGroupCollapsed,
            formatDate,
            humanifyNumber,
        }
    }
}