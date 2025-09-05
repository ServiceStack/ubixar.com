import { ref, computed, onMounted, inject, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { lastLeftPart, omit, rightPart } from "@servicestack/client"
import { WorkflowGroups, reactionCounts, pluralize } from "../lib/utils.mjs"
import { UploadNewWorkflow, BaseModel, DevicePool, MyDevices } from "../../mjs/dtos.mjs"
import FileUpload from "./FileUpload.mjs"
import DeviceManagerDialog from "./DeviceManagerDialog.mjs"
import DeviceDetailsDialog from "./DeviceDetailsDialog.mjs"

const majorGroups = WorkflowGroups

const WorkflowReactions = {
    template:`
    <div v-if="version" class="pt-1.5 text-sm flex items-center justify-between w-full">
        <button v-for="(count,emoji) of reactionCounts(version.reactions,['👍','❤','😂'])" type="button" 
                @click.prevent.stop="toggleReaction(version, emoji)"
                :title="'React with ' + emoji"
                class="px-1 py-0.5 lg:px-2 border" 
                :class="[ store.hasWorkflowVersionReaction(version.id, emoji) 
                    ? 'shadow-sm bg-gray-200 dark:bg-gray-700' 
                    : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700' ]">
            <div>
                <span class="flex gap-1">
                    <div :class="{ 'text-red-500': emoji === '❤' }">{{emoji}}</div> {{count}}
                </span>
            </div>
        </button>
        <!-- download button -->
        <button type="button" 
                class="px-1 py-0.5 lg:px-2 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" 
                @click.prevent.stop="downloadWorkflow(version)"
                :title="'Download Workflow'">
            <div>
                <!-- download icon -->
                <svg class="size-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"></path></svg>
            </div>
        </button>
    </div>
    `,
    emits: ['changed'],
    props: {
        version:Object,
    },
    setup(props, { emit }) {
        const store = inject('store')

        async function toggleReaction(version, reaction) {
            await store.toggleWorkflowVersionReaction(version.id, reaction)
            const latestVersion = await store.getWorkflowVersion(version.id)
            if (latestVersion) {
                emit('changed', latestVersion)
            }
        }
        
        function downloadWorkflow() {
            location.href = `/api/DownloadWorkflowVersion?id=${props.version.id}`
        }

        return {
            store,
            toggleReaction,
            reactionCounts,
            downloadWorkflow,
        }
    }
}

const FullDeviceInfo = {
    template:`
      <div class="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50" @click.self="$emit('done')">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-screen-md w-full mx-4 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Device Info</h3>
            <button @click="$emit('done')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
            {{device.id}}
          <div>
            {{device.nodes}}
          </div>
          <div>
            {{device.assets}}
          </div>
        </div>
      </div>
    `,
    props: {
        /** @type {DeviceInfo} */
        device: Object,
    },
    emits: ['done'],
    setup(props, { emit }) {
        const store = inject('store')
        return {
            store
        }
    }
}

const UploadWorkflowForm = {
    components: {
        FileUpload,
    },
    template: `
    <div v-if="show" class="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50" @click.self="$emit('close')">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload New ComfyUI Workflow</h3>
                <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <form ref="refForm" @submit.prevent="handleSubmit" class="space-y-4">
                <!-- File Upload -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ComfyUI Workflow 
                      <span class="text-xs text-gray-500 dark:text-gray-400">(.json)</span>
                    </label>
                    <FileUpload
                        ref="fileUpload"
                        id="workflow-file"
                        accept=".json"
                        acceptLabel="JSON"
                        :status="uploadStatus"
                        @change="onFileChange"
                    >
                      <div v-if="!fileList.length" class="flex flex-col items-center justify-center">
                        <svg class="size-12 mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p class="mb-2 text-gray-500 dark:text-gray-400">
                          <span class="font-semibold">Click to upload</span> or drag and drop
                        </p>
                      </div>
                    </FileUpload>
                </div>

                <!-- Base Model -->
                <div>
                    <SelectInput id="baseModel" :options="BaseModel" />
                </div>

                <!-- Workflow Name Input -->
                <div>
                    <TextInput id="workflowName" v-model="workflowName" />
                </div>
              
                <!-- Error Message -->
                <div v-if="errorMessage" class="text-red-600 dark:text-red-400 text-sm">
                    {{ errorMessage }}
                </div>

                <!-- Success Message -->
                <div v-if="successMessage" class="text-green-600 dark:text-green-400 text-sm">
                    {{ successMessage }}
                </div>

                <!-- Submit Button -->
                <div class="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        @click="$emit('close')"
                        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        :disabled="uploading || !hasFile || successMessage !== ''"
                        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span v-if="uploading" class="flex items-center">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                        </span>
                        <span v-else>Upload Workflow</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
    `,
    emits: ['close', 'uploaded'],
    props: {
        show: Boolean,
    },
    setup(props, { emit }) {
        const store = inject('store')
        const workflowName = ref('')
        const uploading = ref(false)
        const errorMessage = ref('')
        const successMessage = ref('')
        const uploadStatus = ref(null)
        const hasFile = ref(false)
        const fileUpload = ref(null)
        const fileList = ref([])
        const refForm = ref()

        function onFileChange(event) {
            fileList.value = Array.from(event.target.files ?? [])
            hasFile.value = event.target.files && event.target.files.length > 0
            errorMessage.value = ''
            successMessage.value = ''

            // Auto-populate workflow name from filename
            if (hasFile.value && event.target.files[0]) {
                const fileName = event.target.files[0].name
                // Remove .json extension and clean up the name
                const nameWithoutExt = fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' ')
                workflowName.value = nameWithoutExt
            }
        }

        async function handleSubmit() {
            if (!hasFile.value) {
                errorMessage.value = 'Please select a workflow file'
                return
            }

            uploading.value = true
            errorMessage.value = ''
            successMessage.value = ''

            try {
                const formData = new FormData(refForm.value)
                const api = await store._client.apiForm(new UploadNewWorkflow(), formData)

                if (api.error) {
                    errorMessage.value = api.error.message || 'Upload failed'
                } else {
                    successMessage.value = 'Workflow uploaded successfully!'

                    // Refresh workflows
                    await store.loadWorkflowsAndVersions()

                    // Close modal after a short delay
                    setTimeout(() => {
                        emit('uploaded', api)
                        emit('close')
                    }, 1500)
                }
            } catch (error) {
                console.error('Upload error:', error)
                errorMessage.value = error.message || 'Upload failed'
            } finally {
                uploading.value = false
            }
        }

        // Reset form when modal is closed
        watch(() => props.show, (newShow) => {
            if (!newShow) {
                workflowName.value = ''
                hasFile.value = false
                errorMessage.value = ''
                successMessage.value = ''
                uploadStatus.value = null
                if (fileUpload.value?.input) {
                    fileUpload.value.input.value = ''
                }
            }
        })

        return {
            store,
            refForm,
            workflowName,
            uploading,
            errorMessage,
            successMessage,
            uploadStatus,
            hasFile,
            fileUpload,
            fileList,
            onFileChange,
            handleSubmit,
            BaseModel,
        }
    }
}

