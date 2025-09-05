import { ref, computed, inject, onMounted, onUnmounted } from "vue"
import { PrimaryButton, SecondaryButton } from "@servicestack/vue"
import { InstallModel, InstallCustomNode, InstallPipPackage } from "../../mjs/dtos.mjs"
import { leftPart, rightPart } from "@servicestack/client"

const Installing = {
    template:`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 16h4v4H4V16z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin=".2" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M10 16h4v4h-4V16z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin=".4" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M16 16h4v4h-4V16z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin=".6" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M4 10h4v4H4V10z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin=".8" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M10 10h4v4h-4V10z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin="1" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M16 10h4v4h-4V10z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin="1.2" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M4 4h4v4H4V4z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin="1.4" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M10 4h4v4h-4V4z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin="1.6" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path><path fill="currentColor" d="M16 4h4v4h-4V4z" class="st0"><animate fill="remove" accumulate="none" additive="replace" attributeName="opacity" begin="1.8" calcMode="linear" dur="3s" keyTimes="0;0.9;1" repeatCount="indefinite" restart="always" values="1;0;0"/></path></svg>
    `,
}

export default {
    methods: {rightPart},
    components: {
        PrimaryButton,
        SecondaryButton,
        Installing,
    },
    template: `
    <div class="fixed inset-0 z-50 overflow-y-auto" @click.stop="$emit('done')">
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"></div>
        <div class="flex min-h-full items-start justify-center p-4 pt-8 sm:pt-12">
            <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-4xl max-h-[90vh] flex flex-col"
                 @click.stop>
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="flex-shrink-0 h-12 w-12">
                                <img v-if="workflow.posterImage" 
                                     class="h-12 w-12 rounded-lg object-cover" 
                                     :src="workflow.posterImage" 
                                     :alt="workflow.name">
                                <div v-else class="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                    Install {{ workflow.name }}
                                </h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    Version {{ workflow.version }} • {{ formatCategory(workflow.info?.type) }}
                                </p>
                            </div>
                        </div>
                        <button @click="$emit('done')" type="button"
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6">
                    <div v-if="error" class="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                        <div class="flex">
                            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Installation Error</h3>
                                <div class="mt-2 text-sm text-red-700 dark:text-red-300">{{ error }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Installation Progress -->
                    <div v-if="installing" class="mb-6 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                        <div class="flex items-center">
                            <svg class="animate-spin h-5 w-5 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div>
                                <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">Installing Requirements</h3>
                                <div class="mt-1 text-sm text-blue-700 dark:text-blue-300">{{ installer.status }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Requirements Overview -->
                    <div class="mb-6">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Installation Requirements</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                <div class="flex">
                                    <svg class="size-10 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                    </svg>
                                    <div>
                                        <div class="text-sm font-medium text-green-800 dark:text-green-200">Models</div>
                                        <div class="text-lg font-semibold text-green-900 dark:text-green-100">{{ modelCount }}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                <div class="flex">
                                    <svg class="size-10 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                                    </svg>
                                    <div>
                                        <div class="text-sm font-medium text-purple-800 dark:text-purple-200">Custom Nodes</div>
                                        <div class="text-lg font-semibold text-purple-900 dark:text-purple-100">{{ nodeCount }}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                                <div class="flex">
                                    <svg class="size-10 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                    </svg>
                                    <div>
                                        <div class="text-sm font-medium text-orange-800 dark:text-orange-200">Packages</div>
                                        <div class="text-lg font-semibold text-orange-900 dark:text-orange-100">{{ packageCount }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Requirements -->
                    <div class="space-y-6">
                        <!-- Models -->
                        <div v-if="modelCount > 0">
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                <svg class="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                </svg>
                                Required Models ({{ modelCount }})
                            </h4>
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div class="space-y-2">
                                    <div v-for="asset in workflow.info?.assets || []" :key="asset.asset" 
                                         class="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border">
                                        <div class="flex items-center">
                                            <div class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-sm" :title="asset.asset">{{ asset.asset }}</div>
                                            <div v-if="asset.url" class="ml-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" :title="rightPart(asset.url, '@')">
                                                {{ rightPart(asset.url, '@') }}
                                            </div>
                                        </div>
                                        <div class="flex items-center">
                                            <span v-if="installer.isModelInstalled(asset.asset)" 
                                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                                Installed
                                            </span>
                                            <span v-else-if="installer.isModelInstalling(asset.asset)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                <Installing class="h-3 w-3 mr-1" />
                                                Installing
                                            </span>
                                            <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                </svg>
                                                Required
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Custom Nodes -->
                        <div v-if="nodeCount > 0">
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                <svg class="h-4 w-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                                </svg>
                                Required Custom Nodes ({{ nodeCount }})
                            </h4>
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div class="space-y-2">
                                    <div v-for="node in workflow.info?.customNodes || []" :key="node" 
                                         class="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border">
                                        <div class="text-sm font-medium text-gray-900 dark:text-white">{{ node }}</div>
                                        <div class="flex items-center">
                                            <span v-if="installer.isNodeInstalled(node)" 
                                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                                Installed
                                            </span>
                                            <span v-else-if="installer.isNodeInstalling(node)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                <Installing class="h-3 w-3 mr-1" />
                                                Installing
                                            </span>
                                            <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                </svg>
                                                Required
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Packages -->
                        <div v-if="packageCount > 0">
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                <svg class="h-4 w-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                </svg>
                                Required Packages ({{ packageCount }})
                            </h4>
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div class="space-y-2">
                                    <div v-for="pkg in workflow.info?.pipPackages || []" :key="pkg" 
                                         class="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border">
                                        <div class="text-sm font-medium text-gray-900 dark:text-white">{{ pkg }}</div>
                                        <div class="flex items-center">
                                            <span v-if="installer.isPackageInstalled(pkg)" 
                                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                                Installed
                                            </span>
                                            <span v-else-if="installer.isPackageInstalling(pkg)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                <Installing class="h-3 w-3 mr-1" />
                                                Installing
                                            </span>
                                            <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                </svg>
                                                Required
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                            {{ totalRequirements }} total requirements • {{ installedCount }} already installed
                        </div>
                        <div class="flex space-x-3">
                            <SecondaryButton @click="$emit('done')">
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton v-if="missingCount" @click="installAll" :disabled="installing || totalRequirements === 0">
                                <svg v-if="installing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {{ installing ? 'Installing...' : 'Install All (' + missingCount + ')' }}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    emits: ['done'],
    props: {
        workflow: Object,
    },
    setup(props, { emit }) {
        const installer = inject('installer')
        const installStatus = ref('')
        const error = ref('')

        const modelCount = computed(() => props.workflow.info?.assets?.length || 0)
        const nodeCount = computed(() => props.workflow.info?.customNodes?.length || 0)
        const packageCount = computed(() => props.workflow.info?.pipPackages?.length || 0)
        const totalRequirements = computed(() => modelCount.value + nodeCount.value + packageCount.value)

        const installedCount = computed(() => {
            let count = 0

            // Count installed models
            if (props.workflow.info?.assets) {
                count += props.workflow.info.assets.filter(asset =>
                    installer.isModelInstalled(asset.asset)
                ).length
            }

            // Count installed nodes
            if (props.workflow.info?.customNodes) {
                count += props.workflow.info.customNodes.filter(node =>
                    installer.isNodeInstalled(node)
                ).length
            }

            // Count installed packages
            if (props.workflow.info?.pipPackages) {
                count += props.workflow.info.pipPackages.filter(pkg =>
                    installer.isPackageInstalled(pkg)
                ).length
            }

            return count
        })
        
        const installing = computed(() => {
            let count = 0

            // Count installed models
            if (props.workflow.info?.assets) {
                count += props.workflow.info.assets.filter(asset =>
                    installer.isModelInstalling(asset.asset)
                ).length
            }

            // Count installed nodes
            if (props.workflow.info?.customNodes) {
                count += props.workflow.info.customNodes.filter(node =>
                    installer.isNodeInstalling(node)
                ).length
            }

            // Count installed packages
            if (props.workflow.info?.pipPackages) {
                count += props.workflow.info.pipPackages.filter(pkg =>
                    installer.isPackageInstalling(pkg)
                ).length
            }

            return count > 0
        })

        const missingCount = computed(() => totalRequirements.value - installedCount.value)

        function formatCategory(type) {
            if (!type) return ''
            return type.toString().replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
        }

        async function installAll() {
            if (installing.value || totalRequirements.value === 0) return

            error.value = ''

            // Install models
            if (props.workflow.info?.assets) {
                for (const asset of props.workflow.info.assets) {
                    if (!installer.isModelInstalled(asset.asset)) {
                        // Create InstallModel DTO
                        const dto = new InstallModel({
                            deviceId: installer.deviceId,
                            url: asset.url,
                            saveTo: leftPart(asset.asset, '/'),
                            fileName: rightPart(asset.asset, '/'),
                        })
                        await installer.installCustomModel(dto)
                    }
                }
            }

            // Install custom nodes
            if (props.workflow.info?.customNodes) {
                for (const node of props.workflow.info.customNodes) {
                    if (!installer.isNodeInstalled(node)) {
                        const dto = new InstallCustomNode({
                            deviceId: installer.deviceId,
                            url: installer.urlToNode(node).url,
                        })
                        await installer.installCustomNode(dto)
                    }
                }
            }

            // Install packages
            if (props.workflow.info?.pipPackages) {
                for (const pkg of props.workflow.info.pipPackages) {
                    if (!installer.isPackageInstalled(pkg)) {
                        installStatus.value = `Installing package: ${pkg}`
                        await installer.installPackage(pkg)
                    }
                }
            }
        }

        onMounted(() => {
            installer.registerCloseHandler('workflows/versionId', () => {
                emit('done')
            })
        })

        return {
            installer,
            installing,
            installStatus,
            error,
            modelCount,
            nodeCount,
            packageCount,
            totalRequirements,
            installedCount,
            missingCount,
            formatCategory,
            installAll,
        }
    }
}
