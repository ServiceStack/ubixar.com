import { computed, inject, onMounted, onUnmounted, nextTick, ref, watch } from "vue"
import { useClient, useUtils } from "@servicestack/vue"
import { lastLeftPart, lastRightPart } from "@servicestack/client"
import { humanifyNumber, pluralize, storageObject } from "../lib/utils.mjs"
import { InstallCustomNode, InstallModel } from "../../mjs/dtos.mjs"
const { unRefs } = useUtils()

const BrowseCustomNodes = {
    template:`
    <div class="h-full flex flex-col bg-white dark:bg-gray-900">
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-6 w-full">
              <!-- Search Input -->
              <div class="relative w-64">
                <input
                    v-model="searchTerm"
                    type="text"
                    placeholder="Search Custom Nodes..."
                    class="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="flex-grow text-center text-sm text-gray-500 dark:text-gray-400">
                Showing {{ filteredNodes.length }} of {{ allFilteredNodes.length }} nodes
                <span v-if="allFilteredNodes.length !== totalAvailableNodes">
                    ({{ totalAvailableNodes }} total)
                </span>
              </div>
              <div>
                <SelectInput id="typeFilter" label="" v-model="typeFilter"
                             :values="['All', 'Installed', 'Not Installed', 'Most Nodes', 'Most Popular', 'Most Watchers']"></SelectInput>
              </div>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <svg class="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2 text-gray-500 dark:text-gray-400">Loading custom nodes...</span>
            </div>

            <div v-else-if="filteredNodes.length === 0 && searchTerm" class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-8 8 7.962 7.962 0 01-5.291-2z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No nodes found</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search terms.</p>
            </div>

            <div v-else>
                <div class="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    <div v-for="node in filteredNodes" :key="node.id"
                         class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                        <!-- Header -->
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                    {{ node.name }}
                                </h3>
                                <div class="flex space-x-3 text-sm">
                                  <div v-if="node.stars" class="text-yellow-500 dark:text-yellow-400">
                                    {{ humanifyNumber(node.stars) + ' ' + pluralize('star', node.stars) }}
                                  </div>
                                  <div v-if="node.watchers" class="text-blue-500 dark:text-blue-400">
                                    {{ humanifyNumber(node.watchers) + ' ' + pluralize('watcher', node.watchers) }}
                                  </div>
                                  <div v-if="node.issues" class="text-gray-500 dark:text-gray-400">
                                    {{ humanifyNumber(node.issues) + ' ' + pluralize('issue', node.issues) }}
                                  </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 ml-4">
                                <!-- Installation Status -->
                                <div v-if="installer.isNodeInstalled(node)"
                                     class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    Installed
                                </div>
                                <!-- Install Button -->
                                <button v-else type="button"
                                        @click="installer.installNode(node)"
                                        :disabled="installer.isNodeInstalling(node)"
                                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                                        :class="installer.isNodeInstalling(node)
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'">
                                    <svg v-if="installer.isNodeInstalling(node)" class="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <svg v-else class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    {{ installer.isNodeInstalling(node) ? 'Installing...' : 'Install' }}
                                </button>
                            </div>
                        </div>
                      
                        <div class="mb-2 flex items-center justify-between w-full">
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                              <a v-if="node.url?.startsWith('https://github.com/')" target="_blank" :href="lastLeftPart(node.url,'/')"
                                 class="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:underline">
                                by {{ node.author || node.owner }}
                              </a>
                              <span v-else>by {{ node.author || node.owner }}</span>
                            </p>
                            <a :href="node.url" target="_blank" class="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:underline" title="View on GitHub">
                              <svg class="mr-1 size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"/></svg>
                              {{ node.url?.replace('https://','').replace('github.com/','') }}
                            </a>
                        </div>
                      
                        <!-- Description -->
                        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                            {{ node.description || 'No description available.' }}
                        </p>

                        <!-- Footer - Node Types -->
                        <div v-if="node.nodes.length > 0" class="flex flex-wrap gap-1">
                            <div v-for="nodeType in expandNodes[node.url] ? node.nodes : node.nodes.slice(0, 10)" :key="nodeType"
                                 class="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/50 dark:ring-indigo-700/50">
                                {{ nodeType }}
                            </div>
                            <div v-if="!expandNodes[node.url] && node.nodes.length > 15" @click="expandNodes[node.url] = true"
                                 class="cursor-pointer inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300"
                                 :title="node.nodes.slice(15).join(', ')">
                                +{{ node.nodes.length - 15 }} more
                            </div>
                        </div>
                        <div v-else class="text-xs text-gray-400 dark:text-gray-500 italic">
                            No node types available
                        </div>
                    </div>
                </div>

                <!-- Load More Trigger (Intersection Observer Target) -->
                <div v-if="hasMoreNodes" class="flex flex-col items-center justify-center py-8 space-y-4">
                    <!-- Intersection Observer Target -->
                    <div ref="loadMoreRef"
                         class="flex items-center text-gray-500 dark:text-gray-400">
                        <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading more nodes...
                    </div>

                    <!-- Manual Load More Button (fallback) -->
                    <button @click="loadMore"
                            class="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        Load More ({{ allFilteredNodes.length - filteredNodes.length }} remaining)
                    </button>
                </div>

                <!-- End of Results Indicator -->
                <div v-else-if="filteredNodes.length > 0" class="text-center py-8">
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        Showing all {{ filteredNodes.length }} results
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    setup(props) {
        const store = inject('store')
        const installer = inject('installer')
        const client = useClient()

        const searchTerm = ref('')
        const typeFilter = ref('')
        const loading = ref(false)
        const take = ref(50) // Initial number of items to show
        const loadMoreRef = ref(null) // Reference to the load more trigger element
        const observer = ref(null)
        const expandNodes = ref({})

        const totalAvailableNodes = computed(() => store.customNodes.length)

        function sortNodes(nodes) {
            if (typeFilter.value === 'Installed') {
                return nodes.filter(node => isInstalled(node))
            } else if (typeFilter.value === 'Not Installed') {
                return nodes.filter(node => !isInstalled(node))
            } else if (typeFilter.value === 'Most Nodes') {
                return nodes.sort((a, b) => b.nodes.length - a.nodes.length)
            } else if (typeFilter.value === 'Most Popular') {
                return nodes.sort((a, b) => b.stars - a.stars)
            } else if (typeFilter.value === 'Most Watchers') {
                return nodes.sort((a, b) => b.watchers - a.watchers)
            }
            
            // sort installed first, then alphabetical
            return nodes.sort((a, b) => {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            })
        }
        
        const allFilteredNodes = computed(() => {
            if (!store.customNodes.length) return []
            if (!searchTerm.value.trim()) return sortNodes(store.customNodes)

            const search = searchTerm.value.toLowerCase().trim()
            return sortNodes(store.customNodes.filter(node => {
                return node.name?.toLowerCase().includes(search) ||
                       node.author?.toLowerCase().includes(search) ||
                       node.description?.toLowerCase().includes(search) ||
                       node.nodes.some(tag => tag.toLowerCase().includes(search)) ||
                       node.id === Number(search)
            }))
        })

        const filteredNodes = computed(() => {
            return allFilteredNodes.value.slice(0, take.value)
        })

        const hasMoreNodes = computed(() => {
            return allFilteredNodes.value.length > take.value
        })
        
        function setupIntersectionObserver() {
            // Disconnect existing observer
            if (observer.value) {
                observer.value.disconnect()
                observer.value = null
            }

            // Wait for next tick to ensure DOM is updated
            nextTick(() => {
                if (!loadMoreRef.value || !hasMoreNodes.value) return

                observer.value = new IntersectionObserver(
                    (entries) => {
                        const [entry] = entries
                        if (entry.isIntersecting && hasMoreNodes.value) {
                            loadMore()
                        }
                    },
                    {
                        root: null,
                        rootMargin: '50px',
                        threshold: 0.1
                    }
                )

                observer.value.observe(loadMoreRef.value)
            })
        }

        function loadMore() {
            take.value += 50
        }

        // Reset pagination when search changes
        watch(() => [searchTerm.value, typeFilter.value], () => {
            take.value = 50
            localStorage.setItem(`gateway:BrowseCustomNodes`, JSON.stringify(unRefs({
                searchTerm,
                typeFilter,
            })))
        })

        // Re-setup observer when hasMoreNodes changes
        watch(hasMoreNodes, (newValue) => {
            if (newValue) {
                setupIntersectionObserver()
            }
        })

        onMounted(async () => {
            const prefs = storageObject(`gateway:BrowseCustomNodes`)
            searchTerm.value = prefs.searchTerm || ''
            typeFilter.value = prefs.typeFilter || 'Most Popular'

            // Set up intersection observer when component mounts

            // Setup intersection observer after loading is complete and DOM is updated
            await nextTick()
            setupIntersectionObserver()
        })

        onUnmounted(() => {
            if (observer.value) {
                observer.value.disconnect()
            }
        })

        return {
            store,
            installer,
            searchTerm,
            typeFilter,
            loading,
            totalAvailableNodes,
            allFilteredNodes,
            filteredNodes,
            hasMoreNodes,
            loadMoreRef,
            expandNodes,
            loadMore,
        }
    }
}

const InstallCustomNodes = {
    template: `

      <div class="mt-8 mb-16">
        <form class="mt-4 max-w-lg mx-auto space-y-4" @submit.prevent="install">
          <div class="flex space-x-2">
            <div class="flex-grow">
              <TextInput id="url" v-model="request.url" label="Git or Python URL" />              
            </div>
          </div>
          <div class="mt-8 flex justify-center">
            <PrimaryButton :disabled="installer.isNodeInstalling(request)"
                           :color="installer.isNodeInstalling(request) ? 'red' : 'indigo'">
              {{ installer.isNodeInstalling(request) ? 'Installing Custom Node...' : 'Install Custom Node' }}
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
            [...new Set([...Object.keys(installer.device.models)])]
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase())))

        const request = ref(new InstallCustomNode({
            deviceId: installer.deviceId,
        }))

        async function install() {
            const dto = request.value
            dto.token = token.value?.value

            if (await installer.installCustomNode(dto)) {
                request.value = new InstallCustomNode({
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
        BrowseCustomNodes,
        InstallCustomNodes,
    },
    template:`
    <div class="h-full flex flex-col bg-white dark:bg-gray-900">

      <div>
        <div class="mt-4 max-w-xl mx-auto">
          <nav class="isolate flex divide-x divide-gray-200 dark:divide-gray-700 rounded-lg shadow-sm"
               aria-label="Tabs">
            <div v-for="(tab, tabIdx) in ['Installed Nodes', 'Browse Nodes', 'Install Custom']" :key="tab"
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
      
      <BrowseCustomNodes v-if="show === 'Browse Nodes'" />
      <InstallCustomNodes v-else-if="show === 'Install Custom'" />
      
      <div v-else>
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <!-- Search Input -->
            <div class="relative w-64">
              <input
                  v-model="searchTerm"
                  type="text"
                  placeholder="Search Custom Nodes..."
                  class="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ filteredNodes.length }} of {{ totalNodes }} custom nodes
            </div>
            
          </div>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="filteredNodes.length" class="grid gap-4 grid-cols-1 lg:grid-cols-2">

            <div v-for="node in filteredNodes" :key="node" 
                 class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">

              <div class="flex justify-between w-full">
                <div class="flex-grow">
                  <div class="flex items-end justify-between">
                    <span>{{ node.name }}</span>
                    <div v-if="node.stars" class="pr-2 text-xs text-yellow-500 dark:text-yellow-400">
                      {{ humanifyNumber(node.stars) + ' ' + pluralize('star', node.stars) }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ node.url }}</div>
                </div>
                <div>
                  <button type="button"
                          @click="installer.uninstallNode(node.url)"
                          :disabled="installer.isNodeUninstalling(node.url)"
                          class="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          :title="installer.isNodeUninstalling(node.url) ? 'Uninstalling...' : 'Uninstall custom node'">
                    <svg v-if="!installer.isNodeUninstalling(node.url)" class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <div v-if="node.nodes.length" class="mt-1 space-x-1 space-y-1">
                  <div v-for="nodeDef in expandedNodes[node.url] ? node.nodes : node.nodes.slice(0,3)" :key="nodeDef"
                       class="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/50 dark:ring-indigo-700/50">
                    {{ nodeDef }}
                  </div>
                  <div v-if="!expandedNodes[node.url] && node.nodes.length > 3" @click="expandedNodes[node.url] = true" 
                       class="ml-1 cursor-help inline-flex text-xs text-gray-500 dark:text-gray-400"
                       :title="node.nodes.slice(3).join(' ')">
                    + {{ node.nodes.length - 3 }} more
                  </div>
                </div>
              </div>              
              
            </div>
          </div>
          <div v-else-if="totalNodes === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No custom nodes installed
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            No nodes match your search
          </div>
        </div>
      </div>
    </div>        
    `,
    setup(props) {
        const store = inject('store')
        const installer = inject('installer')
        const client = useClient()
        
        const show = ref('')
        const searchTerm = ref('')
        const totalNodes = computed(() => installer.device.installedNodes.length)
        const expandedNodes = ref({})

        function sortNodes(installedNodes) {
            // sort installed first, then alphabetical
            return installedNodes.sort((a, b) => {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            })
        }

        const filteredNodes = computed(() => {
            if (!installer.device.installedCustomNodes) return []
            const installedNodes = installer.device.installedCustomNodes
            
            if (!searchTerm.value.trim()) 
                return sortNodes(installedNodes)

            const search = searchTerm.value.toLowerCase().trim()
            return sortNodes(installedNodes.filter(node => {
                return node.url.includes(search)
            }))
        })

        onMounted(async () => {
            const prefs = storageObject(`gateway:DeviceCustomNodes`)
            if (!Object.keys(prefs).length) {
                show.value = 'Installed Nodes'
            } else {
                show.value = prefs.show ?? 'Installed Nodes'
            }
        })

        function savePrefs() {
            localStorage.setItem(`gateway:DeviceCustomNodes`, JSON.stringify({
                show: show.value,
            }))
        }

        watch(() => [show.value], savePrefs)

        return {
            store,
            installer,
            show,
            searchTerm,
            totalNodes,
            filteredNodes,
            expandedNodes,
        }
    }
}