const colors = {
    active: 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 border border-indigo-400 dark:border-indigo-500 ring-0 focus:ring-0',
    default: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 ring-0 focus:ring-0',
}

//<!-- compatible devices -->
export const CompatibleDeviceLabel = {
    template:`
      <div class="mt-1 mr-1 float-right text-xs" 
            :class="label === 'compatible' 
                ? 'text-green-300 dark:text-green-600'
                : label === 'incompatible' || label === '0 devices'
                    ? 'text-red-300 dark:text-red-600'
                    : label === '1 device' 
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-green-300 dark:text-green-600'"
            :title="title" @click.prevent.stop="debugInfo">
        {{ label }}
      </div>
    `,
    props: {
        version: Object,
        devices: Array,
    },
    setup(props) {
        const store = inject('store')
        
        const label = computed(() =>
            compatibleDevicesLabel(props.version, props.devices))

        const title = computed(() => compatibleDevicesTitle(
            props.version, props.devices))
        
        function compatibleDevicesTitle(version, devices) {
            if (devices.length === 1) {
                const errors = store.compatibleErrors(version, devices[0])
                if (errors) {
                    //console.log('incompatible device', JSON.stringify(devices[0]))
                    const sb = []
                    if (errors.missingNodes.length) {
                        sb.push(`Missing ${errors.missingNodes.length} ${pluralize('node',errors.missingNodes.length)}:`)
                        errors.missingNodes.forEach(node => {
                            sb.push(` - ${node}`)
                        })
                        sb.push('')
                    }
                    if (errors.missingAssets.length) {
                        sb.push(`Missing ${errors.missingAssets.length} ${pluralize('asset',errors.missingAssets.length)}:`)
                        errors.missingAssets.forEach(asset => {
                            sb.push(` - ${asset}`)
                        })
                        sb.push('')
                    }
                    return sb.join('\n')
                } else {
                    const gpuName = devices[0].gpus?.[0]?.name || ''
                    const ip = devices[0].lastIp || ''
                    return `Compatible with ${devices[0].shortId} - ${gpuName}${ip ? (' @ ' + ip) : ''}`
                }
            }
            const compatibleDevices = store.compatibleDevices(version, devices)
            return 'Can run on ' + compatibleDevices.length + ' compatible ' + pluralize('device',compatibleDevices.length)
        }
        
        function compatibleDevicesLabel(version, devices) {
            if (devices.length === 1) {
                return store.isCompatible(version, devices[0])
                    ? 'compatible'
                    : 'incompatible'
            }
            const compatibleDevices = store.compatibleDevices(version, devices)
            return `${compatibleDevices.length} ${pluralize('device',compatibleDevices.length)}`
        }
        
        function debugInfo() {
            console.log('debugInfo', props.devices.length)
            props.devices.forEach(device => {
                console.log(JSON.stringify(device, undefined, 2))
            })
        }
        
        return {
            store,
            label,
            title,
            debugInfo,
        }
    }
}

