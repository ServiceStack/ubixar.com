import { ref, computed, inject, onMounted, onUnmounted, provide, watch } from "vue"
import { CloseButton, PrimaryButton, TextInput, useClient, css, useConfig } from "@servicestack/vue"
import { useRoute } from "vue-router"
import { pluralize } from "../lib/utils.mjs"
import { useDeviceInstaller } from "../lib/installer.mjs"

import { SystemInfo, GpusInfo, DeviceStats } from "./DeviceSystemInfo.mjs"
import DeviceModels from "./DeviceModels.mjs"
import DeviceCustomNodes from "./DeviceCustomNodes.mjs"
import DevicePipPackages from "./DevicePipPackages.mjs"
import DeviceWorkflows from "./DeviceWorkflows.mjs"
import { UpdateComfyAgentSettings } from "../../mjs/dtos.mjs"

const DeviceSettings = {
    template:`
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Device Settings</h3>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <form @submit.prevent="saveSettings" class="space-y-6">
            <ErrorSummary />
            
            <!-- In Device Pool Toggle -->
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <label class="text-sm font-medium text-gray-900 dark:text-white">
                  In Device Pool
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Earn credits by including your device in the public device pool
                </p>
              </div>
              <button
                type="button"
                @click="toggleInDevicePool"
                :class="[
                  'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:ring-offset-gray-700',
                  request.inDevicePool
                    ? 'bg-green-600'
                    : 'bg-gray-200 dark:bg-gray-600'
                ]"
                role="switch"
                :aria-checked="request.inDevicePool"
              >
                <span
                  :class="[
                    'pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
                    request.inDevicePool ? 'translate-x-5' : 'translate-x-0'
                  ]"
                >
                </span>
              </button>
            </div>

            <!-- Preserve Outputs Toggle -->
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <label class="text-sm font-medium text-gray-900 dark:text-white">
                  Preserve Outputs
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Don't delete generated outputs from device after processing
                </p>
              </div>
              <button
                type="button"
                @click="togglePreserveOutputs"
                :class="[
                  'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:ring-offset-gray-700',
                  request.preserveOutputs
                    ? 'bg-green-600'
                    : 'bg-gray-200 dark:bg-gray-600'
                ]"
                role="switch"
                :aria-checked="request.preserveOutputs"
              >
                <span
                  :class="[
                    'pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
                    request.preserveOutputs ? 'translate-x-5' : 'translate-x-0'
                  ]"
                >
                </span>
              </button>
            </div>

          </form>
        </div>
      </div>

    `,
    props: {
        device: Object,
    },
    setup(props) {
        const store = inject('store')
        const installer = inject('installer')
        const client = useClient()
        const saving = ref(false)
        const dirtySettings = computed(() => {
            return request.value.inDevicePool !== props.device.settings?.inDevicePool
                || request.value.preserveOutputs !== props.device.settings?.preserveOutputs
        })

        // Initialize request with device settings, ensuring we have the deviceId
        const request = ref(new UpdateComfyAgentSettings({
            deviceId: props.device.deviceId,
            inDevicePool: props.device.settings?.inDevicePool ?? false,
            preserveOutputs: props.device.settings?.preserveOutputs ?? false,
        }))

        function toggleInDevicePool() {
            request.value.inDevicePool = !request.value.inDevicePool
        }

        function togglePreserveOutputs() {
            request.value.preserveOutputs = !request.value.preserveOutputs
        }
        
        async function saveSettings() {
            console.log('saveSettings', request.value)
            saving.value = true
            const api = await client.api(request.value)
            if (api.succeeded) {
                const updatedDevice = api.response.result
                Object.assign(props.device, updatedDevice)
                const oldStatus = installer.status
                installer.setStatus('Settings saved successfully!')
                setTimeout(() => installer.setStatus(oldStatus), 2000)
            } else {
                console.error('Failed to save settings:', api.error)
            }
            saving.value = false
        }
        
        watch(request.value, async () => {
            if (dirtySettings.value) {
                await saveSettings()
            }
        })

        return {
            store,
            request,
            saving,
            dirtySettings,
            toggleInDevicePool,
            togglePreserveOutputs,
            saveSettings,
        }
    }
}

