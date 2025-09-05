import { computed, inject, ref } from "vue"

const requiredPackages = [
    "servicestack", "onnxruntime", "ultralytics", "supervision", "git+https://github.com/openai/CLIP.git"
]

export default {
    template:`
    <div class="h-full flex flex-col bg-white dark:bg-gray-900">
        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Python Pip Packages</h2>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ filteredPackages.length }} of {{ totalPackages }} packages
                </div>
            </div>
            <div class="flex items-center justify-between">
              <!-- Search Input -->
              <div class="relative w-64">
                <input
                    v-model="searchTerm"
                    type="text"
                    placeholder="Search Installed Packages..."
                    class="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
              <form class="flex space-x-2" @submit.prevent="installer.installPackage(newPackage)">
                <input type="text" v-model="newPackage" placeholder="Install pip package" 
                       class="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <PrimaryButton :disabled="!newPackage || installer.isPackageInstalling(newPackage)"
                               :color="installer.isPackageInstalling(newPackage) ? 'red' : 'indigo'">
                  <span class="whitespace-nowrap">
                  {{ installer.isPackageInstalling(newPackage) ? 'Installing Package...' : 'Install Package' }}
                  </span>
                </PrimaryButton>
              </form>
            </div>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
            <div v-if="filteredPackages.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="pkg in filteredPackages" :key="pkg" 
                     class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4 overflow-hidden">
                  <div class="flex flex-col">
                    <label class="whitespace-nowrap overflow-hidden text-ellipsis lg:max-w-76"
                           :class="requiredPackages.includes(pkg) ? 'text-gray-500 dark:text-gray-400' : ''"
                           :title="pkg">{{ pkg }}</label>
                  </div>
                  <button v-if="requiredPackages.includes(pkg)" type="button" disabled 
                          title="Comfy Agent required package can't be uninstalled"
                          class="p-2 ">
                    <svg class="size-5 text-gray-400 dark:text-gray-500 cursor-not-allowed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10m-4.906-3.68L18.32 7.094A8 8 0 0 1 7.094 18.32M5.68 16.906A8 8 0 0 1 16.906 5.68z"/></svg>
                  </button>
                  <button v-else type="button"
                    @click="installer.uninstallPackage(pkg)"
                    :disabled="installer.isPackageUninstalling(pkg)"
                    class="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    :title="installer.isPackageUninstalling(pkg) ? 'Uninstalling...' : 'Uninstall &quot;' + pkg + '&quot; pip package'"
                  >
                    <svg v-if="!installer.isPackageUninstalling(pkg)" class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <svg v-else class="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </button>
                </div>
            </div>
            <div v-else-if="totalPackages === 0" class="text-sm text-gray-500 dark:text-gray-400">
                No additional python packages installed
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                No packages match your search
            </div>
        </div>
    </div>        
    `,
    setup(props) {
        const installer = inject('installer')

        const searchTerm = ref('')
        const newPackage = ref('')
        const totalPackages = computed(() => installer.device.installedPip?.length || 0)

        const filteredPackages = computed(() => {
            if (!installer.device.installedPip) return []
            if (!searchTerm.value.trim()) return installer.device.installedPip

            const search = searchTerm.value.toLowerCase().trim()
            return installer.device.installedPip.filter(pkg =>
                pkg.toLowerCase().includes(search)
            )
        })

        return {
            installer,
            searchTerm,
            newPackage,
            totalPackages,
            filteredPackages,
            requiredPackages,
        }
    }
}
