import { ref, computed, inject, onMounted, onUnmounted, reactive } from "vue"
import { QueryPublishedMedia, QueryPublishedProjects } from "./dtos.mjs"
import { ThemeSelector, RatingsBadge } from "./media.mjs"

const PageSize = 50
const MediaFields = 'Id,Name,Type,Width,Height,Tags,Categories,Rating,Url,PublishedUrl,Model,Prompt,Created'
const ProjectFields = 'Id,Name,Description,Size,FileCount,PublishedAt,PublishedUrl,GalleryScore'

function resolveMediaUrl(url) {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('/v1')) return url
    if (url.startsWith('~')) url = url.substring(1)
    return url.startsWith('/') ? url : '/' + url
}

// link to the local /{prefix}/{ref} page, ignoring the absolute host publishedUrl was created with
function resolvePublishedUrl(publishedUrl, prefix, fallback) {
    if (publishedUrl) {
        const pos = publishedUrl.indexOf(prefix)
        if (pos >= 0) return publishedUrl.substring(pos)
    }
    return fallback ?? publishedUrl ?? ''
}

function topTagsOf(item, take = 3) {
    const tags = item.tags
    if (!tags || typeof tags !== 'object') return []
    return Object.entries(tags)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, take)
        .map(([tag]) => tag)
}

function formatRelative(date) {
    if (!date) return ''
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
    const diff = (new Date(date) - new Date()) / 1000
    const units = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
        ['second', 1],
    ]
    for (const [unit, secs] of units) {
        if (Math.abs(diff) >= secs || unit === 'second') {
            return rtf.format(Math.round(diff / secs), unit)
        }
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const val = bytes / Math.pow(1024, i)
    return `${val >= 10 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`
}

const MediaCard = {
    components: {
        RatingsBadge,
    },
    template: `
    <a :href="itemUrl" class="media-card group relative block mb-4 rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300"
        :class="[$styles.card]"
        :title="item.name">

        <!-- Image -->
        <div v-if="isImage" class="w-full bg-gray-100 dark:bg-gray-900/60" :style="aspectStyle">
            <img :src="mediaUrl"
                :alt="item.name || 'Media'"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                :class="{ 'opacity-0': broken }"
                @error="broken = true" />
            <!-- Broken image fallback -->
            <div v-if="broken" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600">
                <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3l18 18" />
                </svg>
                <span class="text-xs font-medium">Unavailable</span>
            </div>
        </div>

        <!-- Non-image media placeholder -->
        <div v-else class="w-full aspect-square flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-100 via-gray-100 to-purple-100 dark:from-indigo-950/50 dark:via-gray-900 dark:to-purple-950/50">
            <div class="size-16 rounded-full flex items-center justify-center bg-white/70 dark:bg-gray-800/70 text-indigo-500 dark:text-indigo-400 shadow-inner">
                <!-- Audio -->
                <svg v-if="item.type === 'Audio' || item.type === 'Speech'" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
                <!-- Video/Animation -->
                <svg v-else-if="item.type === 'Video' || item.type === 'Animation'" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <!-- Generic file -->
                <svg v-else class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            </div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ item.type }}</span>
        </div>

        <!-- Rating badge (always visible) -->
        <div class="absolute top-2 right-2 z-10 drop-shadow-md">
            <RatingsBadge :media="item" size="xs" />
        </div>

        <!-- Hover overlay -->
        <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div class="p-3 space-y-1.5">
                <h3 v-if="item.name" class="text-sm font-bold text-white leading-snug line-clamp-2 capitalize drop-shadow">
                    {{ item.name }}
                </h3>
                <div class="flex items-center flex-wrap gap-1.5">
                    <span v-if="item.model" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {{ item.model }}
                    </span>
                    <span v-if="item.created" class="text-2xs font-medium text-gray-300">
                        {{ formatRelative(item.created) }}
                    </span>
                </div>
                <div v-if="topTags.length" class="flex flex-wrap gap-1">
                    <span v-for="tag in topTags" :key="tag"
                        class="px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-400/20 text-emerald-200 backdrop-blur-sm">
                        {{ tag }}
                    </span>
                </div>
            </div>
        </div>
    </a>
    `,
    props: {
        item: Object
    },
    setup(props) {
        const broken = ref(false)

        const isImage = computed(() => !props.item.type || props.item.type === 'Image')

        const aspectStyle = computed(() => {
            const { width, height } = props.item
            return width && height
                ? { aspectRatio: `${width} / ${height}` }
                : { aspectRatio: '1 / 1' }
        })

        const mediaUrl = computed(() => resolveMediaUrl(props.item.url))
        const itemUrl = computed(() => resolvePublishedUrl(props.item.publishedUrl, '/m/', mediaUrl.value))
        const topTags = computed(() => topTagsOf(props.item))

        return {
            broken,
            isImage,
            aspectStyle,
            mediaUrl,
            itemUrl,
            topTags,
            formatRelative,
        }
    }
}