const DeviceInfo = {
    components: {
        SystemInfo, 
        GpusInfo, 
        DeviceStats,
        DeviceSettings,
    },
    template:`
      <div class="p-6 space-x-6 space-y-6">
        <div class="flex gap-x-6">
          <div class="w-1/2 space-y-6">
            <SystemInfo :device="installer.device" />
            <GpusInfo :device="installer.device" />
            <DeviceSettings :device="installer.device" />
          </div>
          <div class="w-1/2 space-y-6">
            <DeviceStats :device="installer.device" />
          </div>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Actions</h3>
          <div class="flex gap-x-4">
            <PrimaryButton @click="installer.agentCommand('Refresh')" :diabled="installer.status.includes('queued...')"
                           :color="installer.status.startsWith('Refresh') ? 'red' : 'indigo'">
              {{ installer.status.startsWith('Refresh') ? 'Refreshing Agent...' : 'Refresh Agent' }}
            </PrimaryButton>
            <PrimaryButton @click="installer.agentCommand('Register')" :diabled="installer.status.includes('queued...')"
                           :color="installer.status.startsWith('Register') && !installer.status.startsWith('Registered') ? 'red' : 'indigo'">
              {{ installer.status.startsWith('Register') && !installer.status.startsWith('Registered') ? 'Registering Agent...' : 'Re-register Agent' }}
            </PrimaryButton>
            <PrimaryButton @click="installer.agentCommand('Reboot')" :diabled="installer.status.includes('queued...')"
                           :color="installer.status.startsWith('Reboot') ? 'red' : 'indigo'">
              {{ installer.status.startsWith('Reboot') ? 'Restarting Comfy...' : 'Restart Comfy' }}
            </PrimaryButton>
          </div>
        </div>
      </div>
    `,
    setup(props, { emit }) {
        const store = inject('store')
        const installer = inject('installer')

        return {
            store,
            installer,
        }
    }
}

