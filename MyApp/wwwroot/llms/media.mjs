import { ref, computed, inject, onMounted, onUnmounted } from "vue"
import { ThreadComments, ThreadReactions } from "./components/Threads.mjs"
import { VisibilityIcon, SignInModal } from "./components/VisibilityIcon.mjs"
import { UserAvatar } from "./components/UserAvatar.mjs"

const ThemeButton = {
    template: `
        <div :class="['rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg', preview.bgBody, preview.chromeBorder]" :title="JSON.stringify(preview, undefined, 2)">
            <button type="button" :key="id" @click="$emit('select', id)"
                class="flex w-full text-left">
                
                <div class="w-14 flex items-center justify-center border-r"
                    :class="[preview.bgSidebar, preview.icon, preview.chromeBorder]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"/></svg>
                </div>
                
                <div class="flex-1 flex items-center px-4 py-3 text-sm font-medium"
                    :class="[preview.bgBody, preview.heading]">
                    {{ name }}
                </div>
            </button>
        </div>
    `,
    props: {
        id: String,
        theme: Object
    },
    setup(props) {
        const ctx = inject('ctx')
        const name = computed(() => ctx.utils.idToName(props.id))
        const preview = computed(() => props.theme.preview)

        return {
            name,
            preview,
        }
    }
}

