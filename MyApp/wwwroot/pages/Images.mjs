import { ref, computed, onMounted, inject, watch, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useClient, useAuth } from "@servicestack/vue"
import { QueryArtifacts, SubmitArtifactModeration, RequeueGeneration } from "dtos.mjs"
import { AllCategories, reactionCounts, formatRating, getHDClass, humanifyNumber, isUserName } from "./lib/utils.mjs"
import RatingsDialog from "./components/RatingsDialog.mjs"
import VisibilityIcon from "./components/VisibilityIcon.mjs"
import ArtifactMenu from "./components/ArtifactMenu.mjs"
import ArtifactReactions from "./components/ArtifactReactions.mjs"
import RatingsBadge from "./components/RatingsBadge.mjs"

export const ArtifactImage = {
    template:`<div v-if="artifact" class="overflow-hidden" :style="store.getBackgroundStyle(artifact) + ';' + imageStyle">
      <img :alt="artifact.prompt" :width="width" :height="height" :class="imageClass"
           :src="store.assetUrl(imageSrc)" :loading="loading || 'lazy'" :onerror="store.imgOnError(artifact.url)">
  </div>`,
    props: {
        /** @type {import('vue').PropType<Artifact>} */
        artifact:Object,
        imageClass:String,
        imageStyle: String,
        minSize:Number,
        /** @type {import('vue').PropType<'eager'|'lazy'>} */
        loading:String,
    },
    setup(props) {
        const store = inject('store')
        const imageSrc = ref(null)
        const hasError = ref(false)

        // Update image source when props change
        watch(() => [props.artifact, props.minSize], () => {
            if (props.artifact) {
                imageSrc.value = store.getPublicUrl(props.artifact, props.minSize)
                hasError.value = false
            }
        }, { immediate: true })

        const width = computed(() => !props.minSize ? props.artifact.width
            : (props.artifact?.width > props.artifact.height
                ? (props.artifact.width / props.artifact.height) * props.minSize
                : props.minSize))

        const height = computed(() => !props.minSize ? props.artifact.height
            : (props.artifact.height > props.artifact.width
                ? (props.artifact.height / props.artifact.width) * props.minSize
                : props.minSize))
        
        return { store, width, height, imageSrc }
    }
}

