import { inject, onMounted, ref, watch } from "vue"
import Feed from "./Feed.mjs"
import DevicePool from "./DevicePool.mjs"
import MyDevices from "./MyDevices.mjs"
import MyCreditHistory from "./MyCreditHistory.mjs"

export default {
    components: {
        Feed,
        DevicePool,
        MyDevices,
        MyCreditHistory,
    },
    template:`
    <div class="mt-2">
        <div class="dark:bg-gray-800 pl-2">
          <div>
            <div class="grid grid-cols-1 sm:hidden">
              <!-- Use an "onChange" listener to redirect the user to the selected tab URL. -->
              <select aria-label="Select a tab" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white dark:bg-gray-800 py-2 pr-8 pl-3 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-400">
                <option v-for="tab in tabs" :key="tab.name" :selected="tab.current">{{ tab.name }}</option>
              </select>
              <svg class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414" clip-rule="evenodd"/></svg>
            </div>
            <div class="hidden sm:block">
              <nav class="flex space-x-4" aria-label="Tabs">
                <RouterLink v-for="tab in tabs" :key="tab.name" :to="{ query: { tab:tab.tab } }"
                    :class="[tab.tab == $route.query.tab
                    ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                    'rounded-md px-2 py-1 text-sm font-medium']" :aria-current="tab.current ? 'page' : undefined">{{ tab.name }}</RouterLink>
              </nav>
            </div>
          </div>
        </div>
        <DevicePool v-if="$route.query.tab == 'pool'" />
        <MyDevices v-else-if="$route.query.tab == 'devices'" />
        <MyCreditHistory v-else-if="$route.query.tab == 'credits'" />
        <Feed v-else @selectGeneration="$emit('selectGeneration', $event)" @retryGeneration="$emit('retryGeneration', $event)" />
    </div>
    `,
    emits:['selectWorkflow','selectGeneration','retryGeneration'],
    setup(props, { emit }) {
        const store = inject('store')
        const workflows = ref([])

        const tabs = [
            { name: 'Feed', tab: undefined },
            { name: 'Device Pool', tab: 'pool' },
            { name: 'My Devices', tab: 'devices' },
            { name: 'Credit History', tab: 'credits' },
        ]

        onMounted(async () => {
            workflows.value = await store.getWorkflows()
        })

        function selectWorkflow(workflow) {
            emit('selectWorkflow', workflow)
        }

        return {
            workflows,
            saveWorkflowArgs: selectWorkflow,
            tabs,
        }
    }
}
