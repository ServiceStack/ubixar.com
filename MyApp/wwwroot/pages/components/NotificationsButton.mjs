import { computed, inject, onMounted, onUnmounted, ref, watch, nextTick } from "vue"
import { humanify } from "@servicestack/client"
import { useUtils } from "@servicestack/vue"
import { formatDate, rule1 } from "../lib/utils.mjs"
import { NotificationType } from "../../mjs/dtos.mjs"

const { transition } = useUtils()

const NotificationsMenu = {
    template:`
  <div :class="[transition1,'absolute top-12 right-0 z-20 mt-1 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none w-[26rem] sm:w-[30rem]']" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
    <div class="py-1 px-2 bg-gray-50 dark:bg-gray-900 flex justify-between text-sm items-center border-b border-gray-200 dark:border-gray-700">
    <span class="py-1">
        <svg class="inline-block mr-1 size-4 " xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7v3.528a1 1 0 0 1-.105.447l-1.717 3.433A1.1 1.1 0 0 0 4.162 18h15.676a1.1 1.1 0 0 0 .984-1.592l-1.716-3.433a1 1 0 0 1-.106-.447V9a7 7 0 0 0-7-7m0 19a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 12 21"/></g></svg>
        Notifications
    </span>
    </div>
    <div class="max-h-[20rem] overflow-auto" role="none">
      <ul>
        <li v-for="entry in filteredResults" :key="entry.title">
          <div class="py-2 px-2 text-sm flex justify-between font-semibold border-b border-gray-300 dark:border-gray-600">
            <span class="">{{entry.title}}</span>
          </div>
          <div @click.stop v-for="item in entry.results" class="pr-2 py-2 text-sm hover:bg-indigo-100 dark:hover:bg-indigo-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 truncate" 
               @click="store.goto(item.href ?? '/generations/' + item.generationId, () => $emit('done'))">
            <div class="flex justify-between font-semibold text-gray-500">
              <span class="ml-2">{{typeLabel(item.type)}}</span>
              <span>{{formatDate(item.created)}}</span>
            </div>
            <div class="px-2 mt-1 font-normal text-gray-500 dark:text-gray-400 truncate" :title="item.title">{{item.title}}</div>
            <div class="px-2 mt-2 font-normal" :title="item.summary">{{item.summary}}</div>
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

        const filteredResults = computed(() => {
            const to = []
            const results = store.info.latestNotifications ?? []
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

        function typeLabel(type) {
            return humanify(NotificationType[type]) || type
        }

        const transition1 = ref('transform opacity-0 scale-95 translate-y-0 hidden')

        watch(() => props.show, () => {
            transition(rule1, transition1, props.show)
            if (props.show) {
                store.markNotificationsAsRead()
            }
        })

        return {
            store,
            transition1,
            filteredResults,
            typeLabel,
        }
    }
}

export default {
    components: {
        NotificationsMenu,
    },
    template: `
      <div @click="toggle(!show)">
        <svg class="w-6 h-6 cursor-pointer text-gray-400 group-hover:text-gray-500 dark:group-hover:text-sky-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14v-3h-3q-.75.95-1.787 1.475T12 18q-1.175 0-2.212-.525T8 16H5zm7-3q.95 0 1.725-.55T14.8 14H19V5H5v9h4.2q.3.9 1.075 1.45T12 16m-7 3h14z"/></svg>
        <svg id="new-notifications" :class="['absolute right-1 top-1 h-4 w-4', store.info?.hasUnreadNotifications ? 'text-red-500' : 'text-transparent']" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="currentColor"/></svg>
        <NotificationsMenu :show="show" @done="toggle(false)" />
      </div>
    `,
    setup() {
        const store = inject('store')
        const events = inject('events')
        const show = ref(false)

        function toggle(open) {
            console.log(`NotificationsMenu.toggle(${open})`)
            events.publish('closeWindow')
            show.value = open
        }

        let sub = null
        onMounted(() => {
            sub = events.subscribe('closeWindow', () => {
                console.log('NotificationsMenu.closeWindow')
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