export const ThemeSelector = {
    components: {
        ThemeButton
    },
    template: `
    <div v-if="$state.themes" class="relative w-28 sm:w-32 text-left select-none inline-block align-middle" ref="menuContainer">
        <button type="button" @click.stop="toggleMenu"
            class="flex w-full items-center justify-between rounded-full px-2.5 py-1 border shadow-sm transition-colors text-xs"
            :class="[$styles.dropdownButton, $styles.chromeBorder]">
            <span class="flex items-center truncate">
                <svg class="mr-1 h-3.5 w-3.5 flex-shrink-0" :class="$styles.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"/></svg>
                <span class="font-medium truncate" :class="$styles.heading">{{ $utils.idToName($ctx.selectedTheme) || 'Select Theme' }}</span>
            </span>
            <svg class="h-3 w-3 opacity-70 flex-shrink-0" :class="$styles.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </button>

        <div v-if="showMenu"
            @click.stop
            class="absolute right-0 z-[110] mt-2 w-[20rem] sm:w-[34rem] origin-top-right rounded-lg focus:outline-none"
            role="menu" aria-orientation="vertical" tabindex="-1">
            
            <div class="max-h-96 overflow-y-auto w-full p-4 bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
                    <!-- Light Themes Column -->
                    <div class="flex flex-col space-y-3">
                        <div class="text-xs font-bold tracking-wider uppercase px-1" :class="$styles.muted">Light Themes</div>
                        <template v-for="(theme, id) in lightThemes" :key="id">
                            <ThemeButton :id="id" :theme="theme" @select="selectTheme" />
                        </template>
                    </div>

                    <!-- Dark Themes Column -->
                    <div class="flex flex-col space-y-3">
                        <div class="text-xs font-bold tracking-wider uppercase px-1" :class="$styles.muted">Dark Themes</div>
                        <template v-for="(theme, id) in darkThemes" :key="id">
                            <ThemeButton :id="id" :theme="theme" @select="selectTheme" />
                        </template>
                    </div>
                </div>
            </div>    
            
        </div>
    </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const showMenu = ref(false)
        const menuContainer = ref(null)
        const fullThemes = computed(() => ctx.resolveThemes(ctx.state.themes) || {})

        const lightThemes = computed(() => {
            const themes = {}
            const sortedEntries = Object.entries(fullThemes.value).sort((a, b) => {
                const idA = a[0]
                const idB = b[0]
                if (idA === 'light') return -1
                if (idB === 'light') return 1

                const nameA = (ctx.utils.idToName(idA) || '').toLowerCase()
                const nameB = (ctx.utils.idToName(idB) || '').toLowerCase()
                return nameA.localeCompare(nameB)
            })
            for (const [id, theme] of sortedEntries) {
                if (theme.vars.colorScheme !== 'dark') {
                    themes[id] = theme
                }
            }
            return themes
        })

        const darkThemes = computed(() => {
            const themes = {}
            const sortedEntries = Object.entries(fullThemes.value).sort((a, b) => {
                const idA = a[0]
                const idB = b[0]
                if (idA === 'dark') return -1
                if (idB === 'dark') return 1

                const nameA = (ctx.utils.idToName(idA) || '').toLowerCase()
                const nameB = (ctx.utils.idToName(idB) || '').toLowerCase()
                return nameA.localeCompare(nameB)
            })
            for (const [id, theme] of sortedEntries) {
                if (theme.vars.colorScheme === 'dark') {
                    themes[id] = theme
                }
            }
            return themes
        })

        function toggleMenu() {
            showMenu.value = !showMenu.value
        }

        function selectTheme(id) {
            ctx.selectTheme(id)
            showMenu.value = false
        }

        const handleClickOutside = (event) => {
            if (showMenu.value && menuContainer.value && !menuContainer.value.contains(event.target)) {
                showMenu.value = false
            }
        }

        onMounted(() => {
            document.addEventListener('click', handleClickOutside)
        })

        onUnmounted(() => {
            document.removeEventListener('click', handleClickOutside)
        })

        return {
            showMenu,
            menuContainer,
            lightThemes,
            darkThemes,
            toggleMenu,
            selectTheme
        }
    }
}

export function getRatingDisplay(media) {
    if (!media) return null
    // Check for direct rating first, then predicted rating
    if (media.rating) {
        // Convert rating enum value to string
        const ratingMap = { 1: 'PG', 2: 'PG13', 4: 'M', 8: 'R', 16: 'X', 32: 'XXX' }
        const ret = ratingMap[media.rating] || media.rating.toString()
        return ret === 'PG13' ? 'PG-13' : ret
    }
    return media.ratings?.predictedRating || null
}
export function getRatingColorClass(rating) {
    if (['R', 'X', 'XXX'].includes(rating)) {
        // Adult ratings - Red
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-red-600/40 dark:ring-red-400/50'
    } else if (rating === 'M') {
        // Mature rating - Orange/Amber
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ring-amber-600/40 dark:ring-amber-400/50'
    } else {
        // Safe ratings (PG, PG13) - Green
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-green-600/40 dark:ring-green-400/50'
    }
}

export function getRatingDescription(rating) {
    const descriptions = {
        'PG': 'Safe for work, family friendly content',
        'PG13': 'Teen appropriate content, mildly suggestive',
        'M': 'Mature content, strong language, suggestive content',
        'R': 'R-rated adult themes, strong language, partial nudity',
        'X': 'NSFW, Explicit sexual content, graphic nudity',
        'XXX': 'NSFW, Extreme explicit content, hardcore pornography'
    }
    return descriptions[rating] || 'Content rating'
}

export const RatingsBadge = {
    template: `
    <span v-if="getRatingDisplay(media)" 
          class="inline-flex items-center rounded-md font-bold ring-1 ring-inset transition-all duration-200 cursor-default"
          :class="(size==='lg' ? 'px-6 py-3 text-lg ' : size==='xs' ? 'px-1 py-0.5 text-xs ' : 'px-2 py-1 text-xs ') + getRatingColorClass(getRatingDisplay(media))"
          :title="getRatingDescription(getRatingDisplay(media))">
        {{ getRatingDisplay(media) }}
    </span>
    `,
    props: {
        media: Object,
        size: String,
    },
    setup() {
        return {
            getRatingDisplay,
            getRatingColorClass,
            getRatingDescription,
        }
    }
}

const App = {
    components: {
        SignInModal,
        ThemeSelector,
        ThemeButton,
        ThreadComments,
        ThreadReactions,
        RatingsBadge,
        VisibilityIcon,
        UserAvatar,
    },
    template: `
    <div class="min-h-screen transition-colors duration-300 bg-fixed relative" :class="$styles.app">
        <!-- Top Left Back Link -->
        <div class="absolute top-1 left-4 z-[100] select-none">
            <a href="/m" title="Back to Media Gallery"
                class="flex items-center gap-1.5 rounded-full px-2.5 py-1 border shadow-sm transition-colors text-xs"
                :class="[$styles.dropdownButton, $styles.chromeBorder]">
                <svg class="h-3.5 w-3.5 flex-shrink-0" :class="$styles.icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span class="font-medium" :class="$styles.heading">Gallery</span>
            </a>
        </div>

        <SignInModal v-if="$ctx.state.showSignIn" />
      
        <!-- Top Right Control Panel -->
        <div class="absolute top-1 right-20 flex items-center gap-3.5 z-[100] select-none">
            <span v-if="parsedMedia && parsedMedia.created" class="text-xs font-semibold" :class="[$styles.muted]" :title="formatDate(parsedMedia.created)">
                {{ formatRelative(parsedMedia.created) }}
            </span>
            <VisibilityIcon />
            <ThemeSelector />
            <UserAvatar />
        </div>
        <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8" :class="$styles.appInner">
            
            <!-- Error Screen -->
            <div v-if="error" class="mx-auto max-w-md mt-16 text-center">
                <div class="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl shadow-sm">
                    <div class="size-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Failed to load media</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ error.message || 'Unknown error' }}</p>
                </div>
            </div>

            <!-- No Media Screen -->
            <div v-else-if="!media" class="mx-auto max-w-md mt-16 text-center">
                <div class="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl shadow-sm">
                    <div class="size-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No media info</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">No media data is currently available.</p>
                </div>
            </div>

            <!-- Media Showcase Screen -->
            <div v-else class="mx-auto max-w-6xl">
                <!-- Header -->
                <div class="border-b pb-4 mb-6" :class="[$styles.chromeBorder]">
                    <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        {{ parsedMedia.caption || parsedMedia.name || 'Untitled Media' }}
                    </h1>
                </div>

                <!-- Content Layout -->
                <div class="flex flex-col lg:flex-row gap-8 items-start">
                    
                    <!-- Left Column: Showcase Panel -->
                    <div class="flex-1 w-full flex items-center justify-center rounded-2xl border relative overflow-hidden transition-all duration-300 min-h-[350px]"
                        :class="[
                            $styles.borderInput,
                            $styles.card,
                            parsedMedia.type === 'audio' 
                                ? 'p-0 audio-player-container shadow-xl' 
                                : 'p-6 bg-gray-50/50 dark:bg-gray-900/30'
                        ]">

                        <div class="w-full flex flex-col">

                            <!-- Image Showcase -->
                            <div v-if="parsedMedia.type.toLowerCase() === 'image'" class="w-full flex justify-center">
                                <img v-if="$ctx.isRatingViewable(parsedMedia)" :src="resolveUrl(parsedMedia.url)" :alt="parsedMedia.caption || parsedMedia.name || 'Image'" class="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-gray-200 dark:border-gray-800" />

                              <div v-else
                                   class="h-full w-full bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8">
                                <!-- Ratings Guard Overlay -->
                                <div class="text-center max-w-lg">
                                  <!-- Large Rating Tag -->
                                  <div class="flex justify-center mb-6">
                                    <RatingsBadge :media="parsedMedia" size="lg" />
                                  </div>
                                  <h3 class="text-xl font-semibold mb-3">Restricted Content</h3>
                                  <p class="text-sm text-gray-300 mb-4">
                                    This image is not within your current viewable ratings.
                                  </p>
                                  <div class="flex justify-center items-center">
                                    <VisibilityIcon>Adjust Visibility Ratings</VisibilityIcon>
                                  </div>
                                </div>
                              </div>
                            
                            </div>
                            
                            <!-- Audio Showcase -->
                            <div v-else-if="parsedMedia.type.toLowerCase() === 'audio'" class="w-full h-full flex flex-col items-center justify-between p-8 md:p-12 relative z-10 self-stretch min-h-[380px]">
                                <!-- SVG Backdrop -->
                                <div class="absolute inset-0 bg-cover bg-center pointer-events-none -z-10" style="background-image: url('img/bg-audio.svg');"></div>
                                
                                <!-- Glassmorphic card overlay for controls -->
                                <div class="absolute inset-0 audio-glass-overlay pointer-events-none -z-10"></div>

                                <!-- Audio element -->
                                <audio ref="refPlayer"
                                    :src="resolveUrl(parsedMedia.url)"
                                    @play="isPlaying = true" 
                                    @pause="isPlaying = false"
                                    @timeupdate="onTimeUpdate"
                                    @durationchange="onDurationChange"
                                />

                                <!-- Title / Info Header -->
                                <div class="text-center w-full max-w-xl">
                                    <span class="text-xs font-semibold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">Audio Preview</span>
                                    <h3 class="mt-2 text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 truncate drop-shadow-sm">
                                        {{ parsedMedia.name || parsedMedia.caption || 'Audio Track' }}
                                    </h3>
                                </div>

                                <!-- Controls Area -->
                                <div class="flex flex-col items-center gap-6 w-full max-w-xl my-4">
                                    <!-- Main Play Controls (Rewind, Play/Pause, Forward) -->
                                    <div class="flex items-center justify-center gap-6 md:gap-8">
                                        <!-- Rewind 10s -->
                                        <button type="button" @click="seekBy(-10)" class="audio-control-btn" title="Rewind 10s">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                            </svg>
                                        </button>

                                        <!-- Large Play/Pause Button -->
                                        <button type="button" @click="togglePlay" class="audio-play-button" title="Play/Pause">
                                            <!-- Pulsing ring when playing -->
                                            <span v-if="isPlaying" class="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping pointer-events-none"></span>
                                            
                                            <svg v-if="isPlaying" class="size-16 fill-white relative z-10" viewBox="0 0 24 24">
                                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                            </svg>
                                            <svg v-else class="size-16 fill-white translate-x-0.5 relative z-10" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </button>

                                        <!-- Forward 10s -->
                                        <button type="button" @click="seekBy(10)" class="audio-control-btn" title="Forward 10s">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <!-- Progress slider timeline -->
                                    <div class="w-full flex flex-col gap-1.5 mt-2">
                                        <div class="audio-slider-container">
                                            <div class="audio-slider-track">
                                                <div class="audio-slider-progress" :style="{ width: (duration ? (currentTime / duration) * 100 : 0) + '%' }"></div>
                                            </div>
                                            <input type="range" 
                                                min="0" 
                                                :max="duration || 100" 
                                                :value="currentTime" 
                                                @input="onSliderInput"
                                                class="audio-slider-input" 
                                            />
                                            <div class="audio-slider-thumb" :style="{ left: (duration ? (currentTime / duration) * 100 : 0) + '%' }"></div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                                            <span>{{ formatTime(currentTime) }}</span>
                                            <span>{{ formatTime(duration) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Bottom Auxiliary Controls (Volume Mute/Slider & Playback Speed) -->
                                <div class="w-full max-w-xl flex items-center justify-between border-t border-gray-200/20 dark:border-gray-800/20 pt-4 mt-2">
                                    <!-- Volume Section -->
                                    <div class="flex items-center gap-2 group/volume relative">
                                        <button type="button" @click="toggleMute" class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" :title="muted ? 'Unmute' : 'Mute'">
                                            <svg v-if="muted || volume === 0" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z" />
                                            </svg>
                                            <svg v-else-if="volume < 0.5" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                            </svg>
                                            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12a7.5 7.5 0 000-15M22.5 12a11.963 11.963 0 000-24" />
                                            </svg>
                                        </button>
                                        
                                        <div class="audio-slider-container w-20">
                                            <div class="audio-slider-track">
                                                <div class="audio-slider-progress" :style="{ width: (muted ? 0 : volume * 100) + '%' }"></div>
                                            </div>
                                            <input type="range" 
                                                min="0" 
                                                max="1" 
                                                step="0.05" 
                                                :value="muted ? 0 : volume" 
                                                @input="onVolumeInput"
                                                class="audio-slider-input" 
                                            />
                                            <div class="audio-slider-thumb" :style="{ left: (muted ? 0 : volume * 100) + '%' }"></div>
                                        </div>
                                    </div>

                                    <!-- Playback Rate Speed -->
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Speed:</span>
                                        <select :value="playbackRate" @change="onPlaybackRateChange" class="audio-speed-select">
                                            <option value="0.5">0.5x</option>
                                            <option value="1">1.0x</option>
                                            <option value="1.25">1.25x</option>
                                            <option value="1.5">1.5x</option>
                                            <option value="2">2.0x</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Unsupported Media Type -->
                            <div v-else class="w-full py-24 px-6 flex flex-col items-center gap-4 text-gray-500">
                                <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-sm font-medium">Unsupported media type: {{ parsedMedia.type }}</span>
                            </div>

                            <div class="my-2 w-72 mx-auto">
                                <ThreadReactions :threadId="thread.id" :reactions="thread.reactions" />
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Metadata Sidebar -->
                    <div class="w-full lg:w-[400px] shrink-0 space-y-6">

                        <!-- Details Card -->
                        <div class="p-6 rounded-2xl border" :class="[$styles.card]">

                            <div v-if="parsedMedia.rating || Object.keys(parsedMedia.tags ?? {}).length" class="mb-6">

                                <div class="mb-4">
                                    <div class="flex flex-wrap gap-2">
                                        <!-- Rating Tag -->
                                        <div v-if="parsedMedia.rating">
                                            <div class="flex flex-wrap gap-2">
                                                <RatingsBadge :media="parsedMedia" />
                                            </div>
                                        </div>
                                        <!-- Categories Section -->
                                        <div v-for="(score, category) in parsedMedia.categories ?? {}"
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
                                        </div>
                                    </div>
                                </div>

                                <!-- Tags Section -->
                                <div v-if="Object.keys(parsedMedia.tags ?? {}).length">
                                    <div class="flex flex-wrap gap-2">
                                        <div v-for="(score, tag) in parsedMedia.tags ?? {}"
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
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <h2 class="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2" :class="[$styles.heading, $styles.chromeBorder]">
                                Media Details
                            </h2>

                            <div class="space-y-6">
                                <!-- Model Name -->
                                <div v-if="parsedMedia.model">
                                    <span class="block text-xs font-bold uppercase tracking-wider mb-1.5" :class="[$styles.muted]">Model</span>
                                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-transparent">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {{ parsedMedia.model }}
                                    </div>
                                </div>

                                <!-- Prompt -->
                                <div v-if="parsedMedia.prompt">
                                    <span class="block text-xs font-bold uppercase tracking-wider mb-1.5" :class="[$styles.muted]">Prompt</span>
                                    <div class="relative group bg-gray-100 dark:bg-gray-900/50 p-3.5 pr-1 rounded-xl border border-gray-200 dark:border-gray-800" :class="[$styles.borderInput]">
                                        <button @click="copyToClipboard(parsedMedia.prompt)" 
                                                class="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-[10px] font-sans font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer"
                                                title="Copy prompt to clipboard">
                                            <span v-if="copied" class="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Copied!
                                            </span>
                                            <span v-else class="flex items-center gap-1">
                                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy
                                            </span>
                                        </button>
                                        <div class="max-h-48 overflow-y-auto custom-scrollbar text-xs font-mono text-gray-700 dark:text-gray-300 leading-relaxed pr-6">
                                            {{ parsedMedia.prompt }}
                                        </div>
                                    </div>
                                </div>

                                <!-- Specifications -->
                                <div>
                                    <span class="block text-xs font-bold uppercase tracking-wider mb-2" :class="[$styles.muted]">Specifications</span>
                                    <div class="grid grid-cols-2 gap-3 text-xs">
                                        <!-- Dimensions -->
                                        <div v-if="parsedMedia.width && parsedMedia.height" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">Dimensions</div>
                                            <div class="font-mono font-bold text-gray-800 dark:text-gray-200">{{ parsedMedia.width }} × {{ parsedMedia.height }}</div>
                                        </div>
                                        <!-- Duration (Audio only) -->
                                        <div v-if="parsedMedia.type && parsedMedia.type.toLowerCase() === 'audio'" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">Duration</div>
                                            <div class="font-mono font-bold text-gray-800 dark:text-gray-200">{{ formatDuration(duration || parsedMedia.duration) }}</div>
                                        </div>
                                        <!-- File Size -->
                                        <div v-if="parsedMedia.size" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">File Size</div>
                                            <div class="font-mono font-bold text-gray-800 dark:text-gray-200">{{ $fmt.bytes(parsedMedia.size) }}</div>
                                        </div>
                                        <!-- Aspect Ratio -->
                                        <div v-if="aspectRatio" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">Aspect Ratio</div>
                                            <div class="font-mono font-bold text-gray-800 dark:text-gray-200">{{ aspectRatio }}</div>
                                        </div>
                                        <!-- Seed -->
                                        <div v-if="parsedMedia.seed" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">Seed</div>
                                            <div class="font-mono font-bold text-gray-800 dark:text-gray-200">{{ parsedMedia.seed }}</div>
                                        </div>
                                        <!-- Cost -->
                                        <div v-if="parsedMedia.cost != null" class="p-3" :class="[$styles.infoCard]">
                                            <div class="mb-0.5 font-medium" :class="[$styles.muted]">Cost</div>
                                            <div class="font-mono font-bold text-green-600 dark:text-green-400">
                                                {{ parsedMedia.cost > 0 ? '$' + parsedMedia.cost.toFixed(5) : 'Free' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="pt-4 border-t flex flex-col gap-2" :class="[$styles.chromeBorder]">
                                    <a :href="resolveUrl(parsedMedia.url)" download class="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-2.5 px-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm" :class="$styles.primaryButton">
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download File
                                    </a>
                                </div>

                            </div>
                        </div>

                        <!-- Description Card -->
                        <div v-if="parsedMedia.description" class="px-2 rounded-2xl border max-h-84 overflow-auto" :class="[$styles.card]">
                            <div v-html="$fmt.markdown(parsedMedia.description)" class="prose prose-xs max-w-none dark:prose-invert description-content" :class="[$styles.muted]"></div>
                        </div>

                    </div>

                </div>

                <ThreadComments :thread="thread" class="mt-8 max-w-[45em]" />
            </div>
        </div>
    </div>
    `,
    setup(props) {
        const ctx = inject('ctx')
        const media = inject('media', null)
        const error = inject('error', null)
        const thread = inject('thread', null)

        // Audio player state
        const refPlayer = ref(null)
        const isPlaying = ref(false)
        const currentTime = ref(0)
        const duration = ref(0)
        const volume = ref(1.0)
        const muted = ref(false)
        const playbackRate = ref(1.0)

        const parsedMedia = computed(() => {
            if (!media) return null
            const item = { ...media }
            try {
                if (typeof item.category === 'string') item.category = JSON.parse(item.category)
            } catch (e) { }
            try {
                if (typeof item.tags === 'string') item.tags = JSON.parse(item.tags)
            } catch (e) { }
            try {
                if (typeof item.metadata === 'string') item.metadata = JSON.parse(item.metadata)
            } catch (e) { }
            return item
        })

        const aspectRatio = computed(() => {
            const media = parsedMedia.value
            if (!media) return null
            if (media.aspectRatio) return media.aspectRatio
            const { width, height } = media
            if (!width || !height) return null
            const gcd = (a, b) => b ? gcd(b, a % b) : a
            const d = gcd(width, height)
            const w = width / d
            const h = height / d
            // fall back to a decimal ratio when the reduced terms aren't meaningful (e.g. 683:512)
            return (w > 50 || h > 50)
                ? `${(width / height).toFixed(2)}:1`
                : `${w}:${h}`
        })

        const resolveUrl = (url) => {
            if (!url) return ''
            if (url.startsWith('http') || url.startsWith('/v1')) return url
            let cleaned = url
            if (cleaned.startsWith('~')) {
                cleaned = cleaned.substring(1)
            }
            if (!cleaned.startsWith('/')) {
                cleaned = '/' + cleaned
            }
            return cleaned
        }

        const formatRelative = (date) => {
            const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
            const diff = (new Date(date) - new Date()) / 1000; // seconds, negative = past

            const units = [
                ['year', 60 * 60 * 24 * 365],
                ['month', 60 * 60 * 24 * 30],
                ['day', 60 * 60 * 24],
                ['hour', 60 * 60],
                ['minute', 60],
                ['second', 1],
            ];

            for (const [unit, secs] of units) {
                if (Math.abs(diff) >= secs || unit === 'second') {
                    return rtf.format(Math.round(diff / secs), unit);
                }
            }
        };

        const formatDate = (val) => {
            if (!val) return ''
            const date = new Date(val)
            return date.toLocaleString()
        }

        const formatDuration = (sec) => {
            if (sec == null) return ''
            const s = Math.round(sec)
            const mins = Math.floor(s / 60)
            const secs = s % 60
            return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
        }

        onMounted(() => {
            const styleId = "custom-audio-player-styles"
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style")
                style.id = styleId
                style.textContent = `
                    .audio-player-container {
                        background-color: rgba(255, 255, 255, 0.15) !important;
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        position: relative;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    }
                    .dark .audio-player-container {
                        background-color: rgba(2, 6, 23, 0.25) !important;
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    .audio-glass-overlay {
                        background-color: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(0px);
                    }
                    .dark .audio-glass-overlay {
                        background-color: rgba(0, 0, 0, 0.1);
                        backdrop-filter: blur(0px);
                    }
                    .audio-play-button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 6rem;
                        height: 6rem;
                        border-radius: 9999px;
                        background: linear-gradient(135deg, #3b82f6, #4f46e5, #c084fc);
                        color: white;
                        box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        cursor: pointer;
                    }
                    .audio-play-button:hover {
                        background: linear-gradient(135deg, #60a5fa, #6366f1, #d8b4fe);
                        transform: scale(1.05);
                        box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.5), 0 10px 10px -5px rgba(79, 70, 229, 0.5);
                    }
                    .audio-play-button:active {
                        transform: scale(0.95);
                    }
                    .audio-control-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0.875rem;
                        border-radius: 9999px;
                        background-color: rgba(255, 255, 255, 0.8);
                        border: 1px solid rgba(229, 231, 235, 0.5);
                        color: #4b5563;
                        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                        transition: all 0.2s;
                        cursor: pointer;
                    }
                    .dark .audio-control-btn {
                        background-color: rgba(17, 24, 39, 0.8);
                        border: 1px solid rgba(31, 41, 55, 0.5);
                        color: #d1d5db;
                    }
                    .audio-control-btn:hover {
                        background-color: #ffffff;
                        color: #4f46e5;
                        transform: scale(1.05);
                    }
                    .dark .audio-control-btn:hover {
                        background-color: #1f2937;
                        color: #818cf8;
                    }
                    .audio-control-btn:active {
                        transform: scale(0.95);
                    }
                    .audio-slider-container {
                        position: relative;
                        width: 100%;
                        display: flex;
                        align-items: center;
                    }
                    .audio-slider-track {
                        position: absolute;
                        left: 0;
                        right: 0;
                        height: 6px;
                        background-color: rgba(229, 231, 235, 0.8);
                        border-radius: 9999px;
                        pointer-events: none;
                    }
                    .dark .audio-slider-track {
                        background-color: rgba(31, 41, 55, 0.8);
                    }
                    .audio-slider-progress {
                        height: 100%;
                        background: linear-gradient(90deg, #3b82f6, #6366f1);
                        border-radius: 9999px;
                    }
                    .audio-slider-thumb {
                        position: absolute;
                        width: 1rem;
                        height: 1rem;
                        background-color: #ffffff;
                        border-radius: 9999px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 2px solid #4f46e5;
                        pointer-events: none;
                        transform: translate(-50%, -50%);
                        top: 50%;
                        transition: transform 0.1s;
                    }
                    .audio-slider-input {
                        width: 100%;
                        height: 1.5rem;
                        opacity: 0;
                        cursor: pointer;
                        position: relative;
                        z-index: 10;
                    }
                    .audio-slider-container:hover .audio-slider-thumb {
                        transform: translate(-50%, -50%) scale(1.2);
                    }
                    .audio-speed-select {
                        font-size: 0.75rem;
                        font-weight: 700;
                        background-color: rgba(255, 255, 255, 0.5);
                        border: 1px solid rgba(229, 231, 235, 0.5);
                        border-radius: 0.5rem;
                        padding: 0.25rem 0.625rem;
                        color: #374151;
                        cursor: pointer;
                        outline: none;
                        transition: all 0.2s;
                        width: 5em;
                    }
                    .dark .audio-speed-select {
                        background-color: rgba(17, 24, 39, 0.5);
                        border-color: rgba(31, 41, 55, 0.5);
                        color: #d1d5db;
                    }
                    .audio-speed-select:focus {
                        border-color: #4f46e5;
                        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
                    }
                    .description-content {
                        font-size: 11px !important;
                        line-height: 1.45 !important;
                        opacity: 0.6 !important;
                    }
                    .description-content p {
                        font-size: 11px !important;
                        margin: 0.375rem 0 !important;
                    }
                    .description-content h1,
                    .description-content h2,
                    .description-content h3,
                    .description-content h4 {
                        font-size: 12px !important;
                        font-weight: 600 !important;
                        margin: 0.5rem 0 0.25rem 0 !important;
                    }
                    .description-content ul, 
                    .description-content ol {
                        font-size: 11px !important;
                        margin: 0.375rem 0 !important;
                        padding-left: 1.25rem !important;
                    }
                    .description-content li {
                        font-size: 11px !important;
                        margin: 0.25rem 0 !important;
                    }
                    .custom-scrollbar {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
                    }
                    .dark .custom-scrollbar {
                        scrollbar-color: rgba(156, 163, 175, 0.25) transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                        height: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: rgba(156, 163, 175, 0.4);
                        border-radius: 9999px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(156, 163, 175, 0.6);
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: rgba(156, 163, 175, 0.25);
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(156, 163, 175, 0.45);
                    }
                `
                document.head.appendChild(style)
            }
        })

        // Clipboard copy functionality
        const copied = ref(false)
        const copyToClipboard = async (text) => {
            try {
                await navigator.clipboard.writeText(text)
                copied.value = true
                setTimeout(() => {
                    copied.value = false
                }, 2000)
            } catch (err) {
                console.error('Failed to copy text: ', err)
            }
        }

        // Audio controls logic
        const togglePlay = () => {
            if (!refPlayer.value) return
            if (isPlaying.value) {
                refPlayer.value.pause()
            } else {
                refPlayer.value.play().catch(err => console.error("Error playing audio:", err))
            }
        }

        const seekBy = (seconds) => {
            if (!refPlayer.value) return
            refPlayer.value.currentTime = Math.max(0, Math.min(duration.value || 0, refPlayer.value.currentTime + seconds))
        }

        const onTimeUpdate = (e) => {
            currentTime.value = e.target.currentTime
        }

        const onDurationChange = (e) => {
            duration.value = e.target.duration
        }

        const onSliderInput = (e) => {
            const val = parseFloat(e.target.value)
            currentTime.value = val
            if (refPlayer.value) {
                refPlayer.value.currentTime = val
            }
        }

        const toggleMute = () => {
            if (!refPlayer.value) return
            muted.value = !muted.value
            refPlayer.value.muted = muted.value
        }

        const onVolumeInput = (e) => {
            const val = parseFloat(e.target.value)
            volume.value = val
            if (refPlayer.value) {
                refPlayer.value.volume = val
                refPlayer.value.muted = val === 0
                muted.value = val === 0
            }
        }

        const onPlaybackRateChange = (e) => {
            const val = parseFloat(e.target.value)
            playbackRate.value = val
            if (refPlayer.value) {
                refPlayer.value.playbackRate = val
            }
        }

        const formatTime = (time) => {
            if (isNaN(time)) return '00:00'
            const minutes = Math.floor(time / 60)
            const seconds = Math.floor(time % 60)
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }

        onUnmounted(() => {
            if (refPlayer.value) {
                refPlayer.value.pause()
            }
        })

        return {
            thread,
            media,
            error,
            parsedMedia,
            aspectRatio,
            resolveUrl,
            formatDate,
            formatRelative,
            formatDuration,
            copied,
            copyToClipboard,

            // Audio player bindings
            refPlayer,
            isPlaying,
            currentTime,
            duration,
            volume,
            muted,
            playbackRate,
            togglePlay,
            seekBy,
            onTimeUpdate,
            onDurationChange,
            onSliderInput,
            toggleMute,
            onVolumeInput,
            onPlaybackRateChange,
            formatTime
        }
    }
}

export default App