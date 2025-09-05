import { inject, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { omit } from "@servicestack/client"
import DeviceManagerDialog from "./DeviceManagerDialog.mjs"
import DeviceDetailsDialog from "./DeviceDetailsDialog.mjs"

const CloseButton = {
    template: `
      <div class="absolute top-0.5 right-0.5 pt-4 pr-4">
        <button type="button" @click="$emit('close')" :title="title"
                class="cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-black">
          <span class="sr-only">Close</span>
          <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
               aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `,
    emits: ['close'],
    props: {title: String},
    setup() {
    }
}

export default {
    components: {
        CloseButton,
        DeviceManagerDialog,
        DeviceDetailsDialog,
    },
    template: `
      <div :key="device.id"
           class="relative cursor-zoom-in bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
           @click="$router.push({ query:Object.assign({}, $route.query, { device:device.id, show:'info' }) })">

        <CloseButton v-if="(device.userId == store.userId || store.isAdmin) && getDeviceStatus(device) !== 'Online'"
                     class="-mt-3 -mr-3" buttonClass="dark:bg-gray-800" title="Remove offline device"
                     @close="removeDevice"/>

        <!-- Device Header -->
        <div class="px-4 py-5 sm:p-6">
          <div class="flex justify-between">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 truncate"
                    :title="device.deviceId ?? ''">
                  {{ device.shortId }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ device.lastIp ?? 'Device ID' }}
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex-shrink-0">
                    <span :class="getStatusBadgeClass(device)"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                        <svg class="-ml-0.5 mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3"/>
                        </svg>
                      {{ getDeviceStatus(device) }}
                    </span>
            </div>
          </div>

          <!-- GPU Information -->
          <div v-if="device.gpus && device.gpus.length > 0" class="mt-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">GPU</h4>
            <div class="space-y-2">
              <div v-for="gpu in device.gpus" :key="gpu.index" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div>
                  {{ gpu.name }}
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-300">GPU {{ gpu.index }}</span>
                  <span class="text-gray-900 dark:text-gray-100 font-medium">
                                {{ formatMemory(gpu.used) }} / {{ formatMemory(gpu.total) }}
                            </span>
                </div>
                <div class="mt-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div class="h-2 rounded-full transition-all duration-300"
                       :class="getMemoryBarClass(gpu)"
                       :style="{ width: getMemoryPercentage(gpu) + '%' }">
                  </div>
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ getMemoryPercentage(gpu).toFixed(1) }}% used
                </div>
              </div>
            </div>
          </div>

          <!-- Queue Information -->
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center">
              <svg class="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm text-gray-600 dark:text-gray-300">Queue: {{ device.queueCount || 0 }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatLastUpdate(device.lastUpdate) }}
            </div>
          </div>

          <!-- Model Counts -->
          <div class="mt-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Available Models</h4>
            <div class="flex flex-wrap gap-2">
              <div v-if="device.checkpoints?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 cursor-help"
                   :title="getModelTooltip(device.checkpoints, 'Checkpoints')">
                Checkpoints: {{ device.checkpoints.length }}
              </div>
              <div v-if="device.loras?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 cursor-help"
                   :title="getModelTooltip(device.loras, 'LoRAs')">
                LoRAs: {{ device.loras.length }}
              </div>
              <div v-if="device.vaes?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 cursor-help"
                   :title="getModelTooltip(device.vaes, 'VAEs')">
                VAEs: {{ device.vaes.length }}
              </div>
              <div v-if="device.controlNets?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 cursor-help"
                   :title="getModelTooltip(device.controlNets, 'ControlNets')">
                ControlNets: {{ device.controlNets.length }}
              </div>
              <div v-if="device.upscalers?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 cursor-help"
                   :title="getModelTooltip(device.upscalers, 'Upscalers')">
                Upscalers: {{ device.upscalers.length }}
              </div>
              <div v-if="device.embeddings?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 cursor-help"
                   :title="getModelTooltip(device.embeddings, 'Embeddings')">
                Embeddings: {{ device.embeddings.length }}
              </div>
              <div v-if="device.clips?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 cursor-help"
                   :title="getModelTooltip(device.clips, 'CLIP Models')">
                CLIPs: {{ device.clips.length }}
              </div>
              <div v-if="device.clipVisions?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 cursor-help"
                   :title="getModelTooltip(device.clipVisions, 'CLIP Vision Models')">
                CLIP Visions: {{ device.clipVisions.length }}
              </div>
              <div v-if="device.unets?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 cursor-help"
                   :title="getModelTooltip(device.unets, 'UNet Models')">
                UNets: {{ device.unets.length }}
              </div>
              <div v-if="device.stylers?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 cursor-help"
                   :title="getModelTooltip(device.stylers, 'Style Models')">
                Stylers: {{ device.stylers.length }}
              </div>
              <div v-if="device.gligens?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200 cursor-help"
                   :title="getModelTooltip(device.gligens, 'GLIGEN Models')">
                GLIGENs: {{ device.gligens.length }}
              </div>
              <div v-if="device.photoMakers?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 cursor-help"
                   :title="getModelTooltip(device.photoMakers, 'PhotoMaker Models')">
                PhotoMakers: {{ device.photoMakers.length }}
              </div>
              <div v-if="device.languageModels?.length"
                   class="cursor-info relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-800 dark:text-fuchsia-200 cursor-help"
                   :title="getModelTooltip(device.languageModels, 'Language Models')">
                Language Models: {{ device.languageModels.length }}
              </div>
            </div>
          </div>
        </div>

        <!-- Device Details Dialog -->
        <DeviceManagerDialog v-if="store.canManageDevice(device) && $route.query.device == device.id && $route.query.show" :device="device" :show="$route.query.show"
                             @done="$router.push({ query:omit($route.query,['device','show']) })"/>
        <DeviceDetailsDialog v-else-if="$route.query.device == device.id" :device="device" 
                             @done="$router.push({ query:omit($route.query,['device','show']) })"/>
      </div>
    `,
    emits: ['deleted'],
    props: {
        device: Object,
    },
    setup(props, {emit}) {
        const store = inject('store')

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

        function formatMemory(bytes) {
            if (!bytes) return '0 GB'
            const gb = bytes / 1024
            return `${gb.toFixed(1)} GB`
        }

        function getMemoryPercentage(gpu) {
            if (!gpu.total || gpu.total === 0) return 0
            return (gpu.used / gpu.total) * 100
        }

        function getMemoryBarClass(gpu) {
            const percentage = getMemoryPercentage(gpu)
            if (percentage >= 90) return 'bg-red-500'
            if (percentage >= 70) return 'bg-yellow-500'
            return 'bg-green-500'
        }

        function formatLastUpdate(lastUpdate) {
            if (!lastUpdate) return 'Never'

            const date = new Date(lastUpdate)
            const now = new Date()
            const diffMs = now.getTime() - date.getTime()
            const diffMins = Math.floor(diffMs / 60000)

            if (diffMins < 1) return 'Just now'
            if (diffMins < 60) return `${diffMins}m ago`

            const diffHours = Math.floor(diffMins / 60)
            if (diffHours < 24) return `${diffHours}h ago`

            const diffDays = Math.floor(diffHours / 24)
            return `${diffDays}d ago`
        }

        function getModelTooltip(models, categoryName) {
            if (!models || models.length === 0) return ''

            // Limit the number of models shown in tooltip to prevent it from being too long
            const maxModels = 30
            const modelNames = models.slice(0, maxModels)

            let tooltip = `${categoryName}:\n${modelNames.join('\n')}`

            if (models.length > maxModels) {
                tooltip += `\n... and ${models.length - maxModels} more`
            }

            return tooltip
        }

        async function removeDevice() {
            await store.removeDevice(props.device.id)
            emit('deleted', props.device)
        }

        return {
            store,
            getDeviceStatus,
            getStatusBadgeClass,
            formatMemory,
            getMemoryPercentage,
            getMemoryBarClass,
            formatLastUpdate,
            getModelTooltip,
            removeDevice,
            omit,
        }
    }
}