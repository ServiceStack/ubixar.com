import { ref, computed, inject, onMounted, onUnmounted } from "vue"
import DeviceSystemInfo from "./DeviceSystemInfo.mjs"

// Readonly view of a Device

export default {
    components: {
        DeviceSystemInfo,
    },
    template: `
      <div class="fixed cursor-zoom-out inset-0 z-10 overflow-y-auto" @click.stop="$emit('done')">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity"></div>
        <div class="z-10 flex min-h-full items-start justify-center p-4 pt-8 sm:pt-12">
          <div
              class="relative cursor-default transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-6xl max-h-[90vh] flex flex-col"
              @click.stop>
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <svg class="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ device.shortId }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Device Info</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                        <span :class="getStatusBadgeClass(device)"
                              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium">
                            <svg class="-ml-0.5 mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3"/>
                            </svg>
                          {{ getDeviceStatus(device) }}
                        </span>
                  <button @click="$emit('done')" type="button"
                          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="overflow-y-auto">
              <DeviceSystemInfo :device="device"/>
            </div>

          </div>
        </div>
      </div>
    `,
    emits: ['done'],
    props: {
        device: Object,
    },
    setup(props, {emit}) {
        const store = inject('store')
        const searchQuery = ref('')

        // Handle Esc key to close dialog
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                emit('done')
            }
        }

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown)
        })

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown)
        })

        // Import utility functions from DeviceInfo
        function getDeviceStatus(device) {
            if (!device.enabled) return 'Disabled'
            if (device.offlineDate) return 'Offline'
            return 'Online'
        }

        function getStatusBadgeClass(device) {
            const status = getDeviceStatus(device)
            const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

            switch (status) {
                case 'Online':
                    return `${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`
                case 'Offline':
                    return `${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`
                case 'Disabled':
                    return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300`
                default:
                    return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300`
            }
        }

        return {
            store,
            getDeviceStatus,
            getStatusBadgeClass,
        }
    }
}
