import { ref, inject, onMounted } from "vue"
import { formatRating } from "./lib/utils.mjs"
import { toDate } from "@servicestack/client"
import ArtifactMenuHome from "./components/ArtifactMenuHome.mjs"

export default {
    components: {
        ArtifactMenuHome
    },
    template: `
    <ArtifactMenuHome />
    <!-- Hero Section -->
    <div class="relative overflow-hidden bg-gradient-to-b from-slate-900 to-gray-800 text-black dark:text-white">
        <!-- Gradient Overlay -->
        <div class="absolute inset-x-0 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-80">
            <div class="text-center">
                <h1 v-if="store.appConfig.featuredTitle" class="text-white text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    {{store.appConfig.featuredTitle}}
                </h1>
                <p v-if="store.appConfig.featuredSubTitle" class="mt-6 text-xl text-slate-300 max-w-3xl mx-auto">
                    {{store.appConfig.featuredSubTitle}}
                </p>
                <div>
                    <RouterLink to="/images" class="ml-2 text-sm text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400">
                        explore all images
                        <span>&rarr;</span>
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>

    <!-- Featured Artifacts Grid -->
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div v-if="artifacts.length > 0">
            <!-- Optimized grid for portrait images -->
            <div class="-mt-68 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                <div v-for="artifact in artifacts" :key="artifact.id" class="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <!-- Image Container with dynamic aspect ratio -->
                    <RouterLink :to="{ path:'/generations/' + artifact.generationId }">
                        <div class="overflow-hidden bg-gray-100 dark:bg-gray-700" :style="'aspect-ratio: ' + getAspectRatio(artifact)">
                            <img :src="artifact.url"
                                 alt="Generated artifact"
                                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                 loading="lazy"
                                 @contextmenu.prevent="events.publish('showArtifactMenu', { artifactId:artifact.id, event:$event })"
                                 @error="imageSrc=store.getArtifactImageErrorUrl(artifact.id, null, 300)" />
                        </div>
                    </RouterLink>
                    
                    <!-- Content -->
                    <div class="p-4">
                        <!-- Rating Badge -->
                        <div class="flex justify-between items-start mb-1">
                            <span :class="getRatingBadgeClass(artifact.rating) + ' px-2 py-1 text-xs font-medium rounded border-0'"
                                  style="border: 1px solid currentColor;">
                                {{ getRatingText(artifact.rating) }}
                            </span>
                            <!-- Dimensions -->
                            <div v-if="artifact.width && artifact.height" class="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                {{ artifact.width }} × {{ artifact.height }}
                            </div>
                            <div v-if="artifact.publishedDate" class="text-xs text-gray-500 dark:text-gray-400">
                                {{ formatDate(artifact.publishedDate) }}
                            </div>
                        </div>

                        <div class="mt-2 text-sm flex items-center space-x-1">
                            <RouterLink :to="{ path:'/images', query: { similar: artifact.id } }"
                                class="text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400"
                                title="Explore Similar Images">
                                <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"></path></svg>
                            </RouterLink>

                            <RouterLink v-if="store.workflows.find(x => x.id == artifact.workflowId)" :to="{ path:'/images', query: { version: artifact.versionId } }" 
                                class="text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400">
                                {{store.workflows.find(x => x.id == artifact.workflowId).name}}
                            </RouterLink>
                        </div>


                        <!-- Tags -->
                        <div v-if="Object.keys(artifact.tags ?? {}).length" class="flex flex-wrap gap-1 mt-2 items-center">
                            <RouterLink :to="{ path:'/images', query:{ tag:tag } }" v-for="tag in Object.keys(artifact.tags).slice(0, 3)" :key="tag.key" 
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                                {{ tag }}
                            </RouterLink>
                            <span v-if="Object.keys(artifact.tags).length > 3" class="text-xs text-gray-500 dark:text-gray-400">
                                +{{ Object.keys(artifact.tags).length - 3 }} more
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else>
            <!-- Empty State -->
            <div class="text-center py-16">
                <div class="mx-auto h-24 w-24 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No featured artifacts yet</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-400">
                    Start <RouterLink to="/generate" class="text-blue-500 dark:text-blue-400">Generating AI Content</RouterLink> now!
                </p>
            </div>
        </div>
    </div>
    `,
    setup() {
        const store = inject('store')
        const events = inject('events')
        const artifacts = ref([])

        onMounted(async () => {
            artifacts.value = await store.getFeaturedPortraitArtifacts(20)
        })

        function getRatingText(rating) {
            return rating === 'PG13' ? 'PG-13' : rating || 'Unrated'
        }

        function getAspectRatio(artifact) {
            if (artifact.width > 0 && artifact.height > 0) {
                return `${artifact.width} / ${artifact.height}`
            }
            // Default to portrait aspect ratio for AI-generated images
            return '3 / 4'
        }

        function getRatingBadgeClass(rating) {
            switch (rating) {
                // Adult ratings - Red
                case 'R':
                case 'X':
                case 'XXX':
                    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-red-600/40 dark:ring-red-400/50'
                // Mature rating - Orange/Amber
                case 'M':
                    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ring-amber-600/40 dark:ring-amber-400/50'
                // Safe ratings (PG, PG13) - Green
                default:
                    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-green-600/40 dark:ring-green-400/50'
            }
        }

        function formatDate(dateString) {
            if (!dateString) return ''
            const date = toDate(dateString)
            const ret = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (ret === 'Invalid Date') {
                console.error('Invalid date:', dateString)
                return ''
            }
            return ret
        }

        return {
            store,
            events,
            artifacts,
            getRatingText,
            getAspectRatio,
            getRatingBadgeClass,
            formatDate,
            formatRating,
        }
    }
}
