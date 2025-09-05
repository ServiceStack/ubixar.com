import { computed } from "vue"

export default {
    template:`
    <div class="h-full flex flex-col bg-white dark:bg-gray-900">
        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Python Pip Packages</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ totalPackages }} packages
                </div>
            </div>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
            <div v-if="totalPackages" class="space-y-4">
                <div v-for="pkg in device.installedPip" :key="pkg" class="flex flex-col bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label>{{ pkg }}</label>
                </div>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                No additional python packages installed
            </div>
        </div>
    </div>        
    `,
    props: {
        device: Object,
    },
    setup(props) {
        const totalPackages = computed(() => props.device.installedPip?.length || 0)
        
        return {
            totalPackages,
        }
    }
}