const AudioCard = {
    components: {
        RatingsBadge,
    },
    template: `
    <div class="rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
        :class="[$styles.card]">
        <div class="p-4 flex items-start gap-3">
            <div class="size-11 flex-shrink-0 rounded-xl flex items-center justify-center"
                style="background:rgba(127,127,127,0.12)">
                <svg class="w-6 h-6" :class="$styles.heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
            </div>
            <div class="min-w-0 flex-1">
                <a :href="itemUrl" class="block truncate text-sm font-bold capitalize hover:underline" :class="$styles.heading" :title="item.name">
                    {{ item.name || 'Audio' }}
                </a>
                <div class="mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-2xs font-medium" :class="$styles.muted">
                    <span v-if="item.model" class="truncate max-w-[10rem]">{{ item.model }}</span>
                    <span v-if="item.model && item.created">·</span>
                    <span v-if="item.created">{{ formatRelative(item.created) }}</span>
                </div>
            </div>
            <RatingsBadge :media="item" size="xs" />
        </div>

        <!-- Prompt (clipped to keep cards a consistent height) -->
        <p class="px-4 pb-3 text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]" :class="$styles.muted" :title="item.prompt">
            {{ item.prompt }}
        </p>

        <div class="px-4 pb-2 mt-auto">
            <audio :src="mediaUrl" controls preload="none" class="w-full h-9"></audio>
        </div>

        <div v-if="topTags.length" class="px-4 pb-4 flex flex-wrap gap-1">
            <span v-for="tag in topTags" :key="tag"
                class="px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {{ tag }}
            </span>
        </div>
    </div>
    `,
    props: {
        item: Object
    },
    setup(props) {
        const mediaUrl = computed(() => resolveMediaUrl(props.item.url))
        const itemUrl = computed(() => resolvePublishedUrl(props.item.publishedUrl, '/m/', mediaUrl.value))
        const topTags = computed(() => topTagsOf(props.item))

        return {
            mediaUrl,
            itemUrl,
            topTags,
            formatRelative,
        }
    }
}

