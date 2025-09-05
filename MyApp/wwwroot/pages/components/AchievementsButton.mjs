import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { humanify } from "@servicestack/client"
import { useUtils } from "@servicestack/vue"
import { formatDate, rule1 } from "../lib/utils.mjs"
import { AchievementType } from "../../mjs/dtos.mjs"

const { transition } = useUtils()

const AchievementsMenu = {
    template: `
<div :class="[transition1,'absolute top-12 right-0 z-20 mt-1 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none w-[26rem] sm:w-[30rem]']" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
    <div class="py-1 px-2 bg-gray-50 dark:bg-gray-900 flex justify-between text-sm items-center border-b border-gray-200 dark:border-gray-700">
        <span class="py-1">
            <svg class="inline-block mr-1 size-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M18 5.062V3H6v2.062H2V8c0 2.525 1.889 4.598 4.324 4.932A6 6 0 0 0 11 16.91V18a2 2 0 0 1-2 2H8v2h8v-2h-1a2 2 0 0 1-2-2v-1.09a6 6 0 0 0 4.676-3.978C20.111 12.598 22 10.525 22 8V5.062zM4 8v-.938h2v3.766A3 3 0 0 1 4 8m16 0a3.01 3.01 0 0 1-2 2.829V7.062h2z"/></svg>
            Achievements
        </span>
    </div>
  <div class="max-h-[20rem] overflow-auto" role="none">
    <ul>
        <li v-for="entry in filteredResults" :key="entry.title">
            <div class="py-2 px-2 text-sm flex justify-between font-semibold border-b border-gray-300 dark:border-gray-600">
                <span class="">{{entry.title}}</span>
            </div>
            <div @click.stop v-for="item in entry.results" class="pr-2 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 truncate" 
                 @click="store.goto(item.href ?? '/generations/' + item.generationId, () => $emit('done'))">
                <b v-if="item.score > 0" class="mr-2 text-sm inline-block w-10 text-right text-green-600">+{{item.score}}</b>
                <b v-else-if="item.score < 0" class="mr-2 inline-block w-10 text-right text-red-600">-{{item.score}}</b>
                <span class="text-xs font-normal truncate" :title="achievementTitle(item)">{{achievementTitle(item)}}</span>
                <span v-if="item.title" class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {{item.title}}
                </span>
            </div>
        </li>
        <li v-if="!filteredResults.length">
            <div class="px-2 py-2 text-xs font-normal text-gray-500">empty</div>
        </li>
    </ul>
  </div>
</div> 
  `,
    emits: ['done'],
    props: {
        show: Boolean,
    },
    setup(props, { emit }) {
        const store = inject('store')
        
        function achievementTitle(item) {
            return humanify(AchievementType[item.type])
        }
        
        function generationTitle(item) {
            if (item.generationTitle) return item.generationTitle
            return '#' + item.generationId.substring(0,4)
        }

        const filteredResults = computed(() => {
            const to = []
            const results = store.info.latestAchievements ?? []
            const sevenDaysAgo = new Date() - 7 * 24 * 60 * 60 * 1000
            const last7days = results.filter(x => new Date(x.created) >= sevenDaysAgo)
            if (last7days.length > 0) {
                to.push({title: 'Last 7 days', results: last7days})
            }
            const thirtyDaysAgo = new Date() - 30 * 24 * 60 * 60 * 1000
            const last30days = results.filter(x => new Date(x.created) >= thirtyDaysAgo && !last7days.includes(x))
            if (last30days.length > 0) {
                to.push({title: 'Last 30 days', results: last30days})
            }
            const title = last7days.length + last30days.length === 0 ? 'All time' : 'Older'
            const remaining = results.filter(x => !last7days.includes(x) && !last30days.includes(x))
            if (remaining.length > 0) {
                to.push({ title, results: remaining })
            }
            return to
        })

        const transition1 = ref('transform opacity-0 scale-95 translate-y-0 hidden')
        
        watch(() => props.show, () => {
            transition(rule1, transition1, props.show)
            if (props.show) {
                store.markAchievementsAsRead()
            }
        })

        return {
            store,
            transition1, 
            filteredResults, 
            formatDate, 
            achievementTitle,
            generationTitle,
        }
    }
}

export default {
    components: {
        AchievementsMenu,
    },
    template: `
      <div @click="toggle(!show)">
        <svg class="w-6 h-6 cursor-pointer text-gray-400 group-hover:text-gray-500 dark:group-hover:text-sky-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8 3h8v8h6v10H2V9h6zm2 16h4V5h-4zm6 0h4v-6h-4zm-8 0v-8H4v8z"/></svg>
        <svg id="new-achievements" :class="['absolute right-1 top-1 h-4 w-4', store.info?.hasUnreadAchievements ? 'text-red-500' : 'text-transparent']" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="currentColor"/></svg>
        <AchievementsMenu :show="show" @done="toggle(false)" />
      </div>
    `,
    setup() {
        const store = inject('store')
        const events = inject('events')
        const show = ref(false)
        
        function toggle(open) {
            console.log(`AchievementsMenu.toggle(${open})`)
            events.publish('closeWindow')
            show.value = open
        }

        let sub = null
        onMounted(() => {
            sub = events.subscribe('closeWindow', () => {
                console.log('AchievementsMenu.closeWindow')
                show.value = false
            })
        })
        onUnmounted(() => {
            sub?.unsubscribe()
        })
        
        return {
            store,
            show,
            toggle,
        }
    }
}