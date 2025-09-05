import { inject, onMounted } from "vue"
import DeviceInfo from "./DeviceInfo.mjs"

export default {
    components: {
        DeviceInfo,
    },
    template:`
    <div class="p-6">
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Device Pool</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Current ComfyUI instances available in the Device Pool
            </p>
        </div>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DeviceInfo v-for="device in store.poolDevices" :device="device" @deleted="store.poolDevices = store.poolDevices.filter(x => x.id != device.id)" />
        </div>
    </div>
    `,
    setup() {
        const store = inject('store')

        onMounted(store.loadPoolDevices())

        return {
            store,
        }
    }    
}
