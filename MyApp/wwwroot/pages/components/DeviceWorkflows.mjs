import { computed, inject, onMounted, ref, watch } from "vue"
import WorkflowInstallationDialog from "./WorkflowInstallationDialog.mjs"
import { storageObject } from "../lib/utils.mjs"
import { useUtils } from "@servicestack/vue"
import { useRoute, useRouter } from "vue-router"
import { omit } from "@servicestack/client"

const { unRefs } = useUtils()

export default {
    components: {
        WorkflowInstallationDialog,
    },
    template:`
    <div class="h-full flex flex-col bg-white dark:bg-gray-900">
        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Install Workflows</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ filteredWorkflows.length }} of {{ totalWorkflows }} workflows
                </div>
            </div>
            <div class="flex items-center justify-between">
              <!-- Search Input -->
              <div class="relative w-64">
                <input
                    v-model="searchTerm"
                    type="text"
                    placeholder="Search for Workflows..."
                    class="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>

              <!-- Output Type Filters -->
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500 dark:text-gray-400">Filter by output:</span>
                <div class="flex space-x-1">
                  <button type="button"
                    v-for="outputType in outputTypes"
                    :key="outputType"
                    @click="toggleOutputFilter(outputType)"
                    :class="[
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150',
                      selectedOutputTypes.includes(outputType)
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    ]"
                  >
                    {{ outputType }}
                  </button>
                  <button
                    v-if="selectedOutputTypes.length > 0"
                    @click="clearOutputFilters"
                    class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                    title="Clear filters"
                  >
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="filteredWorkflows.length" class="overflow-x-auto">
                <!-- Table -->
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Workflow
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Version
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Type
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Requirements
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr v-for="version in filteredWorkflows" :key="version.id"
                            @click="openInstallDialog(version)"
                            class="hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-150 cursor-pointer group">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10">
                                        <img v-if="version.posterImage"
                                             class="h-10 w-10 rounded-lg object-cover"
                                             :src="version.posterImage"
                                             :alt="version.name">
                                        <div v-else class="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                                            {{ version.name }}
                                        </div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">
                                            {{ formatCategory(version.info?.type) }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    {{ version.version }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {{ formatWorkflowType(version.info?.input, version.info?.output) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex flex-wrap gap-1">
                                    <span v-if="getRequirementCount(version, 'assets') > 0"
                                          :title="getTitle(version, 'assets')"
                                          :class="[
                                              'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                                              getInstalledCount(version, 'assets') === getRequirementCount(version, 'assets')
                                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                          ]">
                                        {{ getInstalledCount(version, 'assets') }}/{{ getRequirementCount(version, 'assets') }} models
                                    </span>
                                    <span v-if="getRequirementCount(version, 'customNodes') > 0"
                                          :title="getTitle(version, 'customNodes')"
                                          :class="[
                                              'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                                              getInstalledCount(version, 'customNodes') === getRequirementCount(version, 'customNodes')
                                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                          ]">
                                        {{ getInstalledCount(version, 'customNodes') }}/{{ getRequirementCount(version, 'customNodes') }} nodes
                                    </span>
                                    <span v-if="getRequirementCount(version, 'pipPackages') > 0"
                                          :title="getTitle(version, 'pipPackages')"
                                          :class="[
                                              'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                                              getInstalledCount(version, 'pipPackages') === getRequirementCount(version, 'pipPackages')
                                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                          ]">
                                        {{ getInstalledCount(version, 'pipPackages') }}/{{ getRequirementCount(version, 'pipPackages') }} packages
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else-if="totalWorkflows === 0" class="flex flex-col items-center justify-center py-12">
                <svg class="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <p class="text-sm text-gray-500 dark:text-gray-400">No workflows currently available</p>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-12">
                <svg class="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p class="text-sm text-gray-500 dark:text-gray-400">No workflows match your search</p>
            </div>
        </div>

        <!-- Installation Dialog -->
        <WorkflowInstallationDialog v-if="selectedWorkflow" :workflow="selectedWorkflow"
            @done="$router.replace({ query:omit($route.query,['versionId']) })" />
    </div>
    `,
    emits: ['done'],
    setup(props, { emit }) {
        const store = inject('store')
        const installer = inject('installer')
        const route = useRoute()
        const router = useRouter()

        const searchTerm = ref('')
        const selectedWorkflow = ref(null)
        const selectedOutputTypes = ref([])
        const outputTypes = ['Image', 'Text', 'Video', 'Audio']
        const totalWorkflows = computed(() => store.workflowVersions.length)

        const filteredWorkflows = computed(() => {
            if (!store.workflowVersions) return []

            let filtered = store.workflowVersions

            // Apply search filter
            if (searchTerm.value.trim()) {
                const search = searchTerm.value.toLowerCase().trim()
                filtered = filtered.filter(x =>
                    x.name.toLowerCase().includes(search)
                )
            }

            // Apply output type filter
            if (selectedOutputTypes.value.length > 0) {
                filtered = filtered.filter(x => {
                    const outputType = x.info?.output?.toString()
                    return outputType && selectedOutputTypes.value.includes(outputType)
                })
            }

            // sort by reactionsCount
            filtered.sort((a, b) => b.reactionsCount - a.reactionsCount)
            return filtered
        })

        function formatCategory(type) {
            if (!type) return ''
            return type.toString().replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
        }

        function formatWorkflowType(input, output) {
            if (!input || !output) return ''
            const inputType = input.toString().replace(/([A-Z])/g, ' $1').trim()
            const outputType = output.toString().replace(/([A-Z])/g, ' $1').trim()
            return `${inputType} → ${outputType}`
        }

        function getRequirementCount(version, type) {
            if (!version.info) return 0
            const requirements = version.info[type]
            return Array.isArray(requirements) ? requirements.length : 0
        }

        function getInstalledCount(version, type) {
            if (!version.info) return 0
            const requirements = version.info[type]
            if (!Array.isArray(requirements)) return 0

            let installedCount = 0

            if (type === 'assets') {
                // For models/assets, check if each asset is installed
                installedCount = requirements.filter(asset =>
                    installer.isModelInstalled(asset.asset)
                ).length
            } else if (type === 'customNodes') {
                // For custom nodes, check if each node is installed
                installedCount = requirements.filter(node =>
                    installer.isNodeInstalled(node)
                ).length
            } else if (type === 'pipPackages') {
                // For packages, check if each package is installed
                installedCount = requirements.filter(pkg =>
                    installer.isPackageInstalled(pkg)
                ).length
            }

            return installedCount
        }
        
        function getTitle(version, type) {
            const installedCount = getInstalledCount(version, type)
            const requirementCount = getRequirementCount(version, type)
            const requirements = version.info[type]
            const missing = type === 'assets' 
                ? requirements.filter(x => !installer.isModelInstalled(x.asset)).map(x => x.asset)
                : type === 'customNodes'
                    ? requirements.filter(x => !installer.isNodeInstalled(x))
                    : type === 'pipPackages'
                        ? requirements.filter(x => !installer.isPackageInstalled(x))
                        : []
            if (missing.length) {
                const sep = requirements.length > 5 ? ', ' : '\n'
                return `Missing:\n${missing.join(sep)}`
            } else {
                const sep = requirements.length > 5 ? ', ' : '\n'
                return `${requirements.map(x => typeof x == 'string' ? x : x.asset).join(sep)}`
            }
        }

        function openInstallDialog(workflow) {
            router.replace({ query: { ...route.query, versionId: workflow.id } })
        }

        function toggleOutputFilter(outputType) {
            const index = selectedOutputTypes.value.indexOf(outputType)
            if (index >= 0) {
                selectedOutputTypes.value.splice(index, 1)
            } else {
                selectedOutputTypes.value.push(outputType)
            }
            savePrefs()
        }

        function clearOutputFilters() {
            selectedOutputTypes.value = []
            savePrefs()
        }
        function selectWorkflowVersion(versionId) {
            versionId = Number(versionId)
            if (versionId) {
                selectedWorkflow.value = store.workflowVersions.find(x => x.id === versionId)
            } else {
                selectedWorkflow.value = null
            }
        }

        onMounted(() => {
            const prefs = storageObject(`gateway:DeviceWorkflows`)
            if (!Object.keys(prefs).length) {
                selectedOutputTypes.value = ['Image']
            } else {
                selectedOutputTypes.value = prefs.selectedOutputTypes ?? []
            }
            selectWorkflowVersion(route.query.versionId)

            installer.registerCloseHandler('workflows', () => {
                if (!route.query.versionId) {
                    emit('done')
                }
            })
        })
        
        watch(() => [route.query.versionId], 
                id => selectWorkflowVersion(id))

        function savePrefs() {
            localStorage.setItem(`gateway:DeviceWorkflows`, JSON.stringify(unRefs({
                selectedOutputTypes,
            })))
        }
        
        watch(selectedWorkflow, savePrefs)

        return {
            installer,
            searchTerm,
            selectedWorkflow,
            selectedOutputTypes,
            outputTypes,
            totalWorkflows,
            filteredWorkflows,
            formatCategory,
            formatWorkflowType,
            getRequirementCount,
            getInstalledCount,
            openInstallDialog,
            toggleOutputFilter,
            clearOutputFilters,
            getTitle,
        }
    }
}