export default {
    components: {
        WorkflowReactions,
        UploadWorkflowForm,
        CompatibleDeviceLabel,
        FullDeviceInfo,
        DeviceManagerDialog,
        DeviceDetailsDialog,
    },
    template: `
    <!-- Workflow selection area with transition -->
    <div v-show="show" class="p-4 w-full overflow-hidden">
        <div class="flex justify-between mb-4">
          <div class="flex">
            <div class="mr-4">
              <div class="mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">run on</span>
              </div>
              <button type="button"
                      :class="!runOn ? colors.active : colors.default"
                      class="px-2 py-0.5 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
                      @click="runOn = ''"
              >
                <span>Device Pool</span>
                <span class="text-xs text-gray-500 dark:text-gray-400"> ({{ store.poolDevices.length }})</span>
              </button>
            </div>
            
            <div v-if="store.myDevices.length">
              <div class="mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">my devices</span>
              </div>
              <div class="flex items-center gap-x-1 text-gray-500 dark:text-gray-400">
                <div v-for="device in store.myDevices" class="flex items-center gap-x-1">
                  <button type="button"
                          :title="'Run on ' + device.shortId + ' ' + (device.gpus?.[0]?.name || '') + (device.lastIp ? (' @ ' + device.lastIp) : '')"
                          :class="runOn === device.id ? colors.active : colors.default"
                          class="px-2 py-0.5 flex items-center space-x-1 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
                          @click="runOn = device.id">
                    <span @click.prevent.stop="selectDevice(device)" title="View Device Info" class="cursor-help focus:outline-none">
                      <svg class="size-4 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
                    </span>
                    <span>{{ device.shortId }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <!-- Upload New Workflow Button -->
            <button type="button"
                    @click="showUpload"
                    class="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
                    title="Upload a new ComfyUI workflow"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Upload Workflow
            </button>
          </div>
        </div>
      
        <div class="bg-gray-50/80 dark:bg-gray-800/80">
            <div class="w-full py-1">
                <div class="flex items-center gap-3">
                    <!-- Categories Container -->
                    <div class="flex gap-1.5 min-w-0 flex-1 hide-scrollbar flex-wrap">
                        <!-- All Categories Pill -->
                        <RouterLink type="button"
                            :to="{ query: { ...$route.query, tag:undefined } }"
                            :class="[
                                'whitespace-nowrap px-2 rounded-sm font-normal text-sm transition-all duration-200',
                                !$route.query.tag ? colors.active : colors.default
                            ]"
                        >
                            all
                        </RouterLink>
                        <!-- Individual Category Pills -->
                        <RouterLink
                            v-for="tag in allTags"
                            :key="tag"
                            :to="{ query: { ...$route.query, tag } }"
                            :class="[
                                'whitespace-nowrap px-2 rounded-sm font-normal text-sm transition-all duration-200',
                                $route.query.tag === tag ? colors.active : colors.default
                            ]">
                            {{ tag.toLowerCase() }}
                        </RouterLink>
                    </div>
                </div>
            </div>
        </div>
        <!-- Workflow Grid -->
        <div class="mt-6">
            <div v-if="filteredWorkflows.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No workflows found for the selected filters.
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div v-for="workflow in filteredWorkflows"
                     :key="workflow.version.id"
                     :title="workflowTitle(workflow)"
                     @click="selectWorkflow(workflow)"
                     class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 group flex flex-col justify-between overflow-hidden"
                     :class="store.compatibleDevices(workflow.version, runOnDevices).length 
                        ? 'hover:border-indigo-300 dark:hover:border-indigo-600' 
                        : 'hover:border-red-300 dark:hover:border-red-600'"
                     >
                  
                    <!-- Poster Image -->
                    <div class="overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-700">
                        <img v-if="workflow.version.posterImage"
                             :src="workflow.version.posterImage"
                             :alt="workflow.version.name"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200">
                        <div v-else 
                            class="aspect-square w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">

                            <svg v-if="workflow.version.info?.type.endsWith('ToAudio')" class="size-24 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            
                            <svg v-else class="size-24" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <div class="relative">
                        <!-- Title -->
                        <h3 class="absolute -mt-7 text-center w-full p-1 bg-gray-900/40 font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
                            <span class="truncate" :title="workflow.version.name">{{ workflow.version.name }}</span>
                            <span v-if="workflow.version.version !== 'v1'" class="text-xs text-gray-500 dark:text-gray-400">({{ workflow.version.version }})</span>
                        </h3>

                      <CompatibleDeviceLabel :version="workflow.version" :devices="runOnDevices" />

                      <!-- Content -->
                        <div class="px-2 pt-2">

                            <!-- Tags -->
                            <div v-if="workflow.tags?.length" class="flex flex-wrap gap-1 mb-3">
                                <span v-for="tag in workflow.tags.slice(0, 3)"
                                      :key="tag"
                                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                    {{ tag }}
                                </span>
                                <span v-if="workflow.tags.length > 3"
                                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                    +{{ workflow.tags.length - 3 }}
                                </span>
                            </div>
    
                            <!-- Footer Info -->
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
                                 :class="workflow.tags?.length ? '' : 'mt-4'">
                                <!-- Node Count -->
                                <div class="flex items-center" 
                                    :title="workflow.version.nodes?.length ? workflow.version.nodes?.join('\\n') : 'requires no custom_nodes'">
                                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                    </svg>
                                    {{ workflow.version.nodes?.length || 0 }} {{pluralize('node',workflow.version.nodes?.length)}}
                                </div>
                                
                                <!-- Asset Count -->
                                <div class="flex items-center" 
                                    :title="workflow.version.assets?.join('\\n')">
                                    {{ workflow.version.assets?.length || 0 }} {{pluralize('asset',workflow.version.nodes?.length)}}
                                </div>
    
                                <!-- Gallery Link -->
                                <RouterLink class="text-right hover:text-sky-500 dark:hover:text-sky-400" :to="{ path: '/images', query: { version: workflow.version.id } }">
                                    gallery
                                    <span>&rarr;</span>
                                </RouterLink>
                            </div>
                        </div>
                    </div>
                    
                    <WorkflowReactions :version="workflow.version" @changed="workflow.version.reactions = $event.reactions" />
                </div>
            </div>
        </div>

        <!-- Upload Workflow Modal -->
        <UploadWorkflowForm
            :show="showUploadForm"
            @close="showUploadForm = false"
            @uploaded="onWorkflowUploaded"
        />

        <DeviceManagerDialog v-if="selectedDevice && store.canManageDevice(selectedDevice)" :device="selectedDevice" @done="selectDevice(null)"/>
        <DeviceDetailsDialog v-else-if="selectedDevice" :device="selectedDevice" @done="selectDevice(null)"/>
      
    </div>
    `,
    emits:['select'],
    props: {
        show: Boolean,
    },
    setup(props, { emit }) {
        const store = inject('store')
        
        const runOn = ref('')
        
        const router = useRouter()
        const route = useRoute()
        const showUploadForm = ref(false)
        
        const categoryWorkflows = computed(() => {
            const category = route.query.category ?? 'Text to Image'
            return store.workflows.filter(x => x.category === category)
        })

        const allTags = computed(() => {
            return Array.from(new Set(categoryWorkflows.value.flatMap(x => x.tags).filter(Boolean)))
        })

        const filteredWorkflows = computed(() => {
            const tag = route.query.tag
            if (!tag) return categoryWorkflows.value
            return categoryWorkflows.value.filter(x => x.tags?.includes(tag))
        })
        
        // All Pooled Devices and User Devices combined
        const runOnDevices = computed(() => !runOn.value 
            ? store.poolDevices 
            : store.myDevices.filter(x => x.id === Number(runOn.value)))
        
        const runOnMyDevice = computed(() =>
            runOn.value && store.myDevices.find(x => x.id === Number(runOn.value)))

        const selectedDevice = computed(() => 
            store.myDevices.find(x => x.id === Number(route.query.device)))
        function selectDevice(device, args) {
            if (device && Number(route.query.device) !== device.id) {
                router.push({ query: { ...route.query, device: device.id, ...Object.assign({ show:'info' }, args) } })
            } else {
                router.push({ query: omit(route.query, ['device','show','versionId']) })
            }
        }

        function workflowTitle(workflow) {
            const sb = []
            
            const nameOnly = path => lastLeftPart(rightPart(path,'/'),'.')
            
            const assets = workflow.version.assets || []
            const checkpoints = assets.filter(x => x.startsWith('checkpoints/')
                || x.startsWith('diffusion_models/') || x.toLowerCase().startsWith('stable-diffusion/'))
                .map(nameOnly)
            if (checkpoints.length > 0) {
                sb.push(`Checkpoint: ${checkpoints.join(', ')}`)
            }
            const vaes = assets.filter(x => x.toLowerCase().startsWith('vae/')).map(nameOnly)
            if (vaes.length > 0) {
                sb.push(`VAE: ${vaes.join(', ')}`)
            }
            // 768x1344 / 384x672
            const loras = assets.filter(x => x.startsWith('loras/')).map(nameOnly)
            if (loras.length > 0) {
                sb.push(`LoRAs: ${loras.join(', ')}`)
            }
            
            return sb.join('\n')
        }
        
        function onWorkflowUploaded(response) {
            console.log('Workflow uploaded successfully:', response)
            // The store has already been refreshed in the upload form
        }
        
        function selectWorkflow(workflow) {
            const compatibleDevices = store.compatibleDevices(workflow.version, runOnDevices.value)
            if (compatibleDevices.length) {
                emit('select', workflow)
            } else {
                const device = runOn.value && runOnDevices.value.find(x => x.id === Number(runOn.value))
                if (device) {
                    selectDevice(device, { show: 'workflows', versionId: workflow.version.id })
                } else {
                    alert('No compatible devices found')
                }
            }
        }
        
        function showUpload() {
            if (!store.redirectedAnonUser()) {
                showUploadForm.value = true
            }
        }

        // Initialize with first major group selected and expand all workflow types by default
        onMounted(() => {
            // Update workflows tables behind scenes
            Promise.all([
                store.loadWorkflowsAndVersions(),
                store.loadPoolDevices(),
                store.loadMyDevices(),
            ])
        })

        return {
            store,
            runOn,
            runOnMyDevice,
            runOnDevices,
            colors,
            filteredWorkflows,
            allTags,
            workflowTitle,
            showUploadForm,
            onWorkflowUploaded,
            pluralize,
            selectWorkflow,
            showUpload,
            selectDevice,
            selectedDevice,
        }
    }
}
