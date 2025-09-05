import { computed, inject, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuth, useClient } from "@servicestack/vue"
import { QueryArtifacts, SubmitArtifactModeration } from "../mjs/dtos.mjs"
import { AudioCategories, KeyCodes, formatRating, getHDClass, reactionCounts, isUserName } from "./lib/utils.mjs"
import AudioPlayer from "./components/AudioPlayer.mjs"
import VisibilityIcon from "./components/VisibilityIcon.mjs"
import ArtifactMenu from "./components/ArtifactMenu.mjs"
import ArtifactReactions from "./components/ArtifactReactions.mjs"

export default {
    components: {
        AudioPlayer,
        ArtifactMenu,
        VisibilityIcon,
        ArtifactReactions,
    },
    template:`
        <div class="min-h-screen bg-white dark:bg-gray-900">
            <!-- Header -->
            <div class="pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div class="px-2 flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                            <span v-if="store.workflows.find(x => x.version.id == $route.query.version)">
                                {{store.workflows.find(x => x.version.id == $route.query.version)?.name}}
                                Gallery
                            </span>
                            <span v-else-if="$route.query.similar">similar audios</span>
                          <span v-else-if="$route.query.user && isUserName($route.query.user)">
                            <img class="ml-2 size-8 rounded-full inline-block" :src="'/avatar/' + $route.query.user" :alt="$route.query.user + ' avatar'">
                            {{ $route.query.user }} audios
                            </span>
                          <span v-else-if="$route.query.user">user audios</span>
                            <span v-else-if="$route.query.category">{{$route.query.category}} audios</span>
                            <span v-else>audios</span>
                        </h1>
                    </div>
                    <!-- Search and Filters -->
                    <div class="flex flex-col sm:flex-row gap-2 items-center">
                        <div class="flex flex-col sm:flex-row gap-2 items-center">
                            <div class="relative">
                                <input v-model="txtSearch"
                                    type="text"
                                    placeholder="Search audios..."
                                    class="w-full sm:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                           focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    @input="debounceSearch"
                                >
                                <svg class="absolute right-2.5 top-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        <select v-model="sortBy"
                            class="border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            <option value="-createdDate">Newest First</option>
                            <option value="-reactionsCount">Most Reactions</option>
                            <option value="createdDate">Oldest First</option>
                            <option value="-modifiedDate">Recently Modified</option>
                            <option value="-duration">Longest First</option>
                            <option value="duration">Shortest First</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Category Filter Pills -->
            <div class="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                <div class="w-full px-2 py-1">
                    <div class="flex items-center gap-3">
                        <!-- Categories Container -->
                        <div :class="[
                            'flex gap-1.5 min-w-0 flex-1 hide-scrollbar',
                            showAllCategories ? 'flex-wrap' : 'overflow-x-auto'
                        ]">
                            <!-- All Categories Pill -->
                            <button type="button"
                                @click="$router.push({ path: '/audio', query: { ...route.query, version:undefined, category:undefined, tag:undefined, similar:undefined } })"
                                :class="[
                                    'whitespace-nowrap px-2 rounded-sm font-normal text-sm transition-all duration-200',
                                    !route.query.version && !route.query.category && !route.query.tag && !route.query.similar
                                        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 border border-indigo-400 dark:border-indigo-500'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                ]"
                            >
                                all
                            </button>

                            <!-- Individual Category Pills -->
                            <button type="button"
                                v-for="category in AudioCategories"
                                :key="category"
                                @click="$router.push({ path: '/audio', query: { ...route.query, category } })"
                                :class="[
                                    'whitespace-nowrap px-2 rounded-sm font-normal text-sm transition-all duration-200',
                                    route.query.category === category
                                        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 border border-indigo-400 dark:border-indigo-500'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                ]"
                            >
                                {{ category.toLowerCase() }}
                            </button>
                        </div>

                        <div>
                            <!-- Expand/Collapse Button (Always Visible) -->
                            <button type="button"
                                @click="showAllCategories = !showAllCategories"
                                class="flex-shrink-0 px-2 rounded-full font-normal text-sm transition-all duration-200 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                {{ showAllCategories ? '−' : '+' }}
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading && !filteredAudios.length" class="flex justify-center items-center py-20">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <div class="text-red-600 dark:text-red-400">
                    <svg class="mx-auto h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p class="text-lg font-medium">Failed to load audios</p>
                    <p class="text-sm mt-2">{{ error }}</p>
                    <button type="button"
                        @click="loadAudios"
                        class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>

            <!-- Audio Gallery -->
            <div v-else-if="playAudio?.url" class="relative max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
                style="background-image: url(/img/bg-audio.svg); background-position: left top; background-repeat: repeat-x; background-size: 100% 80px;">

              <div class="z-10 flex items-center">
                <div class="flex-grow my-2 border-2 border-gray-700 max-w-3xl mx-auto rounded-lg overflow-hidden">
                  <AudioPlayer ref="refAudio" :src="playAudio?.url" :clsFilter="cls => cls.replace('dark:bg-black/70', 'dark:bg-black/20')"/>
                </div>
                <div class="space-y-2">
                  <RouterLink :to="{ path:'/generate/feed', query: { 'new':'', remix: playAudio.generationId } }"
                              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                              title="Remix this generation with the same settings">
                    Remix
                  </RouterLink>
                  <RouterLink :to="{ path:'/generations/' + playAudio.generationId }"
                              class="text-sm"
                              title="View Post">
                    <div class="flex items-center hover:text-sky-500 dark:hover:text-sky-400">
                      <svg class="size-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6zM13 3v2h4.586l-7.793 7.793l1.414 1.414L19 6.414V11h2V3z"></path></svg>
                      <a :href="'/generations/' + playAudio.generationId" class="text-sm"> post </a>
                    </div>
                  </RouterLink>
                  <RouterLink v-if="playAudio.createdBy" :to="{ query: { user: playAudio.createdBy } }"
                              class="mt-2 flex items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400"
                              title="Explore User Audios">
                    <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a5 5 0 1 1-5 5l.005-.217A5 5 0 0 1 12 2m2 12a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5z"/></svg>
                    <span>by user</span>
                  </RouterLink>
                </div>
              </div>

              <div v-if="Object.keys(playAudio.tags ?? {}).length" class="my-2">

                  <div class="flex flex-wrap gap-2">
                    <!-- Categories Section -->
                    <RouterLink :to="{ query: { category } }" v-for="(score, category) in playAudio.categories ?? {}"
                                :key="'cat-' + category"
                                class="group cursor-pointer relative inline-flex items-center rounded-full overflow-hidden px-3 py-1 text-xs font-medium ring-1 ring-inset hover:dark:bg-blue-900 hover:dark:ring-blue-500/80"
                                :class="score 
                                    ? 'text-blue-800 dark:text-blue-200 ring-blue-600/20 dark:ring-blue-400/30' 
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 ring-blue-600/20 dark:ring-blue-400/30'"
                                :title="'Score: ' + (score ? Math.round(score * 100) + '%' : 'No score')">
                      <!-- Background fill based on score -->
                      <div v-if="score"
                           class="group-hover:hidden absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-400 dark:from-blue-700 dark:to-blue-800"
                           :style="{ width: Math.round(score * 100) + '%' }"></div>
                      <!-- Light background for unfilled area -->
                      <div v-if="score"
                           class="group-hover:hidden absolute inset-0 bg-blue-100 dark:bg-blue-900/30"></div>
                      <!-- Text content -->
                      <span class="relative z-10">{{ category }}</span>
                    </RouterLink>

                    <RouterLink :to="{ query: { tag } }"  v-for="(score, tag) in playAudio.tags ?? {}"
                                :key="'tag-' + tag"
                                class="group cursor-pointer relative inline-flex items-center rounded-full overflow-hidden px-3 py-1 text-xs font-medium ring-1 ring-inset hover:dark:bg-green-900 hover:dark:ring-green-600/80"
                                :class="score 
                                    ? 'text-emerald-800 dark:text-emerald-200 ring-emerald-600/20 dark:ring-emerald-400/30' 
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 ring-emerald-600/20 dark:ring-emerald-400/30'"
                                :title="'Score: ' + (score ? Math.round(score * 100) + '%' : 'No score')">
                      <!-- Background fill based on score -->
                      <div v-if="score"
                           class="group-hover:hidden absolute inset-0 bg-gradient-to-r from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800"
                           :style="{ width: Math.round(score * 100) + '%' }"></div>
                      <!-- Light background for unfilled area -->
                      <div v-if="score"
                           class="group-hover:hidden absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30"></div>
                      <!-- Text content -->
                      <span class="relative z-10">{{ tag }}</span>
                    </RouterLink>
                </div>
              </div>
              
              <div v-if="playAudio?.description" class="mb-4 text-center">
                {{ playAudio.description }}
              </div>

              <!-- Audio Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" @click="closeMenu">
                    <div
                        v-for="(audio, index) in filteredAudios"
                        :key="audio.id"
                        class="group cursor-pointer"
                        @click.stop="toggleAudioPlayback(audio)"
                        @contextmenu.prevent.stop="showContextMenu($event, audio)"
                    >
                        <div class="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gray-100 dark:bg-gray-800"
                             :class="audio.id === playAudio.id ? 'ring-2 ring-fuchsia-700' : ''"
                             title="Ctrl+Click to View Post" @click.ctrl.prevent="$router.push({ path:'/generations/' + audio.generationId })">

                          <!-- Audio Waveform/Icon Display -->
                            <div class="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center relative">
                                <div class="mt-8 text-center">
                                    <svg class="group-hover:opacity-50 mx-auto h-16 w-16 text-purple-600 dark:text-purple-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                    <!-- Description -->
                                    <div v-if="audio.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2 group-hover:opacity-0">
                                        <p class="line-clamp-2 leading-tight">{{ audio.description }}</p>
                                    </div>
                                </div>

                              <!-- Description Overlay -->
                                <div v-if="audio.description" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3">
                                    <p class="text-white text-xs text-center line-clamp-8 leading-tight">
                                        {{ audio.description }}
                                    </p>
                                </div>
                            </div>

                            <!-- Play/Pause Button -->
                            <div class="absolute top-2 left-2">
                                <button class="p-2 rounded-full bg-black/50 text-white opacity-70 hover:opacity-100 hover:bg-black/70 transition-all duration-200"
                                        :title="isPlaying(audio) ? 'Pause' : 'Play'">
                                    <svg v-if="!isPlaying(audio)" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                    </svg>
                                </button>
                            </div>

                          <div v-if="audio.workflowId" class="absolute top-2 w-full flex group-hover:opacity-10 transition-all duration-200">
                            <div class="mx-auto text-center text-sm bg-black/50 rounded-full px-3 py-1 text-gray-300">
                              {{store.workflows.find(x => x.id === audio.workflowId)?.name}}                              
                            </div>
                          </div>

                          <!-- Hamburger Menu Button -->
                            <div class="absolute top-2 right-2 z-30">
                                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:hidden">
                                  {{ formatDuration(audio.audio?.duration || audio.duration) }}
                                </p>
                                <button @click.stop="toggleMenu($event, audio)"
                                        class="p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-black/70 transition-opacity duration-200">
                                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="1"/>
                                        <circle cx="12" cy="5" r="1"/>
                                        <circle cx="12" cy="19" r="1"/>
                                    </svg>
                                </button>
                            </div>

                        </div>

                        <!-- Visible Reactions -->
                        <div class="mt-2">
                            <ArtifactReactions :artifact="audio" @changed="audio.reactions = $event.reactions" />
                        </div>
                    </div>
                </div>

                <ArtifactMenu v-if="menu" :menu="menu" @close="closeMenu" @delete="deleteAudio" />

                <div v-if="!store.selectedRatings?.length" class="flex justify-center items-center">
                    <VisibilityIcon>No Visible Ratings Selected</VisibilityIcon>
                </div>
                <!-- Load More Button -->
                <div v-else-if="hasMore && !loading" class="text-center">
                    <button type="button"
                        @click="loadMore"
                        class="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Load More Audios
                    </button>
                </div>

                <!-- Empty State -->
                <div v-if="filteredAudios.length === 0 && !loading" class="text-center py-20">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No audios found</h3>
                    <p class="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                </div>
                <div ref="refBottom"></div>
            </div>

        </div>
    `,
    setup() {
        const client = useClient()
        const store = inject('store')
        const { user, isAdmin } = useAuth()
        const route = useRoute()
        const router = useRouter()

        // Reactive state
        const refAudio = ref()
        const images = ref([])
        let audioMap = {}
        const loading = ref(true)
        const error = ref(null)
        const txtSearch = ref(route.query.search ?? '')
        const sortBy = ref(store.prefs.sortBy ?? '-createdDate')

        const currentPage = ref(0)
        const pageSize = ref(120) // Moderate increase from 100 to balance performance and loading frequency
        const totalAudios = ref(0)
        const hasMore = ref(true)
        const refBottom = ref(null)
        const intersectionObserver = ref(null)
        const gapMonitorInterval = ref(null)
        const menu = ref({
            show: false,
            x: 0,
            y: 0,
            image: null
        })
        const showAllCategories = ref(false)
        const visibleCategoriesCount = ref(15) // Number of categories to show in collapsed state
        const playAudio = ref(null) // Audio to play in bottom player

        // Computed properties
        const filteredAudios = computed(() => {
            let filtered = [...images.value]

            // Sort
            filtered.sort((a, b) => {
                const aVal = a[sortBy.value]
                const bVal = b[sortBy.value]

                if (sortBy.value.includes("Date")) {
                    return new Date(bVal) - new Date(aVal) // Newest first
                }

                return (bVal || 0) - (aVal || 0) // Largest first for dimensions
            })

            return filtered
        })


        // Methods
        async function loadAudios(reset = false) {
            try {
                // if (!store.selectedRatings.length)
                //     return

                loading.value = true
                error.value = null

                if (reset) {
                    currentPage.value = 0
                    images.value = []
                    audioMap = {}
                    hasMore.value = true
                }

                if (sortBy.value) {
                    store.setPrefs({ sortBy: sortBy.value })
                }

                const request = new QueryArtifacts({
                    skip: currentPage.value * pageSize.value,
                    take: pageSize.value,
                    type: 'Audio',
                    search: route.query.search,
                    category: route.query.category,
                    tag: route.query.tag,
                    versionId: route.query.version,
                    user: route.query.user,
                    similar: route.query.similar,
                    orderBy: sortBy.value,
                })

                const response = await client.api(request)
                if (response.succeeded) {
                    const newAudios = response.response.results.filter(img => img.type === "Audio")
                    // store.saveArtifacts(response.response.results)

                    if (reset) {
                        images.value = newAudios
                        audioMap = newAudios.reduce((acc, img) => {
                            acc[img.id] = img
                            return acc
                        }, {})
                    } else {
                        const duplicateIds = []
                        newAudios.forEach(img => {
                            if (!audioMap[img.id]) {
                                images.value.push(img)
                                audioMap[img.id] = img
                            } else {
                                duplicateIds.push(img.id)
                            }
                        })
                        if (duplicateIds.length) {
                            console.log('Duplicate audios:', duplicateIds)
                        }
                    }

                    if (!playAudio.value) {
                        startPlayingAudio(response.response.results[0])
                    }
                    totalAudios.value = response.response.total
                    hasMore.value = newAudios.length === pageSize.value
                    currentPage.value++
                } else {
                    error.value = response.error?.message || "Failed to load audios"
                }
            } catch (err) {
                error.value = err.message || "An unexpected error occurred"
            } finally {
                loading.value = false
            }
        }

        async function loadMore() {
            if (!loading.value && hasMore.value) {
                await loadAudios(false)
            }
        }

        function formatDate(dateString) {
            if (!dateString) return ""
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            })
        }

        function formatDuration(seconds) {
            if (!seconds) return "0:00"
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = Math.floor(seconds % 60)
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        }

        function formatFileSize(bytes) {
            if (!bytes) return "0 B"
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(1024))
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
        }

        function toggleAudioPlayback(audio) {
            if (playAudio.value === audio) {
                refAudio.value?.player?.toggle()
            } else {
                // Play new audio
                playAudio.value = audio
            }
        }

        function startPlayingAudio(audio) {
            playAudio.value = audio
        }

        function isPlaying(audio) {
            return refAudio.value?.player?.isPlaying && playAudio.value === audio
        }

        function toArtifact(audio) {
            return {
                url: audio.url,
                filePath: audio.url,
                rating: audio.rating,
                duration: audio.duration,
            }
        }

        // Menu functions
        function toggleMenu(event, artifact) {
            if (menu.value.show && menu.value.image === artifact) {
                closeMenu()
            } else {
                // Position menu below and to the left of the button
                const rect = event.target.closest('.relative').getBoundingClientRect()
                menu.value = {
                    show: true,
                    x: rect.right - 200, // Position menu to the left of the button
                    y: rect.top + 40, // Position below the button
                    artifact,
                }
            }
        }

        function showContextMenu(event, artifact) {
            // Position menu at cursor location for right-click
            menu.value = {
                show: true,
                x: event.clientX,
                y: event.clientY,
                artifact,
            }
        }

        function closeMenu() {
            menu.value.show = false
        }

        function deleteAudio(audio) {
            console.log('deleteAudio', audio)
            images.value = images.value.filter(x => x.id !== audio.id)
        }

        async function handleRatingChange(rating, audio) {
            try {
                const request = new SubmitArtifactModeration({
                    id: audio.id,
                    rating: rating
                })

                const response = await client.api(request)

                if (response.succeeded) {
                    // Update the local audio rating
                    audio.rating = rating
                    console.log(`Updated audio ${audio.id} rating to ${rating}`)
                } else {
                    console.error('Failed to update rating:', response.error)
                }
            } catch (err) {
                console.error('Error updating rating:', err)
            } finally {
                closeMenu()
            }
        }

        // Watchers
        watch(() => [store.selectedRatings, sortBy,
            route.query.search, route.query.category, route.query.tag], () => {
            // Reset pagination when filters change
            loadAudios(true)
            // Re-setup intersection observer and gap monitoring after filter changes
            setTimeout(() => {
                cleanupIntersectionObserver()
                stopGapMonitoring()
                setupIntersectionObserver()
                startGapMonitoring()
            }, 100)
        }, { deep: true })

        // Keyboard navigation
        function handleKeydown(event) {
            switch (event.keyCode) {
                case KeyCodes.Escape:
                    if (menu.value.show) {
                        closeMenu()
                    } else if (playAudio.value) {
                        refAudio.value?.player?.pause()
                    }
                    break
                case KeyCodes.Space:
                    refAudio.value?.player?.toggle()
                    event.preventDefault() 
                    break
                case KeyCodes.Left:
                    // play previous audio in results
                    const idxNext  = filteredAudios.value.findIndex(x => x.id === playAudio.value.id)
                    if (idxNext > 0) {
                        startPlayingAudio(filteredAudios.value[idxNext - 1])
                    }
                    event.preventDefault() 
                    break
                case KeyCodes.Right:
                    // play next audio in results
                    const idxPrev = filteredAudios.value.findIndex(x => x.id === playAudio.value.id)
                    if (idxPrev < filteredAudios.value.length - 1) {
                        startPlayingAudio(filteredAudios.value[idxPrev + 1])
                    }
                    event.preventDefault() 
                    break
            }
        }

        // Setup intersection observer for auto-loading
        function setupIntersectionObserver() {
            if (!refBottom.value) return

            intersectionObserver.value = new IntersectionObserver(
                async (entries) => {
                    const entry = entries[0]
                    if (entry.isIntersecting && hasMore.value && !loading.value) {
                        await loadMore()

                        // After loading completes, check if we need to load more to fill gaps
                        setTimeout(() => {
                            if (entry.isIntersecting && hasMore.value && !loading.value) {
                                // Re-trigger the intersection check
                                const entries = intersectionObserver.value?.takeRecords() || []
                                if (entries.length === 0) {
                                    // Force a re-check by temporarily unobserving and re-observing
                                    intersectionObserver.value?.unobserve(refBottom.value)
                                    intersectionObserver.value?.observe(refBottom.value)
                                }
                            }
                        }, 200)
                    }
                },
                {
                    rootMargin: '150px' // Start loading 150px before the element is visible (balanced approach)
                }
            )

            intersectionObserver.value.observe(refBottom.value)
        }

        // Cleanup intersection observer
        function cleanupIntersectionObserver() {
            if (intersectionObserver.value) {
                intersectionObserver.value.disconnect()
                intersectionObserver.value = null
            }
        }

        // Start monitoring for gaps periodically
        function startGapMonitoring() {
            // Clear any existing interval
            if (gapMonitorInterval.value) {
                clearInterval(gapMonitorInterval.value)
            }

            // Check for gaps every 3 seconds when not loading
            gapMonitorInterval.value = setInterval(() => {
                if (!loading.value && hasMore.value) {
                    const bottomRect = refBottom.value?.getBoundingClientRect()
                    // Only trigger gap monitoring if bottom is close to viewport
                    if (bottomRect && bottomRect.top < window.innerHeight * 1.5) {
                        loadMore()
                    }
                }
            }, 1000)
        }

        // Stop gap monitoring
        function stopGapMonitoring() {
            if (gapMonitorInterval.value) {
                clearInterval(gapMonitorInterval.value)
                gapMonitorInterval.value = null
            }
        }

        let debounceTimer = null
        function debounceSearch() {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
            }
            debounceTimer = setTimeout(() => {
                router.push({
                    path: '/audio',
                    query: { ...route.query, search: txtSearch.value }
                })
            }, 300)
        }

        // Lifecycle
        onMounted(() => {
            loadAudios(true)
            document.addEventListener("keydown", handleKeydown)
            // Setup intersection observer after the DOM is ready
            setTimeout(() => {
                setupIntersectionObserver()
                startGapMonitoring()
            }, 100)
        })

        onUnmounted(() => {
            document.removeEventListener("keydown", handleKeydown)
            document.body.style.overflow = "auto"
            cleanupIntersectionObserver()
            stopGapMonitoring()
        })
        
        return {
            store,
            refAudio,
            refBottom,
            AudioCategories,
            route,
            user,
            isAdmin,
            images,
            loading,
            error,
            txtSearch,
            sortBy,
            totalAudios,
            hasMore,
            filteredAudios,
            menu,
            showAllCategories,
            visibleCategoriesCount,
            loadAudios,
            loadMore,
            reactionCounts,
            formatDate,
            formatDuration,
            formatFileSize,
            formatRating,
            toArtifact,
            toggleMenu,
            showContextMenu,
            closeMenu,
            deleteAudio,
            handleRatingChange,
            debounceSearch,
            getHDClass,
            playAudio,
            toggleAudioPlayback,
            startPlayingAudio,
            isPlaying,
        }
    }
}