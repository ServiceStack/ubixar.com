import { ref, computed, onMounted, inject, watch, onUnmounted, getCurrentInstance } from "vue"
import { DeleteModel, InstallAsset, InstallModel } from "../../mjs/dtos.mjs"
import { PrimaryButton, SecondaryButton, SelectInput, useClient, useUtils } from "@servicestack/vue"
import { humanize, lastRightPart, leftPart, rightPart } from "@servicestack/client"
import { storageObject, createModelCategories, getFileName, ModelFolders } from "../lib/utils.mjs"

const { unRefs } = useUtils()

const ModelSettingsPopup = {
    template:`
        <div class="relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 min-w-80 max-w-sm">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Model Settings</h3>
            <CloseButton @close="$emit('done')" class="-mt-1 -mr-1" buttonClass="dark:bg-gray-800" />
          </div>

          <!-- Content -->
          <div class="space-y-6">
            <div>
              <label for="maxBatchSize" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Batch Size
              </label>
              <div class="relative">
                <input
                  id="maxBatchSize"
                  type="number"
                  v-model="settings.maxBatchSize"
                  min="0"
                  max="4"
                  class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 transition-colors sm:text-sm invalid:border-red-500 invalid:focus:ring-red-500"
                  placeholder="Enter maximum batch size"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max number of images per generation (4 max)
              </p>

              <div v-if="settings.maxBatchSize === 0" class="mt-2 text-sm text-red-500">
                Disable model from being used in workflows
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <SecondaryButton  @click="$emit('done')">
                Cancel
              </SecondaryButton>
              <PrimaryButton @click="submit()" :disabled="settings.maxBatchSize < 0 || settings.maxBatchSize > 4">
                Save Settings
              </PrimaryButton>
            </div>
          </div>
        </div>
    `,
    props: {
        model: String,
    },
    emits:['done'],
    setup(props, { emit }) {
        const installer = inject('installer')
        const settings = ref(installer.device.modelSettings?.[props.model] ?? { maxBatchSize: 1 })

        function submit() {
            if (settings.value.maxBatchSize === '') {
                settings.value.maxBatchSize = null
            } else if (settings.value.maxBatchSize < 0 || settings.value.maxBatchSize > 4) {
                // return
            }
            installer.updateModelSettings(props.model, settings.value)
            emit('done')
        }

        // Handle keyboard shortcuts
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                emit('done')
            } else if (event.key === 'Enter') {
                submit()
            }
        }

        // Add keyboard event listener
        onMounted(() => document.addEventListener('keydown', handleKeydown))
        onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

        return {
            installer,
            settings,
            submit,
        }
    }
}

