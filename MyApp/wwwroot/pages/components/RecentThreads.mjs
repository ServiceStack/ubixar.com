import { ref, computed, onMounted, inject, nextTick } from "vue"
import { useRoute } from "vue-router"
import { threadQuery } from "../lib/utils.mjs"

export function groupThreads(threads) {
    // Sort by date (newest first)
    threads.sort((a, b) => b.createdDate - a.createdDate);

    let Today = []
    let LastWeek = []
    let Months = {}
    let Years = {}

    const groups = []

    threads.forEach(x => {
        const created = new Date(x.createdDate) // Use date property instead of id
        const now = new Date()
        const diff = now - created
        const days = diff / (1000 * 60 * 60 * 24)
        const startOfYear = new Date(new Date().getFullYear(), 0, 1)

        if (days < 1) {
            Today.push(x)
        } else if (days < 7) {
            LastWeek.push(x)
        } else if (created > startOfYear) {
            const month = created.toLocaleString('default', { month: 'long' })
            if (!Months[month]) Months[month] = []
            Months[month].push(x)
        } else {
            const year = `${created.getFullYear()}`
            if (!Years[year]) Years[year] = []
            Years[year].push(x)
        }
    })

    if (Today.length) groups.push({ title: 'Today', results: Today })
    if (LastWeek.length) groups.push({ title: 'Previous 7 Days', results: LastWeek })

    Object.keys(Months).forEach(month => {
        groups.push({ title: month, results: Months[month] })
    })
    const yearsDesc = Object.keys(Years).sort((a,b) => b.localeCompare(a))
    yearsDesc.forEach(year => {
        groups.push({ title: year, results: Years[year] })
    })
    return groups
}

export default {
    template:`
    <div v-if="store.threads.length" class="sm:w-[15rem] flex-shrink-0">
        <div v-for="group in historyGroups" class="relative">
            <h4 class="w-full pl-2 text-gray-500 dark:text-gray-400 uppercase pt-2 text-sm leading-6 font-semibold">{{group.title}}</h4>
            <div v-for="item in group.results">
                <div :class="['pl-4 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-900 group flex gap-x-3 rounded-md p-2 text-sm leading-6 justify-between',
                    item.id == $route.params.id ? 'bg-gray-50 dark:bg-gray-900 text-indigo-600 dark:text-indigo-300 font-semibold' : 'cursor-pointer text-gray-700 dark:text-gray-200',
                    dragOverThread === item.id ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-300 dark:border-blue-600' : '']"
                    @dblclick="renameThread(item)"
                    @dragover.prevent="handleDragOver($event, item)"
                    @dragleave="handleDragLeave"
                    @drop="handleDrop($event, item)">
                    <div class="md:w-64 overflow-hidden whitespace-nowrap text-ellipsis"
                        @contextmenu.prevent.stop="showThreadMenu=showThreadMenu==item.id ? null : item.id">
                        <div v-if="renameThreadId == item.id" class="flex items-center">
                            <input id="txtItemTitle" type="text" v-model="item.description" class="border rounded px-1 py-0.5 text-sm w-full"
                                @keyup.enter="renameItem(item)" @blur="renameItem(item)" />
                        </div>
                        <RouterLink v-else :to="{ path: '/generate/feed/' + item.id, query:threadQuery(route.query) }" class="flex items-center" 
                            :class="item.id != $route.params.id ? 'cursor-pointer' : 'cursor-default'"
                            :title="formatDescription(item)">
                            {{item.description}} 
                            <span class="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                {{formatCount(store.threadUnpublishedCount[item.id])}}
                            </span>
                        </RouterLink>
                    </div>
                    <div @click.stop="showThreadMenu=showThreadMenu==item.id ? null : item.id" class="cursor-pointer">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"/></svg>
                    </div>
                    <div v-if="item.id == showThreadMenu" class="absolute font-normal right-0 mt-6 mr-4 z-10 w-24 origin-top-right rounded-md bg-white dark:bg-black py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                        <div @click.stop="renameThread(item)" class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-200" role="menuitem" tabindex="-1" id="user-menu-item-0">Rename</div>
                        <div @click.stop="deleteThread(item)" class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-200" role="menuitem" tabindex="-1" id="user-menu-item-1">Delete</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    setup(props, { emit }) {
        const store = inject('store')
        const route = useRoute()
        const historyGroups = computed(() => groupThreads(store.threads))

        const showThreadMenu = ref()
        const renameThreadId = ref()
        const dragOverThread = ref(null)

        function renameThread(item) {
            renameThreadId.value = item.id
            showThreadMenu.value = null
            nextTick(() => {
                const txt = document.getElementById('txtItemTitle')
                txt?.select()
                txt?.focus()
            })
        }

        async function renameItem(item) {
            renameThreadId.value = null
            await store.updateThread(item)
            emit('save', item)
        }

        async function deleteThread(item) {
            if (confirm('Are you sure you want to delete this thread?')) {
                await store.deleteThread(item.id)
                emit('remove', item)
            }
            showThreadMenu.value = null
        }

        function handleDragOver(event, thread) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            dragOverThread.value = thread.id
        }

        function handleDragLeave() {
            dragOverThread.value = null
        }

        async function handleDrop(event, thread) {
            event.preventDefault()
            dragOverThread.value = null

            try {
                const data = JSON.parse(event.dataTransfer.getData('application/json'))
                if (data.type === 'generation' && data.generationId && data.threadId !== thread.id) {
                    // Move the generation to the target thread
                    const api = await store.moveGeneration(data.generationId, thread.id)
                    if (api.error) {
                        console.error('Failed to move generation:', api.error)
                        // You could show a toast notification here
                    }
                }
            } catch (error) {
                console.error('Error handling drop:', error)
            }
        }

        function formatCount(count) {
            return count > 0 ? ` (${count})` : ''
        }
        function formatDescription(thread) {
            const count = store.threadUnpublishedCount[thread.id] || 0
            return thread.description + (count > 0 ? ` - ${count} unpublished generations` : '') 
        }

        return {
            store,
            route,
            showThreadMenu,
            renameThreadId,
            dragOverThread,
            historyGroups,
            formatCount,
            formatDescription,
            renameThread,
            deleteThread,
            renameItem,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            threadQuery,
        }
    }
}