export default {
    components: {
        CloseButton,
        PrimaryButton,
        DeviceInfo,
        DeviceWorkflows,
        DeviceModels,
        DeviceCustomNodes,
        DevicePipPackages,
    },
    template: `
      <div class="fixed cursor-zoom-out inset-0 z-10 overflow-y-auto" @click.stop="$emit('done')">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity"></div>
        <div class="z-10 flex min-h-full items-start justify-center p-4 pt-8 sm:pt-12">
          <div class="relative cursor-default transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-6xl max-h-[90vh] flex flex-col"
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
                        class="inline-flex items-center px-3 py-1 rounded-full">
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

            <div>
              <div class="border-b border-gray-200 dark:border-gray-700">
                <nav class="-mb-px flex" aria-label="Tabs">
                  <RouterLink v-for="tab in tabs" :key="tab.name" 
                     :to="{ query:Object.assign({}, $route.query, { show:tab.id }) }" 
                     :class="[tab.id === ($route.query.show || 'info') 
                        ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300' 
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300', 
                        'cursor-pointer w-1/4 border-b-2 px-1 py-4 text-center text-sm font-medium']">
                    {{ tab.name }}
                  </RouterLink>
                </nav>
              </div>
            </div>
            
            <div class="overflow-y-auto">
              <DeviceModels v-if="$route.query.show === 'models'" />
              <DeviceWorkflows v-else-if="$route.query.show === 'workflows'" @done="$emit('done')" />
              <DeviceCustomNodes v-else-if="$route.query.show === 'nodes'" />
              <DevicePipPackages v-else-if="$route.query.show === 'packages'" />
              <DeviceInfo v-else />
            </div>

            <ErrorSummary :status="installer.error" />
            <div class="py-4 px-2 bg-gray-100 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
              <div class="flex">
                <div class="pr-2 cursor-pointer select-none" @click="showActions=!showActions" popovertarget="desktop-menu-solutions">
                  <svg class="w-5 h-5 hover:text-gray-700 dark:hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"></path></svg>
                </div>
                <div :title="'Status: ' + installer.status" class="flex-grow">{{installer.status}}</div>
              </div>
              <div :class="['pr-2', !installer.showDownloads 
                ? 'text-gray-400 dark:text-gray-500 hover:text-indigo-700 dark:hover:text-indigo-300'
                : 'text-indigo-700 dark:text-indigo-300']">
                <span v-if="installer.hasDownloads" class="cursor-pointer select-none flex items-center space-x-1 whitespace-nowrap" @click="installer.toggleShowDownloads()">
                  <svg class="mr-1 w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"></path>
                  </svg>
                  <span>{{installer.downloads.length}} {{pluralize('download',installer.downloads.length)}}</span>
                </span>
              </div>
            </div>

            <div v-if="showActions" class="absolute bottom-12 left-4 w-56 shrink rounded-xl bg-white dark:bg-gray-800 p-4 text-sm/6 font-semibold text-gray-900 dark:text-white shadow-lg ring-1 ring-gray-900/5 dark:ring-gray-700/50">
              <div class="cursor-pointer p-2 hover:text-indigo-600 dark:hover:text-indigo-300" @click="menuCommand('Refresh')">Refresh Agent</div>
              <div class="cursor-pointer p-2 hover:text-indigo-600 dark:hover:text-indigo-300" @click="menuCommand('Register')">Re-register Agent</div>
              <div class="cursor-pointer p-2 hover:text-indigo-600 dark:hover:text-indigo-300" @click="menuCommand('Reboot')">Restart Comfy</div>
            </div>
            
            <div v-if="installer.showDownloads" class="absolute bottom-12 right-4 bg-white dark:bg-gray-800 rounded shadow-lg">
              <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 pl-4 p-2">
                <div>Downloads</div>
                <div @click="installer.toggleShowDownloads(false)">
                  <svg class="cursor-pointer size-4 text-gray-400 dark:text-gray-500 hover:text-red-700 dark:hover:text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                    <path fill="currentColor" d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2m5.4 21L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z"/>
                  </svg>
                </div>
              </div>
              <div class="max-h-92 overflow-y-auto">
                <div v-for="download in installer.downloads" :key="download.id" class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center">
                  <svg v-if="installer.hasInstalled(download)" class="mr-2 size-4 text-green-400 dark:text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1.177-7.86l-2.765-2.767L7 12.431l3.119 3.121a1 1 0 0 0 1.414 0l5.952-5.95l-1.062-1.062z"></path></svg>
                  <svg v-else-if="download.type === 'Node'" class="mr-2 size-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17.5 3a3.5 3.5 0 0 0-3.456 4.06L8.143 9.704a3.5 3.5 0 1 0-.01 4.6l5.91 2.65a3.5 3.5 0 1 0 .863-1.805l-5.94-2.662a3.5 3.5 0 0 0 .002-.961l5.948-2.667A3.5 3.5 0 1 0 17.5 3"/></svg>
                  <svg v-else-if="download.type === 'Package'" class="mr-2 size-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="currentColor" d="m8.878.392l5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0M7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758l-4.63-2.685a.25.25 0 0 0-.25 0M2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271l4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z"/></svg>
                  <svg v-else-if="download.type === 'Model'" class="mr-2 size-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <svg v-else class="mr-2 size-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zm1-2h12l-3.75-5l-3 4L9 13zm-1 2V5z"/></svg>
                  <span :title="download.url" class="text-sm text-gray-700 dark:text-gray-200 w-48 overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {{ download.fileName }}
                  </span>
                </div>
              </div>
              <div class="text-center bg-gray-100 dark:bg-gray-700" @click="installer.clearDownloads()">
                <span class="text-xs text-gray-500 dark:text-gray-400 hover:underline cursor-pointer">clear all</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    `,
    emits: ['done'],
    props: {
        device: Object,
    },
    setup(props, { emit }) {
        const store = inject('store')
        const route = useRoute()
        const installer = useDeviceInstaller(store, store._client, props.device, route)
        provide('installer', installer)
        const error = ref()
        const showActions = ref(false)
        const tabs = [
            { id: 'info',      name: 'System Info' },
            { id: 'workflows', name: 'Workflows' },
            { id: 'models',    name: 'Models' },
            { id: 'nodes',     name: 'Custom Nodes' },
            { id: 'packages',  name: 'Packages' },
        ]

        
        // Handle Esc key to close dialog
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                installer.handleClose()
            }
        }

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown)
            installer.registerCloseHandler('info', () => {
                if (installer.showDownloads) {
                    installer.toggleShowDownloads(false)
                } else {
                    emit('done')
                }
            })
            installer.startMonitor()
        })

        onUnmounted(() => {
            console.log('onUnmounted')
            document.removeEventListener('keydown', handleKeydown)
            installer.stopMonitor()
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
        
        async function menuCommand(command) {
            showActions.value = false
            await installer.agentCommand(command)
        }

        return {
            store,
            installer,
            tabs,
            error,
            showActions,
            menuCommand,
            getDeviceStatus,
            getStatusBadgeClass,
        }
    }
}