const ProjectCard = {
    template: `
    <a :href="itemUrl" target="_blank" rel="noopener"
        class="group relative block rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300"
        :class="[$styles.card]"
        :title="item.name">
        <div class="p-5 flex flex-col h-full">
            <div class="flex items-start gap-3">
                <div class="size-11 flex-shrink-0 rounded-xl flex items-center justify-center"
                    style="background:rgba(127,127,127,0.12)">
                    <svg class="w-6 h-6" :class="$styles.heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="truncate text-base font-bold capitalize" :class="$styles.heading">{{ item.name }}</h3>
                    <p v-if="userName" class="text-2xs font-medium truncate" :class="$styles.muted">{{ userName }}</p>
                </div>
                <svg class="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" :class="$styles.muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </div>

            <p v-if="item.description" class="mt-3 text-sm leading-relaxed line-clamp-3" :class="$styles.muted">
                {{ item.description }}
            </p>

            <div class="mt-4 pt-3 border-t flex items-center flex-wrap gap-x-3 gap-y-1 text-2xs font-medium" :class="[$styles.chromeBorder, $styles.muted]">
                <span class="inline-flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    {{ item.fileCount }} file{{ item.fileCount === 1 ? '' : 's' }}
                </span>
                <span v-if="item.size">{{ formatBytes(item.size) }}</span>
                <span v-if="item.publishedAt" class="ml-auto">{{ formatRelative(item.publishedAt) }}</span>
            </div>
        </div>
    </a>
    `,
    props: {
        item: Object
    },
    setup(props) {
        const itemUrl = computed(() => resolvePublishedUrl(props.item.publishedUrl, '/p/', props.item.publishedUrl))
        // publishedUrl is /p/{userName}/{projectName} — the username is the folder the project lives in
        const userName = computed(() => itemUrl.value.replace(/^\/p\//, '').split('/')[0] || '')
        return {
            itemUrl,
            userName,
            formatRelative,
            formatBytes,
        }
    }
}

// Shared infinite-scroll gallery of published media (optionally filtered by type)
const MediaGrid = {
    components: {
        MediaCard,
        AudioCard,
    },
    template: `
    <div>
        <!-- Empty -->
        <div v-if="initialized && !items.length && !loading" class="mx-auto max-w-md mt-16 text-center">
            <div class="p-6 rounded-2xl border shadow-sm" :class="[$styles.card]">
                <div class="size-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l4.5 4.5M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                </div>
                <h2 class="text-lg font-bold mb-2" :class="$styles.heading">{{ emptyText }}</h2>
                <p class="text-sm" :class="$styles.muted">Published {{ audio ? 'audio' : 'media' }} will appear here.</p>
            </div>
        </div>

        <!-- Audio grid -->
        <div v-else-if="audio" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AudioCard v-for="item in items" :key="item.id" :item="item" />
        </div>

        <!-- Masonry media grid -->
        <div v-else class="masonry-grid">
            <MediaCard v-for="item in items" :key="item.id" :item="item" />
        </div>

        <div v-if="loadError" class="mt-6 text-center">
            <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
        </div>

        <!-- Load More / Sentinel -->
        <div ref="sentinel" class="mt-8 pb-12 flex justify-center">
            <div v-if="loading" class="flex items-center gap-2 text-sm font-medium" :class="$styles.muted">
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading…
            </div>
            <button v-else-if="hasMore" type="button" @click="loadMore"
                class="px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                :class="$styles.primaryButton">
                Load More
            </button>
            <span v-else-if="items.length" class="text-xs font-medium" :class="$styles.muted">
                You've reached the end
            </span>
        </div>
    </div>
    `,
    props: {
        type: { type: String, default: '' },
        audio: { type: Boolean, default: false },
        initialItems: { type: Array, default: () => [] },
        emptyText: { type: String, default: 'No media yet' },
    },
    setup(props) {
        const client = inject('client')

        const items = ref(props.initialItems ? [...props.initialItems] : [])
        const loading = ref(false)
        const loadError = ref('')
        const initialized = ref(items.value.length > 0)
        const hasMore = ref(items.value.length >= PageSize || items.value.length === 0)
        const sentinel = ref(null)

        async function loadMore() {
            if (loading.value || (initialized.value && !hasMore.value)) return
            loading.value = true
            loadError.value = ''
            try {
                const query = new QueryPublishedMedia({
                    skip: items.value.length,
                    take: PageSize,
                    fields: MediaFields,
                    orderByDesc: 'Id',
                })
                if (props.type) query.type = props.type
                const api = await client.api(query)
                if (api.succeeded) {
                    const newResults = api.response?.results || []
                    const existingIds = new Set(items.value.map(x => x.id))
                    items.value.push(...newResults.filter(x => !existingIds.has(x.id)))
                    hasMore.value = newResults.length >= PageSize
                } else {
                    loadError.value = api.error?.message || 'Failed to load media'
                }
            } catch (e) {
                loadError.value = e.message || 'Failed to load media'
            } finally {
                loading.value = false
                initialized.value = true
            }
        }

        let observer = null
        onMounted(() => {
            observer = new IntersectionObserver(entries => {
                if (entries.some(e => e.isIntersecting)) {
                    loadMore()
                }
            }, { rootMargin: '600px' })
            if (sentinel.value) {
                observer.observe(sentinel.value)
            }
            if (!items.value.length) {
                loadMore()
            }
        })

        onUnmounted(() => {
            if (observer) {
                observer.disconnect()
                observer = null
            }
        })

        return {
            items,
            loading,
            loadError,
            initialized,
            hasMore,
            sentinel,
            loadMore,
        }
    }
}

// Infinite-scroll grid of published projects
const ProjectGrid = {
    components: {
        ProjectCard,
    },
    template: `
    <div>
        <div v-if="initialized && !items.length && !loading" class="mx-auto max-w-md mt-16 text-center">
            <div class="p-6 rounded-2xl border shadow-sm" :class="[$styles.card]">
                <div class="size-12 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                </div>
                <h2 class="text-lg font-bold mb-2" :class="$styles.heading">No projects yet</h2>
                <p class="text-sm" :class="$styles.muted">Published projects will appear here.</p>
            </div>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            <ProjectCard v-for="item in items" :key="item.id" :item="item" />
        </div>

        <div v-if="loadError" class="mt-6 text-center">
            <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
        </div>

        <div ref="sentinel" class="mt-8 pb-12 flex justify-center">
            <div v-if="loading" class="flex items-center gap-2 text-sm font-medium" :class="$styles.muted">
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading…
            </div>
            <button v-else-if="hasMore" type="button" @click="loadMore"
                class="px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                :class="$styles.primaryButton">
                Load More
            </button>
            <span v-else-if="items.length" class="text-xs font-medium" :class="$styles.muted">
                You've reached the end
            </span>
        </div>
    </div>
    `,
    setup() {
        const client = inject('client')

        const items = ref([])
        const loading = ref(false)
        const loadError = ref('')
        const initialized = ref(false)
        const hasMore = ref(true)
        const sentinel = ref(null)

        async function loadMore() {
            if (loading.value || (initialized.value && !hasMore.value)) return
            loading.value = true
            loadError.value = ''
            try {
                const api = await client.api(new QueryPublishedProjects({
                    skip: items.value.length,
                    take: PageSize,
                    fields: ProjectFields,
                    orderByDesc: 'Id',
                }))
                if (api.succeeded) {
                    const newResults = api.response?.results || []
                    const existingIds = new Set(items.value.map(x => x.id))
                    items.value.push(...newResults.filter(x => !existingIds.has(x.id)))
                    hasMore.value = newResults.length >= PageSize
                } else {
                    loadError.value = api.error?.message || 'Failed to load projects'
                }
            } catch (e) {
                loadError.value = e.message || 'Failed to load projects'
            } finally {
                loading.value = false
                initialized.value = true
            }
        }

        let observer = null
        onMounted(() => {
            observer = new IntersectionObserver(entries => {
                if (entries.some(e => e.isIntersecting)) {
                    loadMore()
                }
            }, { rootMargin: '600px' })
            if (sentinel.value) {
                observer.observe(sentinel.value)
            }
            if (!items.value.length) {
                loadMore()
            }
        })

        onUnmounted(() => {
            if (observer) {
                observer.disconnect()
                observer = null
            }
        })

        return {
            items,
            loading,
            loadError,
            initialized,
            hasMore,
            sentinel,
            loadMore,
        }
    }
}

const Tabs = [
    { id: 'media', label: 'Media', subtitle: 'Explore the latest published media' },
    { id: 'audio', label: 'Audio', subtitle: 'Listen to the latest published audio' },
    { id: 'projects', label: 'Projects', subtitle: 'Browse the latest published projects' },
]

const App = {
    components: {
        ThemeSelector,
        MediaGrid,
        ProjectGrid,
    },
    template: `
    <div class="min-h-screen transition-colors duration-300 bg-fixed relative" :class="$styles.app">
        <!-- Top Right Control Panel -->
        <div class="absolute top-1 right-20 flex items-center gap-3.5 z-[100] select-none">
            <ThemeSelector />
        </div>
        <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8" :class="$styles.appInner">

            <!-- Error Screen -->
            <div v-if="error" class="mx-auto max-w-md mt-16 text-center">
                <div class="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl shadow-sm">
                    <div class="size-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Failed to load gallery</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ error.message || 'Unknown error' }}</p>
                </div>
            </div>

            <div v-else class="mx-auto max-w-[110rem]">
                <!-- Header -->
                <div class="border-b pb-4 mb-6" :class="[$styles.chromeBorder]">
                    <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        Media Gallery
                    </h1>
                    <p class="mt-1 text-sm" :class="$styles.muted">
                        {{ activeSubtitle }}
                    </p>

                    <!-- Tabs -->
                    <nav class="mt-4 flex items-center gap-1">
                        <button v-for="tab in tabs" :key="tab.id" type="button"
                            @click="selectTab(tab.id)"
                            class="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
                            :class="activeTab === tab.id
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                                : ['hover:bg-gray-200/60 dark:hover:bg-gray-700/40', $styles.muted]">
                            {{ tab.label }}
                        </button>
                    </nav>
                </div>

                <!-- Panels (lazy-mounted, kept alive via v-show) -->
                <div v-show="activeTab === 'media'">
                    <MediaGrid v-if="visited.media" :initial-items="results" empty-text="No media yet" />
                </div>
                <div v-show="activeTab === 'audio'">
                    <MediaGrid v-if="visited.audio" type="Audio" audio empty-text="No audio yet" />
                </div>
                <div v-show="activeTab === 'projects'">
                    <ProjectGrid v-if="visited.projects" />
                </div>
            </div>
        </div>
    </div>
    `,
    setup() {
        const results = inject('results', null)
        const error = inject('error', null)

        const tabs = Tabs
        const tabIds = tabs.map(t => t.id)

        const initialHash = (location.hash || '').replace('#', '')
        const activeTab = ref(tabIds.includes(initialHash) ? initialHash : 'media')

        const visited = reactive({
            media: true,
            audio: activeTab.value === 'audio',
            projects: activeTab.value === 'projects',
        })

        const activeSubtitle = computed(() =>
            tabs.find(t => t.id === activeTab.value)?.subtitle || '')

        function selectTab(id) {
            if (activeTab.value === id) return
            activeTab.value = id
            visited[id] = true
            // Build an absolute URL: the page has a <base href> so a bare '#id' would resolve against it
            const base = location.pathname + location.search
            const url = id === 'media' ? base : base + '#' + id
            if (location.pathname + location.search + location.hash !== url) {
                history.replaceState(null, '', url)
            }
        }

        function onHashChange() {
            const hash = (location.hash || '').replace('#', '')
            const id = tabIds.includes(hash) ? hash : 'media'
            if (id !== activeTab.value) {
                activeTab.value = id
                visited[id] = true
            }
        }

        onMounted(() => {
            window.addEventListener('hashchange', onHashChange)

            const styleId = "medias-gallery-styles"
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style")
                style.id = styleId
                style.textContent = `
                    .masonry-grid {
                        columns: 2;
                        column-gap: 1rem;
                    }
                    @media (min-width: 640px) {
                        .masonry-grid { columns: 3; }
                    }
                    @media (min-width: 1024px) {
                        .masonry-grid { columns: 4; }
                    }
                    @media (min-width: 1536px) {
                        .masonry-grid { columns: 5; }
                    }
                    @keyframes media-card-in {
                        from { opacity: 0; transform: translateY(8px); }
                        to { opacity: 1; transform: none; }
                    }
                    .media-card {
                        break-inside: avoid;
                        animation: media-card-in 0.4s ease-out backwards;
                    }
                    .media-card:hover {
                        transform: translateY(-2px);
                    }
                    .text-2xs {
                        font-size: 10px;
                        line-height: 1rem;
                    }
                `
                document.head.appendChild(style)
            }
        })

        onUnmounted(() => {
            window.removeEventListener('hashchange', onHashChange)
        })

        return {
            results,
            error,
            tabs,
            activeTab,
            visited,
            activeSubtitle,
            selectTab,
        }
    }
}

export default App