const DownloadModels = {
    template: `
      <div class="h-full flex flex-col bg-white dark:bg-gray-900">
        <!-- Header -->
        <div class="flex items-center flex-wrap justify-between">
          <div class="flex-shrink-0 px-6 py-4">
            <div class="flex items-center text-base text-gray-500 dark:text-gray-400">
              {{ loadingStatus }}
            </div>
          </div>

          <div>
            <div class="flex flex-wrap items-center flex-shrink-0 px-6 py-4 space-x-2">
              <div class="mt-1 flex flex-col">
                <label for="modelsFilter"
                       class="block text-sm font-medium text-gray-700 dark:text-gray-300">&nbsp;</label>
                <input id="modelsFilter" type="text" v-model="modelsFilter" placeholder="filter models..."
                       class="px-3 max-w-48 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              </div>
              <SelectInput id="typeFilter" label="Filter Type" v-model="typeFilter"
                           :values="['', ...new Set(models.map(x => x.type))].sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))"></SelectInput>
              <SelectInput id="baseFilter" label="Filter Base" v-model="baseFilter"
                           :values="['', ...new Set(models.map(x => x.base))].sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))"></SelectInput>
              <SelectInput id="sortBy" label="Sort By" v-model="sortBy"
                           :values="['Name', 'Type', 'Base', 'Smallest', 'Largest']"></SelectInput>
            </div>
          </div>

        </div>
        <div class="flex-1 overflow-y-auto px-6">
          <div class="">
            <table>
              <tbody>
              <tr v-for="(model,idx) in filteredModels" :key="model.url"
                  class="border-b border-gray-200 dark:border-gray-700">
                <td>
                  <div class="flex items-center">
                    <span
                        class="font-medium text-gray-900 dark:text-white max-w-sm overflow-hidden overflow-ellipsis whitespace-nowrap"
                        :title="model.name">
                      {{ modelName(model.name) }}
                    </span>
                    <a v-if="model.reference" :href="model.reference" :title="model.reference" target="_blank"
                       class="inline-block ml-2">
                      <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-600"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                  </div>
                  <div class="flex my-2">
                    <div class="flex space-x-2">
                        <span v-if="model.type"
                          :class="'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'"
                          class="cursor-pointer inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                          @click="typeFilter = typeFilter === model.type ? '' : model.type">
                          {{ model.type }}
                       </span>
                      <span v-if="model.base" :title="model.base"
                        :class="'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'"
                        class="cursor-pointer inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                        @click="baseFilter = baseFilter === model.base ? '' : model.base">
                          {{ rightPart(leftPart(model.base, '-'), ' ') }}
                       </span>
                    </div>
                    <span class="ml-2 text-sm text-gray-500 dark:text-gray-400 max-w-3xs overflow-hidden overflow-ellipsis whitespace-nowrap"
                      :title="model.savePath + '/' + model.fileName">
                         {{ model.fileName }}
                    </span>
                  </div>
                </td>
                <td class="px-1">
                  <div class="flex items-center">
                    <div v-if="installer.isModelInstalled(model.savePath + '/' + model.fileName)" class="flex px-1 space-x-1 items-center">
                      <svg class="w-6 h-6 text-green-400 dark:text-green-500" xmlns="http://www.w3.org/2000/svg"
                           viewBox="0 0 24 24">
                        <path fill="currentColor" fill-rule="evenodd"
                              d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1.177-7.86l-2.765-2.767L7 12.431l3.119 3.121a1 1 0 0 0 1.414 0l5.952-5.95l-1.062-1.062z"/>
                      </svg>
                      <span class="text-base text-green-400 dark:text-green-500">done</span>
                    </div>
                    <div v-else-if="installer.isModelInstalling(model.savePath + '/' + model.fileName)" class="px-5">
                      <Loading />
                    </div>
                    <SecondaryButton v-else @click="installer.installModel(model)">Install</SecondaryButton>
                    <a :href="model.url" class="mx-2 inline-block" title="Download Model">
                      <svg class="mr-1 w-6 h-6 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"></path>
                      </svg>
                    </a>
                  </div>
                </td>
                <td class="px-1">
                  {{ model.size }}
                </td>
                <td>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ model.description }}</div>
                </td>
              </tr>
              </tbody>
            </table>
            <div ref="refBottom" class="h-8 flex items-center justify-center text-xs text-gray-400">
              <div v-if="isLoadingMore" class="flex items-center space-x-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading more...</span>
              </div>
              <div v-else class="text-gray-300">
                <!-- Scroll trigger point -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    setup(props) {
        const store = inject('store')
        const installer = inject('installer')
        
        const modelsFilter = ref('')
        const typeFilter = ref('')
        const baseFilter = ref('')
        const sortBy = ref('Name')
        const models = ref([])
        const take = ref(50)
        const refBottom = ref()
        const showCustomModel = ref(false)
        const isLoadingMore = ref(false)
        const url = ref('')
        const saveTo = ref('')
        const fileName = ref(false)

        function filterModels(items) {
            if (modelsFilter.value) {
                const query = modelsFilter.value.toLowerCase()
                items = items.filter(model =>
                    model.name.toLowerCase().includes(query) ||
                    model.description.toLowerCase().includes(query) ||
                    model.fileName.toLowerCase().includes(query) ||
                    model.savePath.toLowerCase().includes(query) ||
                    model.type.toLowerCase().includes(query) ||
                    model.base.toLowerCase().includes(query)
                )
            }
            if (typeFilter.value) {
                items = items.filter(model => model.type === typeFilter.value)
            }
            if (baseFilter.value) {
                items = items.filter(model => model.base === baseFilter.value)
            }
            if (sortBy.value === 'Name') {
                items = items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
            } else if (sortBy.value === 'Type') {
                items = items.sort((a, b) => a.type.toLowerCase().localeCompare(b.type.toLowerCase()))
            } else if (sortBy.value === 'Base') {
                items = items.sort((a, b) => a.base.toLowerCase().localeCompare(b.base.toLowerCase()))
            } else if (sortBy.value === 'Largest') {
                items = items.sort((a, b) => b.length - a.length)
            } else if (sortBy.value === 'Smallest') {
                items = items.sort((a, b) => a.length - b.length)
            }
            return items
        }

        const filteredModels = computed(() => {
            // Only limit the total number of items shown, don't skip any
            let items = filterModels(models.value)
            if (take.value) {
                items = items.slice(0, take.value)
            }
            return items
        })

        // Debug computed property to show loading status
        const loadingStatus = computed(() => {
            let totalItems = models.value.length
            let filteredCount = filterModels(models.value).length
            return filteredCount === totalItems
                ? `Showing ${filteredCount} models`
                : `Showing ${filteredCount} of ${totalItems} models`
        })

        function loadMore() {
            if (isLoadingMore.value) return // Prevent multiple simultaneous loads

            isLoadingMore.value = true

            let availableItems = filterModels(models.value).length

            if (take.value < availableItems) {
                take.value += 50
                console.log('Load More', take.value, 'of', availableItems)
            } else {
                console.log('No more items to load', take.value, 'of', availableItems)
            }

            // Reset loading state after a short delay to allow DOM to update
            setTimeout(() => {
                isLoadingMore.value = false
            }, 100)
        }

        let intersectionObserver = null

        function setupIntersectionObserver() {
            if (intersectionObserver) {
                intersectionObserver.disconnect()
            }
            intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    //console.log('IntersectionObserver triggered:', entry.isIntersecting, 'take:', take.value)
                    if (entry.isIntersecting) {
                        loadMore()
                    }
                })
            }, {
                root: null, // Use the viewport as the root
                rootMargin: '100px', // Trigger 100px before the element comes into view
                threshold: 0.1 // Trigger when 10% of the element is visible
            })
            if (refBottom.value) {
                intersectionObserver.observe(refBottom.value)
                //console.log('IntersectionObserver set up for refBottom')
            }
        }

        // Re-setup intersection observer when refBottom changes
        watch(refBottom, () => {
            if (refBottom.value) {
                setupIntersectionObserver()
            }
        })

        // Reset pagination when filters change
        watch([modelsFilter, typeFilter, baseFilter, sortBy], () => {
            take.value = 50
            localStorage.setItem(`gateway:DownloadModels`, JSON.stringify(unRefs({
                modelsFilter,
                typeFilter,
                baseFilter,
                sortBy
            })))
        })

        // Re-setup intersection observer when filtered models change
        watch(filteredModels, () => {
            // Use nextTick to ensure DOM has updated
            setTimeout(() => {
                if (refBottom.value) {
                    setupIntersectionObserver()
                }
            }, 100)
        })
                
        onMounted(async () => {
            const prefs = storageObject(`gateway:DownloadModels`)
            modelsFilter.value = prefs.modelsFilter ?? ''
            typeFilter.value = prefs.typeFilter ?? ''
            baseFilter.value = prefs.baseFilter ?? ''
            sortBy.value = prefs.sortBy ?? 'Name'
            models.value = await store.getAssets()
            // Set up intersection observer when component mounts
            setupIntersectionObserver()
        })

        // Clean up intersection observer when component unmounts
        onUnmounted(() => {
            if (intersectionObserver) {
                intersectionObserver.disconnect()
            }
        })

        function modelName(name) {
            if (name.includes('/') && name.indexOf('(') === -1 || (name.indexOf('/') < name.indexOf('('))) {
                name = rightPart(name, '/')
            }
            ;['.safetensors', '.ckpt', '.pt', '.bin', '.gguf'].forEach(ext => {
                name = name.replace(ext, '')
            })
            return name
        }
        
        return {
            store,
            installer,
            showCustomModel,
            url,
            saveTo,
            fileName,
            refBottom,
            models,
            modelsFilter,
            isLoadingMore,
            typeFilter,
            baseFilter,
            sortBy,
            take,
            filteredModels,
            loadingStatus,
            modelName,
            leftPart,
            rightPart,
        }
    }
}

const InstallCustomModel = {
    template: `

      <div class="mt-8 mb-16">
        <form class="mt-4 max-w-lg mx-auto space-y-4" @submit.prevent="install">
          <div class="flex space-x-2">
            <div class="flex-grow">
              <TextInput id="url" v-model="request.url" label="URL" />              
            </div>
            <div class="w-44">
              <Combobox id="token" v-model="token" label="Token"
                        :values="['', '$HF_TOKEN', '$CIVITAI_TOKEN', '$GITHUB_TOKEN']" />
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <SelectInput id="saveTo" v-model="request.saveTo" label="Save To"
                         :values="allFolders"/>
            <span class="mt-4 px-2 text-2xl text-gray-500 dark:text-gray-400">/</span>
            <div class="flex-grow">
              <TextInput id="fileName" v-model="request.fileName" />
            </div>
          </div>
          <div class="mt-8 flex justify-center">
            <PrimaryButton :disabled="installer.isModelInstalling(request.saveTo + '/' + request.fileName)"
                           :color="installer.isModelInstalling(request.saveTo + '/' + request.fileName)">
              {{ installer.isModelInstalling(request.saveTo + '/' + request.fileName) ? 'Installing Model...' : 'Install Model' }}
            </PrimaryButton>
          </div>
        </form>
      </div>
    `,
    setup(props) {

        const store = inject('store')
        const installer = inject('installer')
        
        const token = ref()
        const error = ref()
        
        const allFolders = computed(() => 
            [...new Set([...ModelFolders, ...Object.keys(installer.device.models)])]
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase())))

        const request = ref(new InstallModel({
            deviceId: installer.deviceId,
        }))

        async function install() {
            const dto = request.value
            dto.token = token.value?.value
            
            if (await installer.installCustomModel(dto)) {
                request.value = new InstallModel({
                    deviceId: installer.deviceId,
                })
            }
        }

        return {
            store,
            installer,
            allFolders,
            error,
            request,
            token,
            install,
        }
    }
}

export default {
    components: {
        PrimaryButton,
        SelectInput,
        SecondaryButton,
        DownloadModels,
        InstallCustomModel,
        ModelSettingsPopup,
    },
    template: `
      <div class="h-full flex flex-col bg-white dark:bg-gray-900">

        <div>
          <div class="mt-4 max-w-xl mx-auto">
            <nav class="isolate flex divide-x divide-gray-200 dark:divide-gray-700 rounded-lg shadow-sm"
                 aria-label="Tabs">
              <div v-for="(tab, tabIdx) in ['Installed Models', 'Browse Models', 'Install Custom']" :key="tab"
                   @click="show = tab"
                   :class="[show === tab ? 'text-gray-900 dark:text-gray-50' : 'cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300', 
                    tabIdx === 0 ? 'rounded-l-lg' : '', 
                    tabIdx === 3 - 1 ? 'rounded-r-lg' : '', 
                    'group select-none relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-gray-800 px-2 py-2 text-center text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-10']"
                   :aria-current="show === tab ? 'page' : undefined">
                <span>{{ tab }}</span>
                <span aria-hidden="true"
                      :class="[show === tab ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']"/>
              </div>
            </nav>
          </div>
        </div>

        <DownloadModels v-if="show === 'Browse Models'" />
        <InstallCustomModel v-else-if="show === 'Install Custom'" />

        <div v-else>

          <!-- Header -->
          <div class="flex items-center justify-between space-x-6 flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="text-gray-500 dark:text-gray-400">
              {{ totalModels }} models in {{ visibleCategories.length }} categories
            </div>
            <!-- Search -->
            <div class="flex space-x-2">
              <div class="relative flex-grow">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input v-model="searchQuery"
                       type="text"
                       placeholder="filter models..."
                       class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              </div>
              <button class="inline-block" title="Refresh Agent Models" @click="installer.agentCommand('Refresh')">
                <svg class="cursor-pointer size-6 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5m-5 4a9 9 0 0 0 9 9a9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></g>
                </svg>
              </button>
            </div>
          </div>

          <!-- Tree View -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <div class="space-y-2">
              <div v-for="category in filteredCategories" :key="category.key" class="select-none">
                <!-- Folder Header -->
                <div @click="toggleCategory(category.key)"
                     class="flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                  <!-- Expand/Collapse Icon -->
                  <div class="flex-shrink-0 mr-2">
                    <svg v-if="expandedCategories[category.key]"
                         class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                    <svg v-else
                         class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>

                  <!-- Folder Icon -->
                  <div class="flex-shrink-0 mr-3">
                    <svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                    </svg>
                  </div>

                  <!-- Category Name -->
                  <div class="flex-1 flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ category.name }}</span>
                    <span :class="category.badgeClass"
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ml-2">
                        {{ category.models.length }}
                      </span>
                  </div>
                </div>

                <!-- Files List -->
                <div v-if="expandedCategories[category.key]" class="ml-6 mt-1 space-y-1">
                  <div v-for="model in category.models" :key="model"
                       class="group flex items-center justify-between px-2 py-1.5 rounded-md transition-colors duration-150">
                    <div class="flex items-center">
                      <!-- File Icon -->
                      <div class="flex-shrink-0 mr-3">
                        <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>

                      <!-- File Name -->
                      <span class="text-sm font-mono break-all" :title="category.key + '/' + model"
                            :class="[{ 'line-through': installer.isModelUninstalling(category.key + '/' + model) || installer.isModelHidden(category.key + '/' + model)}, 
                                        installer.isModelUninstalling(category.key + '/' + model) ? 'text-red-400 dark:text-red-500' : 'text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white']">
                              {{ getFileName(model) }}
                        </span>
                    </div>

                    <div class="flex items-center">
                      <!-- Hidden Button -->
                      <span v-if="installer.modelMaxBatchSize(category.key + '/' + model) > 0"
                            class="text-sm text-gray-500 dark:text-gray-400 px-2" title="Max Batch Size"
                            @click="showModelSettings = category.key + '/' + model">
                          {{installer.modelMaxBatchSize(category.key + '/' + model)}}
                      </span>
                      <button v-else type="button" :title="installer.isModelHidden(category.key + '/' + model) ? 'Allow model to be used in workflows' : 'Hide Model from being used in workflows'"
                              @click="installer.toggleModelHidden(category.key + '/' + model)" class="flex-shrink-0 p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors duration-200">
                        <svg v-if="installer.isModelHidden(category.key + '/' + model)" class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M2 5.27L3.28 4L20 20.72L18.73 22l-3.08-3.08c-1.15.38-2.37.58-3.65.58c-5 0-9.27-3.11-11-7.5c.69-1.76 1.79-3.31 3.19-4.54zM12 9a3 3 0 0 1 3 3a3 3 0 0 1-.17 1L11 9.17A3 3 0 0 1 12 9m0-4.5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-4 5.19l-1.42-1.43A9.86 9.86 0 0 0 20.82 12A9.82 9.82 0 0 0 12 6.5c-1.09 0-2.16.18-3.16.5L7.3 5.47c1.44-.62 3.03-.97 4.7-.97M3.18 12A9.82 9.82 0 0 0 12 17.5c.69 0 1.37-.07 2-.21L11.72 15A3.064 3.064 0 0 1 9 12.28L5.6 8.87c-.99.85-1.82 1.91-2.42 3.13"/></svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 9a3.02 3.02 0 0 0-3 3c0 1.642 1.358 3 3 3s3-1.358 3-3s-1.359-3-3-3"/><path fill="currentColor" d="M12 5c-7.633 0-9.927 6.617-9.948 6.684L1.946 12l.105.316C2.073 12.383 4.367 19 12 19s9.927-6.617 9.948-6.684l.106-.316l-.105-.316C21.927 11.617 19.633 5 12 5m0 12c-5.351 0-7.424-3.846-7.926-5C4.578 10.842 6.652 7 12 7c5.351 0 7.424 3.846 7.926 5c-.504 1.158-2.578 5-7.926 5"/></svg>
                      </button>

                      <!-- Settings Button -->
                      <button type="button" class="flex-shrink-0 p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors duration-200" title="Configure Model Settings"
                        @click="showModelSettings = category.key + '/' + model">
                        <svg class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.05 6.462a2 2 0 0 0 2.63-1.519l.32-1.72a9 9 0 0 1 3.998 0l.322 1.72a2 2 0 0 0 2.63 1.519l1.649-.58a9 9 0 0 1 2.001 3.46l-1.33 1.14a2 2 0 0 0 0 3.037l1.33 1.139a9 9 0 0 1-2.001 3.46l-1.65-.58a2 2 0 0 0-2.63 1.519L14 20.777a9 9 0 0 1-3.998 0l-.322-1.72a2 2 0 0 0-2.63-1.519l-1.649.58a9 9 0 0 1-2.001-3.46l1.33-1.14a2 2 0 0 0 0-3.036L3.4 9.342a9 9 0 0 1 2-3.46zM12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6" clip-rule="evenodd"/></svg>
                      </button>
                      <!-- Settings Popup with backdrop -->
                      <div v-if="showModelSettings === category.key + '/' + model" class="fixed inset-0 z-40 flex items-center justify-center p-4" @click="showModelSettings = ''">
                        <div class="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"></div>
                        <div @click.stop>
                          <ModelSettingsPopup :model="category.key + '/' + model" @done="showModelSettings = ''" />
                        </div>
                      </div>

                      <!-- Delete Button -->
                      <button type="button"
                              @click="installer.deleteModel(category.key + '/' + model)"
                              :disabled="installer.isModelUninstalling(category.key + '/' + model)"
                              class="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              :title="installer.isModelUninstalling(category.key + '/' + model) ? 'Deleting...' : 'Delete model'"
                      >
                        <svg v-if="!installer.isModelUninstalling(category.key + '/' + model)" class="size-5" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        <svg v-else class="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                  stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Empty State -->
                  <div v-if="category.models.length === 0"
                       class="ml-6 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                    No models found
                  </div>
                </div>
              </div>

              <!-- No Results -->
              <div v-if="filteredCategories.length === 0"
                   class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No models found</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ searchQuery ? 'Try adjusting your search terms.' : 'No models are installed on this device.' }}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    `,
    setup(props) {
        const store = inject('store')
        const installer = inject('installer')
        
        const searchQuery = ref('')
        const expandedCategories = ref({})
        const deleting = ref({})
        const show = ref('')
        const showModelSettings = ref('')

        // Model categories with consistent naming and colors
        const modelCategories = computed(() => 
            createModelCategories(installer.device))

        // Filter categories that have models and apply search
        const filteredCategories = computed(() => {
            let categories = modelCategories.value.filter(cat => cat.models.length > 0)

            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase()
                categories = categories.map(category => ({
                    ...category,
                    models: category.models.filter(model =>
                        getFileName(model).toLowerCase().includes(query) ||
                        model.toLowerCase().includes(query)
                    )
                })).filter(category => category.models.length > 0)
            }

            return categories
        })

        // Only show categories that have models
        const visibleCategories = computed(() => {
            return modelCategories.value.filter(cat => cat.models.length > 0)
        })

        // Total model count
        const totalModels = computed(() => {
            return visibleCategories.value.reduce((total, cat) => total + cat.models.length, 0)
        })

        // Toggle category expansion
        function toggleCategory(categoryKey) {
            expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey]
            savePrefs()
        }
        
        onMounted(() => {
            const prefs = storageObject(`gateway:DeviceModels`)
            if (!Object.keys(prefs).length) {
                show.value = 'Installed Models'
                ModelFolders.forEach(category => {
                    expandedCategories.value[category] = true
                })
            } else {
                show.value = prefs.show ?? 'Installed Models'
                prefs.expandedCategories?.forEach(category => {
                    expandedCategories.value[category] = (installer.device.models[category] || []).length
                })
            }
        })
        
        function savePrefs() {
            //console.log('savePrefs gateway:DeviceModels')
            localStorage.setItem(`gateway:DeviceModels`, JSON.stringify({
                show: show.value,
                expandedCategories:  Object.keys(expandedCategories.value)
                    .filter(x => expandedCategories.value[x] && (installer.device.models[x] || []).length),
            }))
        }
        
        watch(() => [show, expandedCategories], savePrefs)

        return {
            store,
            installer,
            searchQuery,
            show,
            showModelSettings,
            expandedCategories,
            deleting,
            modelCategories,
            filteredCategories,
            visibleCategories,
            totalModels,
            getFileName,
            toggleCategory,
        }
    }
}