export default {
    components: {
        ArtifactImage,
        ArtifactMenu,
        RatingsDialog,
        VisibilityIcon,
        ArtifactReactions,
        RatingsBadge,
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
                            <span v-else-if="$route.query.similar">similar images</span>
                            <span v-else-if="$route.query.user && isUserName($route.query.user)">
                              <img class="ml-2 size-8 rounded-full inline-block" :src="'/avatar/' + $route.query.user" :alt="$route.query.user + ' avatar'">  
                              {{ $route.query.user }} images
                            </span>
                            <span v-else-if="$route.query.user">user images</span>
                            <span v-else-if="$route.query.category">{{$route.query.category}} images</span>
                            <span v-else>images</span>
                        </h1>
                    </div>
                    <!-- Search and Filters -->
                    <div class="flex flex-col sm:flex-row gap-2 items-center">
                        <div class="flex flex-col sm:flex-row gap-2 items-center">
                            <div class="relative">
                                <input v-model="txtSearch"
                                    type="text"
                                    placeholder="Search images..."
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
                            <option value="-width">Landscape First</option>
                            <option value="-height">Portrait First</option>
                            <option value="-resolution">High Resolution</option>
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
                                @click="$router.push({ path: '/images', query: { ...route.query, version:undefined, category:undefined, tag:undefined, similar:undefined } })"
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
                                v-for="category in AllCategories"
                                :key="category"
                                @click="$router.push({ path: '/images', query: { ...route.query, category } })"
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
            <div v-if="loading && !filteredImages.length" class="flex justify-center items-center py-20">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <div class="text-red-600 dark:text-red-400">
                    <svg class="mx-auto h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p class="text-lg font-medium">Failed to load images</p>
                    <p class="text-sm mt-2">{{ error }}</p>
                    <button type="button"
                        @click="loadImages"
                        class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>

            <!-- Image Gallery -->
            <div v-else class="max-w-[180rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <!-- Masonry Grid -->
                <div class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 3xl:columns-6 4xl:columns-7 gap-3 space-y-3" @click="closeMenu">
                    <div
                        v-for="(image, index) in filteredImages"
                        :key="image.id"
                        class="group cursor-pointer break-inside-avoid mb-3"
                        :class="getGridItemClass(image)"
                        @click="openLightbox(image, index)"
                        @contextmenu.prevent.stop="showContextMenu($event, image)"
                    >
                        <div class="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gray-100 dark:bg-gray-800" 
                            title="Ctrl+Click to View Post" @click.ctrl.prevent="$router.push({ path:'/generations/' + image.generationId })">
                            <div v-if="getHDClass(image.width, image.height)" class="absolute top-1 left-1 flex items-center inline-flex rounded-sm bg-gray-200/50 dark:bg-gray-700/50 px-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10">
                              {{getHDClass(image.width, image.height)}}
                            </div>
                            <div v-if="store.isAdmin && image.rating" class="absolute bottom-9 right-1 flex items-center inline-flex rounded-sm bg-gray-200/50 dark:bg-gray-700/50 px-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10">
                                {{formatRating(image.rating)}}
                            </div>
                            <ArtifactImage
                                :artifact="toArtifact(image)"
                                :minSize="300"
                                imageClass="w-full h-full object-cover"
                                loading="lazy"                                
                            />
                    
                            <div class="p-1 flex flex-wrap justify-between text-sm group-hover:opacity-0 transition-all duration-200">
                                <!-- Cosmetic only -->
                                <ArtifactReactions :artifact="image" @changed="image.reactions = $event.reactions" />
                            </div>

                            <!-- Hamburger Menu Button -->
                            <div class="absolute top-2 right-2 z-30">
                                <button @click.stop="toggleMenu($event, image)"
                                        class="p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-black/70 transition-opacity duration-200">
                                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="1"/>
                                        <circle cx="12" cy="5" r="1"/>
                                        <circle cx="12" cy="19" r="1"/>
                                    </svg>
                                </button>
                            </div>

                            <!-- Overlay -->
                            <div class="absolute bottom-0 left-0 right-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <div class="mb-1.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 w-full">
                                    <div class="p-2">
                                        <div class="flex items-center justify-between text-sm">
                                            <RatingsBadge v-if="image.rating" :artifact="image" size="xs" />
                                            <p class="truncate">{{ image.width }} × {{ image.height }}</p>
                                            <p v-if="image.credits" class="flex items-center justify-end text-xs font-medium text-yellow-500 dark:text-yellow-400" title="Credits Used">
                                               <svg class="size-4 mr-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none"><path fill="currentColor" d="M11.5 13.8h-1.063c-1.53 0-2.294 0-2.583-.497s.088-1.162.844-2.491l2.367-4.167c.375-.66.563-.99.749-.94c.186.049.186.428.186 1.187V9.7c0 .236 0 .354.073.427s.191.073.427.073h1.063c1.53 0 2.294 0 2.583.497s-.088 1.162-.844 2.491l-2.367 4.167c-.375.66-.563.99-.749.94C12 18.247 12 17.868 12 17.109V14.3c0-.236 0-.354-.073-.427s-.191-.073-.427-.073"></path><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle></g></svg>
                                               {{image.credits}}
                                            </p>
                                        </div>
                                        <div class="mt-1 flex items-center justify-between text-sm">
                                          <RouterLink @click.stop v-if="image.workflowId" :to="{ query: { version: image.versionId } }" class="text-sm truncate hover:text-sky-500 dark:hover:text-sky-400">
                                            {{store.workflows.find(x => x.id === image.workflowId)?.name}}
                                          </RouterLink>
                                          <RouterLink @click.stop v-if="image.userName" :to="{ query: { user: image.userName } }" class="flex items-center space-x-1 text-xs opacity-75" :title="'Explore @' + image.userName + ' images'">
                                            <img class="mt-1 ml-1 size-4 rounded-full" :src="'/avatar/' + image.userName" :alt="image.userName + ' avatar'">
                                            <p v-if="image.userKarma" class="text-yellow-700 dark:text-yellow-300 hover:text-sky-500 dark:hover:text-sky-400 font-medium lg:block">{{humanifyNumber(image.userKarma)}}</p>
                                          </RouterLink>
                                        </div>
                                    </div>
                                    <ArtifactReactions class="px-0.5" :artifact="image" @changed="image.reactions = $event.reactions" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ArtifactMenu v-if="menu" :menu="menu" @close="closeMenu" @delete="deleteImage" />

                <div v-if="!store.selectedRatings?.length" class="flex justify-center items-center">                    
                    <VisibilityIcon>No Visible Ratings Selected</VisibilityIcon>
                </div>
                <!-- Load More Button -->
                <div v-else-if="hasMore && !loading" class="text-center">
                    <button type="button"
                        @click="loadMore"
                        class="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Load More Images
                    </button>
                </div>

                <!-- Empty State -->
                <div v-if="filteredImages.length === 0 && !loading" class="text-center py-20">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No images found</h3>
                    <p class="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                </div>
                <div ref="refBottom"></div>
            </div>

            <!-- Lightbox Modal -->
            <div
                v-if="selectedImage"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                @click="closeLightbox"
            >
                <div class="relative max-w-7xl max-h-full p-4" @click.stop>
                    <!-- Close Button -->
                    <button type="button"
                        @click="closeLightbox"
                        class="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 text-white opacity-40 hover:bg-black/70 hover:opacity-100 transition-all duration-300"
                    >
                        <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <!-- Navigation Buttons -->
                    <button type="button"
                        v-if="selectedIndex > 0"
                        @click="previousImage"
                        class="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/20 text-white opacity-40 hover:bg-black/70 hover:opacity-100 transition-all duration-300"
                    >
                        <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button type="button"
                        v-if="selectedIndex < filteredImages.length - 1"
                        @click="nextImage"
                        class="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/20 text-white opacity-40 hover:bg-black/70 hover:opacity-100 transition-all duration-300"
                    >
                        <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <!-- Image -->
                    <img
                        :src="store.assetUrl(selectedImage.url)"
                        :onerror="store.imgOnError(selectedImage.url)"
                        :alt="selectedImage.prompt || 'Generated image'"
                        class="max-w-full max-h-full object-contain rounded-lg"
                        :width="selectedImage.width"
                        :height="selectedImage.height"
                        :style="store.getBackgroundStyle(selectedImage)"
                        @click.ctrl="$router.push({ path:'/generations/' + selectedImage.generationId })"
                    >

                    <!-- Image Info -->
                    <div class="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-4 rounded-b-lg">
                        <div class="flex justify-between items-start">
                            <div class="min-w-24">
                                <div class="whitespace-nowrap">
                                    <RatingsBadge class="-ml-1" :artifact="selectedImage" />
                                    <RouterLink :to="{ path:'/generate/feed', query: { 'new':'', remix: selectedImage.generationId } }"
                                            class="ml-1 rounded inline-flex items-center gap-1 px-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium shadow transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                            title="Remix this generation with the same settings">
                                        remix
                                    </RouterLink>
                                </div>
                                <p class="mt-2 font-medium text-sm">{{ selectedImage.width }} × {{ selectedImage.height }}</p>
                                <div class="mt-1 flex items-center">
                                    <RouterLink :to="{ path:'/generations/' + selectedImage.generationId }" 
                                        class="text-sm" 
                                        title="View Post">
                                        <div class="flex items-center hover:text-sky-500 dark:hover:text-sky-400">
                                            <svg class="size-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6zM13 3v2h4.586l-7.793 7.793l1.414 1.414L19 6.414V11h2V3z"></path></svg>
                                            <a :href="'/generations/' + selectedImage.generationId" class="text-sm"> post </a>
                                        </div>
                                    </RouterLink>
                                    <RouterLink :to="{ path:'/images', query: { similar: selectedImage.id } }"
                                        class="ml-1 hover:text-sky-500 dark:hover:text-sky-400"
                                        title="Explore Similar Images">
                                        <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"></path></svg>
                                    </RouterLink>
                                </div>
                            </div>
                            <div class="text-right flex flex-wrap gap-1">
                                <RouterLink :to="{ path:'/images', query: { category } }" v-for="(score,category) of selectedImage.categories ?? []" 
                                    class="cursor-pointer inline-flex items-center rounded-md bg-gray-200/50 dark:bg-gray-700/50 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500">
                                    {{category}}
                                </RouterLink>
                                <RouterLink :to="{ path:'/images', query: { tag } }" v-for="(score,tag) of selectedImage.tags ?? []" 
                                    class="cursor-pointer inline-flex items-center rounded-md bg-gray-200/50 dark:bg-gray-700/50 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500">
                                    {{tag}}
                                </RouterLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <RatingsDialog v-if="showRatingsPicker" @done="showRatingsPicker=false" />

        </div>
    `,
    setup() {
        const client = useClient()
        const store = inject('store')
        const { user, isAdmin } = useAuth()
        const route = useRoute()
        const router = useRouter()

        // Reactive state
        const images = ref([])
        let imageMap = {}
        const loading = ref(true)
        const error = ref(null)
        const txtSearch = ref(route.query.search ?? '')
        const sortBy = ref(store.prefs.sortBy ?? '-createdDate')
        const selectedImage = ref(null)
        const selectedIndex = ref(-1)
        const currentPage = ref(0)
        const pageSize = ref(120) // Moderate increase from 100 to balance performance and loading frequency
        const totalImages = ref(0)
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
        const showRatingsPicker = ref(false)
        const showAllCategories = ref(false)
        const visibleCategoriesCount = ref(15) // Number of categories to show in collapsed state

        // Computed properties
        const filteredImages = computed(() => {
            let filtered = [...images.value]

            // Hidden images filter
            filtered = filtered.filter(img => !store.hiddenImages.includes(img.id))

            // Rating filter - now supports multiple ratings
            filtered = filtered.filter(img =>
                img.rating && store.selectedRatings.includes(img.rating)
            )

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
        
        // Grid item class for responsive layout
        function getGridItemClass(image) {
            if (!image.width || !image.height) return ""

            const aspectRatio = image.width / image.height

            // Wide images span 2 columns on larger screens
            if (aspectRatio > 1.5) {
                return "md:col-span-2"
            }

            // Tall images span 2 rows on larger screens
            if (aspectRatio < 0.7) {
                return "md:row-span-2"
            }

            return ""
        }

        // Methods
        async function loadImages(reset = false) {
            try {
                if (!store.selectedRatings.length)
                    return
                
                loading.value = true
                error.value = null

                if (reset) {
                    currentPage.value = 0
                    images.value = []
                    imageMap = {}
                    hasMore.value = true
                }

                if (sortBy.value) {
                    store.setPrefs({ sortBy: sortBy.value })
                } 
                
                const request = new QueryArtifacts({
                    skip: currentPage.value * pageSize.value,
                    take: pageSize.value,
                    search: route.query.search,
                    ratings: store.selectedRatings,
                    category: route.query.category,
                    tag: route.query.tag,
                    versionId: route.query.version,
                    user: route.query.user,
                    similar: route.query.similar,
                    orderBy: sortBy.value
                })

                const response = await client.api(request)

                if (response.succeeded) {
                    const newImages = response.response.results.filter(img => img.type === "Image")
                    store.saveArtifacts(response.response.results)

                    if (reset) {
                        images.value = newImages
                        imageMap = newImages.reduce((acc, img) => {
                            acc[img.id] = img
                            return acc
                        }, {})
                    } else {
                        const duplicateIds = []
                        newImages.forEach(img => {
                            if (!imageMap[img.id]) {
                                images.value.push(img)
                                imageMap[img.id] = img
                            } else {
                                duplicateIds.push(img.id)
                            }
                        })
                        if (duplicateIds.length) {
                            console.log('Duplicate images:', duplicateIds)
                        }
                    }

                    totalImages.value = response.response.total
                    hasMore.value = newImages.length === pageSize.value
                    currentPage.value++
                } else {
                    error.value = response.error?.message || "Failed to load images"
                }
            } catch (err) {
                error.value = err.message || "An unexpected error occurred"
            } finally {
                loading.value = false
            }
        }

        async function loadMore() {
            if (!loading.value && hasMore.value) {
                await loadImages(false)
            }
        }

        function openLightbox(image, index) {
            selectedImage.value = image
            selectedIndex.value = index
            document.body.style.overflow = "hidden"
        }

        function closeLightbox() {
            selectedImage.value = null
            selectedIndex.value = -1
            document.body.style.overflow = "auto"
        }

        function previousImage() {
            if (selectedIndex.value > 0) {
                selectedIndex.value--
                selectedImage.value = filteredImages.value[selectedIndex.value]
            }
        }

        function nextImage() {
            if (selectedIndex.value < filteredImages.value.length - 1) {
                selectedIndex.value++
                selectedImage.value = filteredImages.value[selectedIndex.value]
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

        // Watchers
        watch(() => [store.selectedRatings, sortBy, 
            route.query.search, route.query.category, route.query.tag], () => {
            // Reset pagination when filters change
            if (selectedImage.value) {
                closeLightbox()
            }
            loadImages(true)
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
            switch (event.key) {
                case "Escape":
                    if (selectedImage.value) {
                        closeLightbox()
                    } else if (menu.value.show) {
                        closeMenu()
                    }
                    break
                case "ArrowLeft":
                    if (selectedImage.value) {
                        previousImage()
                    }
                    break
                case "ArrowRight":
                    if (selectedImage.value) {
                        nextImage()
                    }
                    break
            }
        }

        function toArtifact(image) {
            return {
                width: image.width,
                height: image.height,
                url: image.url,
                filePath: image.url,
                rating: image.rating,
                phash: image.phash,
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
        
        function deleteImage(image) {
            console.log('deleteImage', image)
            images.value = images.value.filter(x => x.id !== image.id)
        }

        async function handleRatingChange(rating, image) {
            try {
                const request = new SubmitArtifactModeration({
                    id: image.id,
                    rating: rating
                })

                const response = await client.api(request)

                if (response.succeeded) {
                    // Update the local image rating
                    image.rating = rating
                    console.log(`Updated image ${image.id} rating to ${rating}`)
                } else {
                    console.error('Failed to update rating:', response.error)
                }
            } catch (err) {
                console.error('Error updating rating:', err)
            } finally {
                closeMenu()
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
                    path: '/images',
                    query: { ...route.query, search: txtSearch.value }
                })
            }, 300)
        }

        // Lifecycle
        onMounted(() => {
            loadImages(true)
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
            refBottom,
            AllCategories,
            route,
            store,
            user,
            isAdmin,
            images,
            loading,
            error,
            txtSearch,
            sortBy,
            selectedImage,
            selectedIndex,
            totalImages,
            hasMore,
            filteredImages,
            menu,
            showRatingsPicker,
            showAllCategories,
            visibleCategoriesCount,
            getGridItemClass,
            loadImages,
            loadMore,
            openLightbox,
            closeLightbox,
            previousImage,
            nextImage,
            reactionCounts,
            formatDate,
            formatRating,
            toArtifact,
            toggleMenu,
            showContextMenu,
            closeMenu,
            deleteImage,
            handleRatingChange,
            debounceSearch,
            getHDClass,
        }
    }
}
