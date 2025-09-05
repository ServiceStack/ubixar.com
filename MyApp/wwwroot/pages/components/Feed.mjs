import { ref, computed, watch, inject, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuth, useUtils } from "@servicestack/vue"
import { lastRightPart } from "@servicestack/client";
import { ArtifactGallery, ArtifactDownloads } from "./Artifacts.mjs"
import { AllRatings, toArtifacts, formatDuration, formatRating, sortByCreatedDesc, sortByCreatedAsc, sortByModifiedDesc, sortByModifiedAsc } from "../lib/utils.mjs"

import AudioPlayer from "./AudioPlayer.mjs"
import ListenButton from "./ListenButton.mjs"

const PlayButton = {
    template:`
      <button data-slug="@episode.Slug" data-title="@episode.Title" data-url="@episode.Url"
              type="button" aria-label="Play episode @episode.Title"
              onclick="togglePlayButton(this)"
              class="group relative flex h-18 w-18 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-slate-50 focus:outline-none focus:ring focus:ring-slate-700 dark:focus:ring-slate-200 focus:ring-offset-4 dark:ring-offset-black">
        <div class="paused flex items-center gap-x-1">
          <svg viewBox="0 0 36 36" aria-hidden="true" class="h-9 w-9 fill-white dark:fill-black group-active:fill-white/80 dark:group-active:fill-black/80">
            <path d="M33.75 16.701C34.75 17.2783 34.75 18.7217 33.75 19.299L11.25 32.2894C10.25 32.8668 9 32.1451 9 30.9904L9 5.00962C9 3.85491 10.25 3.13323 11.25 3.71058L33.75 16.701Z" />
          </svg>
        </div>
        <div class="hidden playing flex items-center gap-x-1">
          <svg viewBox="0 0 36 36" aria-hidden="true" class="h-9 w-9 fill-white dark:fill-black group-active:fill-white/80 dark:group-active:fill-black/80">
            <path d="M8.5 4C7.67157 4 7 4.67157 7 5.5V30.5C7 31.3284 7.67157 32 8.5 32H11.5C12.3284 32 13 31.3284 13 30.5V5.5C13 4.67157 12.3284 4 11.5 4H8.5ZM24.5 4C23.6716 4 23 4.67157 23 5.5V30.5C23 31.3284 23.6716 32 24.5 32H27.5C28.3284 32 29 31.3284 29 30.5V5.5C29 4.67157 28.3284 4 27.5 4H24.5Z" />
          </svg>
        </div>
      </button>
    `,
    setup(props) {
        function togglePlayButton(button) {
            const { slug, title, url } = button.dataset
            if (globalThis.player?.isPlaying) {
                globalThis.player.toggle()
            } else {
                globalThis.player = new AudioPlayer(url, title)
                globalThis.player.play()
            }
        }
        return {
            togglePlayButton,
        }
    }
}

export default {
    components: {
        ArtifactGallery,
        ArtifactDownloads,
        AudioPlayer,
        ListenButton,
        PlayButton,
    },
    template:`
    <ErrorSummary :status="error" />
    <div class="relative mt-2 border-b border-gray-200 dark:border-gray-700 min-h-full flex justify-between">
        <nav class="flex space-x-8" aria-label="Tabs">
            <button
                @click="setFilter('all')"
                :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    currentFilter === 'all'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'cursor-pointer border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                ]">
                All <span class="ml-1 text-xs opacity-75">({{filterCounts.all}})</span>
            </button>
            <button
                @click="setFilter('pending')"
                :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    currentFilter === 'pending'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'cursor-pointer border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                ]">
                Pending <span class="ml-1 text-xs opacity-75">({{filterCounts.pending}})</span>
            </button>
            <button
                @click="setFilter('unpublished')"
                :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    currentFilter === 'unpublished'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'cursor-pointer border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                ]">
                Unpublished <span class="ml-1 text-xs opacity-75">({{filterCounts.unpublished}})</span>
            </button>
            <button
                @click="setFilter('published')"
                :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    currentFilter === 'published'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'cursor-pointer border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                ]">
                Published <span class="ml-1 text-xs opacity-75">({{filterCounts.published}})</span>
            </button>
            <button
                @click="setFilter('failed')"
                :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    currentFilter === 'failed'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'cursor-pointer border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                ]">
                Failed <span class="ml-1 text-xs opacity-75">({{filterCounts.failed}})</span>
            </button>
        </nav>
        <div class="mr-1">
            <select id="sortBy" :value="sortBy" @change="setSortBy($event.target.value)"
                class="xl:hidden px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="-created">Newest</option>
                <option value="created">Oldest</option>
                <option value="-modified">Modified</option>
            </select>
            <select id="sortByXl" :value="sortBy" @change="setSortBy($event.target.value)"
                class="hidden xl:block px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="-created">Newest First</option>
                <option value="created">Oldest First</option>
                <option value="-modified">Recently Modified</option>
            </select>
        </div>
    </div>
    <div v-if="generations.length" class="mb-16" :key="renderKey">
        <div v-for="gen in pagedGenerations" :data-id="gen.id">
            <div>
                <div class="flex items-center justify-between">
                    <span @click="selectGeneration(gen,$event)" class="cursor-pointer mt-4 flex justify-center items-center text-xl hover:underline underline-offset-4" :title="gen.description ?? ''">
                        <div class="overflow-hidden text-ellipsis whitespace-nowrap max-w-3xl">{{ gen.description ?? 'Generation' }}</div>
                    </span>
                    <div class="group flex cursor-pointer" @click="discardResult(gen)">
                        <div class="ml-1 invisible group-hover:visible">discard</div>
                        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>Discard Generation {{gen.id}}</title><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z"></path><path fill="currentColor" d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"></path></svg>
                    </div>
                </div>

                <div v-if="workflowName(gen.workflowId)" class="flex justify-between">
                    <div class="text-sm flex items-center gap-x-2">
                        <template v-if="gen.result?.assets?.length">
                            <div v-if="gen.publishedDate" class="flex items-center hover:text-sky-500 dark:hover:text-sky-400">
                                <svg class="size-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6zM13 3v2h4.586l-7.793 7.793l1.414 1.414L19 6.414V11h2V3z"/></svg>
                                <RouterLink :to="{ path: '/generations/' + gen.id }" class="text-sm">
                                    view post
                                </RouterLink>
                            </div>
                            <button v-else type="button" class="inline-flex items-center transition-all duration-200 gap-x-0.5 rounded-md bg-indigo-500 px-2 py-0.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 border border-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                @click="publishGeneration(gen)" :title="'Publish Generation'" :disabled="publishingGeneration == gen">
                                <svg v-if="publishingGeneration != gen" class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m11 11.85l-1.875 1.875q-.3.3-.712.288T7.7 13.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 8.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 11.85V19q0 .425-.288.713T12 20t-.712-.288T11 19zM4 8V6q0-.825.588-1.412T6 4h12q.825 0 1.413.588T20 6v2q0 .425-.288.713T19 9t-.712-.288T18 8V6H6v2q0 .425-.288.713T5 9t-.712-.288T4 8"/></svg>
                                {{publishingGeneration == gen ? 'publishing...' : 'publish'}}
                            </button>
                        </template>
                        <button v-if="gen.result && !gen.error && (!gen.publishedDate || isAdmin())" type="button" @click="retryGeneration(gen)" class="flex items-center hover:text-sky-500 dark:hover:text-sky-400">
                            <svg class="size-3.5 mr-1" :class="{ 'animate-spin': isRegenerating(gen) }" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -2 24 24"><path fill="currentColor" d="m19.347 7.24l.847-1.266a.984.984 0 0 1 1.375-.259c.456.31.58.93.277 1.383L19.65 10.38a.984.984 0 0 1-1.375.259L14.97 8.393a1 1 0 0 1-.277-1.382a.984.984 0 0 1 1.375-.26l1.344.915C16.428 4.386 13.42 2 9.863 2c-4.357 0-7.89 3.582-7.89 8s3.533 8 7.89 8c.545 0 .987.448.987 1s-.442 1-.987 1C4.416 20 0 15.523 0 10S4.416 0 9.863 0c4.504 0 8.302 3.06 9.484 7.24"/></svg>
                            {{ isRegenerating(gen) ? 'regenerating...' : 'regenerate' }}
                        </button>
                    </div>
                    <div class="mb-0.5 mr-1 flex justify-end">
                        <span class="ml-1 inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-300/10"
                            :title="'Workflow ' + workflowName(gen.workflowId)">
                            {{workflowName(gen.workflowId)}}
                        </span>
                        <span v-if="gen.result?.duration" class="ml-1 inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10"
                            :title="'Executed in ' + formatDuration(gen.result.duration)">
                            {{formatDuration(gen.result.duration)}}
                        </span>
                        <span v-if="gen.credits" class="ml-1 inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-yellow-500 dark:text-yellow-400 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10" title="credits used">
                            <svg class="size-4 mr-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <g fill="none"><path fill="currentColor" d="M11.5 13.8h-1.063c-1.53 0-2.294 0-2.583-.497s.088-1.162.844-2.491l2.367-4.167c.375-.66.563-.99.749-.94c.186.049.186.428.186 1.187V9.7c0 .236 0 .354.073.427s.191.073.427.073h1.063c1.53 0 2.294 0 2.583.497s-.088 1.162-.844 2.491l-2.367 4.167c-.375.66-.563.99-.749.94C12 18.247 12 17.868 12 17.109V14.3c0-.236 0-.354-.073-.427s-.191-.073-.427-.073"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></g>
                            </svg>
                            {{gen.credits ?? 0}}
                        </span>
                    </div>
                </div>
                <div v-if="gen.result?.assets?.length" class="w-full">
                    <div v-if="gen.output === 'Audio'">
                      <div v-for="output in gen.result.assets" class="flex items-center p-4">
                        <div class="flex flex-col justify-center items-center space-y-4">
                          <button type="button" :aria-label="'Play ' + gen.description"
                                  @click="togglePlayButton(output.url, gen.description)"
                                  class="group relative flex h-18 w-18 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-slate-50 focus:outline-none focus:ring focus:ring-slate-700 dark:focus:ring-slate-200 focus:ring-offset-4 dark:ring-offset-black">
                            <div v-if="!refAudio?.player?.isPlaying || playAudio?.src !== output.url" class="paused flex items-center gap-x-1">
                              <svg viewBox="0 0 36 36" aria-hidden="true" class="h-9 w-9 fill-white dark:fill-black group-active:fill-white/80 dark:group-active:fill-black/80">
                                <path d="M33.75 16.701C34.75 17.2783 34.75 18.7217 33.75 19.299L11.25 32.2894C10.25 32.8668 9 32.1451 9 30.9904L9 5.00962C9 3.85491 10.25 3.13323 11.25 3.71058L33.75 16.701Z" />
                              </svg>
                            </div>
                            <div v-else class="playing flex items-center gap-x-1">
                              <svg viewBox="0 0 36 36" aria-hidden="true" class="h-9 w-9 fill-white dark:fill-black group-active:fill-white/80 dark:group-active:fill-black/80">
                                <path d="M8.5 4C7.67157 4 7 4.67157 7 5.5V30.5C7 31.3284 7.67157 32 8.5 32H11.5C12.3284 32 13 31.3284 13 30.5V5.5C13 4.67157 12.3284 4 11.5 4H8.5ZM24.5 4C23.6716 4 23 4.67157 23 5.5V30.5C23 31.3284 23.6716 32 24.5 32H27.5C28.3284 32 29 31.3284 29 30.5V5.5C29 4.67157 28.3284 4 27.5 4H24.5Z" />
                              </svg>
                            </div>
                          </button>
                          <div>
                            <a :href="output.url + '?download=1'" class="flex text-sm items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                              <svg class="w-5 h-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 20h12M12 4v12m0 0l3.5-3.5M12 16l-3.5-3.5"></path></svg>
                              <div class="">{{output.fileName.length < output.fileName ? 60 : 'download.' + lastRightPart(output.fileName,'.')}}</div>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArtifactGallery v-else :results="store.toArtifacts(gen.result.assets, gen)"
                        :generation="gen" @start-drag="handleDragStart">
                        <template #artifact-bottom="{ artifact, selected }">
                            <div class="mt-0.5 flex text-sm items-center justify-between">
                                <div v-if="gen.posterImage != artifact.url">
                                    <button type="button" title="Pin as Poster Image" @click="pinPosterImage(gen, artifact.url)">
                                        <svg :class="['ml-1 size-4 text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100', pinningImage == artifact.url ? 'rotate-45' : '']" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m10.25 10.25l4 4m-12.5-7.5l5-5s1 2 2 3s4.5 2 4.5 2l-6.5 6.5s-1-3.5-2-4.5s-3-2-3-2"/></svg>
                                    </button>
                                </div>
                                <div class="flex flex-wrap">
                                    <template v-for="(desc, rating) of AllRatings">
                                    <span v-if="artifact.rating == rating" :class="gen.publishedDate ? 'bg-yellow-600/50 dark:bg-yellow-300/30' : 'bg-gray-300 dark:bg-gray-600'" class="text-gray-600 dark:text-gray-300  inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10" :title="formatRating(rating) + ' - Suggested Rating'">
                                        {{formatRating(rating)}}
                                    </span>
                                    <button v-else type="button" @click="changeRating(gen, artifact, rating)" class="m-0 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10"
                                        :title="desc">
                                        {{formatRating(rating)}}
                                    </button>
                                    </template>
                                </div>
                                <button type="button" class="m-0" @click="deleteArtifact(gen, artifact)" title="Delete Artifact">
                                    <svg class="size-4 text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100" viewBox="0 0 32 32"><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z"></path><path fill="currentColor" d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"></path></svg>
                                </button>
                            </div>
                        </template>
                        <template #bottom="{ selected }">
                            <ArtifactDownloads :url="selected.url" />
                        </template>
                    </ArtifactGallery>
                </div>
                <div v-else-if="gen.error">
                    <ErrorSummary :status="gen.error" />
                    <div class="mt-2">
                        <button type="button" @click="retryGeneration(gen)" class="flex items-center text-small text-blue-500 hover:text-blue-300">
                            <svg class="size-5" :class="{ 'animate-spin': isRegenerating(gen) }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M11.896 18a.75.75 0 0 1-.75.75c-3.792 0-6.896-3.005-6.896-6.75s3.104-6.75 6.896-6.75c3.105 0 5.749 2.015 6.605 4.801l.603-1.02a.75.75 0 0 1 1.292.763l-1.63 2.755a.75.75 0 0 1-1.014.272L14.18 11.23a.75.75 0 1 1 .737-1.307l1.472.83c-.574-2.288-2.691-4.003-5.242-4.003C8.149 6.75 5.75 9.117 5.75 12s2.399 5.25 5.396 5.25a.75.75 0 0 1 .75.75"/></svg>
                            {{ isRegenerating(gen) ? 'retrying...' : 'retry' }}
                        </button>
                    </div>
                </div>
                <div v-else class="py-12 flex justify-center">
                    <Loading imageClass="size-10 mr-3" class="p-2 px-4 rounded-lg dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-md">
                        <div class="text-lg text-gray-500" :title="'Executing Workflow: ' + gen.id" @click="copyText(gen.id)">Executing Workflow...</div>
                        <div v-if="gen.statusUpdate" class="text-sm text-gray-400">{{gen.statusUpdate}}</div>
                    </Loading>
                </div>
            </div>
        </div>
        <div class="fixed bottom-0 max-w-3xl rounded-tl-lg rounded-tr-lg overflow-hidden" style="min-width:600px;">
            <AudioPlayer ref="refAudio" :bus="events" :src="playAudio?.src" :title="playAudio?.title" :autoPlay="true" :showClose="true"
                         @playing="playingAudio=$event" @paused="playingAudio=null" @close="playAudio=null" />
        </div>
        <div ref="refBottom"></div>
    </div>
    <div v-else class="flex flex-grow items-center justify-center min-h-[400px]">
        <div class="text-center p-8 rounded-lg dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-md max-w-lg">
            <div class="mb-4 flex justify-center">
                <svg class="w-16 h-16 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <h2 class="text-xl font-semibold mb-2">Your generated images will appear here</h2>
            <p class="text-gray-400">Start creating by executing workflows</p>
        </div>
    </div>
    `,
    props: {
        thread: Object,
    },
    emits:['selectGeneration','retryGeneration'],
    setup(props, { emit }) {
        const store = inject('store')
        const events = inject('events')
        const { isAdmin } = useAuth()
        const router = useRouter()
        const route = useRoute()
        const selectedThread = ref(null)
        const error = ref()
        const renderKey = ref(0)
        const pinningImage = ref('')
        const publishingGeneration = ref()
        const refBottom = ref()
        const regeneratingIdMap = ref({})
        const refAudio = ref()
        const playAudio = ref()
        const playingAudio = ref()

        let intersectionObserver = null
        const { copyText } = useUtils()

        // Initialize filter from query parameter, default to 'all' if invalid
        const validFilters = ['all', 'pending', 'unpublished', 'published', 'failed']
        const initialFilter = validFilters.includes(route.query.filter) ? route.query.filter : 'all'
        const currentFilter = ref(initialFilter)

        // Initialize sort from query parameter, default to '-created' if invalid
        const validSorts = ['-created', 'created', '-modified', 'modified']
        const initialSort = validSorts.includes(route.query.sort) 
            ? route.query.sort 
            : '-created'
        const sortBy = ref(initialSort)
        
        const visibleGenerations = ref(50)
        const pagedGenerations = computed(() => {
            return generations.value.slice(0, visibleGenerations.value)
        })
        
        const generations = computed(() => {
            let filtered = store.threadGenerations

            // Apply filters based on publishedDate and error status
            if (currentFilter.value === 'published') {
                filtered = filtered.filter(x => x.publishedDate)
            } else if (currentFilter.value === 'pending') {
                filtered = filtered.filter(x => !x.publishedDate && !x.error && !x.result)
            } else if (currentFilter.value === 'unpublished') {
                filtered = filtered.filter(x => !x.publishedDate && x.result?.assets?.length)
            } else if (currentFilter.value === 'failed') {
                filtered = filtered.filter(x => x.error && !x.result?.assets?.length)
            }
            // 'all' shows everything, no additional filtering needed

            // Apply sorting based on sortBy value
            switch (sortBy.value) {
                case 'created':
                    return sortByCreatedAsc(filtered)
                case '-modified':
                    return sortByModifiedDesc(filtered)
                case 'modified':
                    return sortByModifiedAsc(filtered)
                case '-created':
                default:
                    return sortByCreatedDesc(filtered)
            }
        })

        const filterCounts = computed(() => {
            const all = store.threadGenerations
            return {
                all: all.length,
                pending: all.filter(x => !x.publishedDate && !x.error && !x.result).length,
                unpublished: all.filter(x => !x.publishedDate && x.result?.assets?.length).length,
                published: all.filter(x => x.publishedDate).length,
                failed: all.filter(x => x.error && !x.result?.assets?.length).length
            }
        })

        function setFilter(filter) {
            currentFilter.value = filter
            // Update URL query parameter to maintain state on refresh
            router.push({
                path: route.path,
                params: route.params,
                query: { ...route.query, filter }
            })
        }

        function setSortBy(sort) {
            sortBy.value = sort
            // Update URL query parameter to maintain state on refresh
            router.push({
                path: route.path,
                params: route.params,
                query: { ...route.query, sort }
            })
        }
        
        function togglePlayButton(url, title) {
            if (refAudio.value?.player) {
                if (playAudio.value?.src === url) {
                    refAudio.value.player.toggle()
                    return
                }
            }
            playAudio.value = { src: url, title }
        }

        function workflowName(workflowId) {
            return store.workflows.find(x => x.id === workflowId)?.name ?? ''
        }

        function selectGeneration(gen, e) {
            if (e?.ctrlKey && gen.description) {
                navigator.clipboard.writeText(gen.description?.trim())
            }
            emit('selectGeneration', gen)
        }
        
        function isRegenerating(gen) {
            return regeneratingIdMap.value[gen.id] && new Date(regeneratingIdMap.value[gen.id]) >= new Date(gen.modifiedDate)
        }
        
        async function retryGeneration(gen) {
            regeneratingIdMap.value[gen.id] = gen.modifiedDate
            if (gen.result?.assets?.length) {
                await store.removeGenerationAssets(gen.id)
            }
            emit('retryGeneration', gen)
        }

        async function discardResult(gen) {
            await store.deleteWorkflowGeneration(gen.id)
        }

        async function changeRating(generation, asset, rating) {
            error.value = null
            const api = await store.updateGenerationAsset(generation, asset, { rating })
            error.value = api.error
        }

        async function pinPosterImage(generation, assetUrl) {
            error.value = null
            pinningImage.value = assetUrl
            const api = await store.pinPosterImage(generation, assetUrl)
            error.value = api.error
            pinningImage.value = ''
        }
        async function deleteArtifact(generation, asset) {
            error.value = null
            const api = await store.deleteWorkflowGenerationArtifact(generation, asset)
            if (api.error) {
                console.error('Failed to delete artifact:', api.error)
            }
        }

        async function publishGeneration(generation) {
            publishingGeneration.value = generation
            error.value = null
            const api = await store.publishGeneration(generation)
            error.value = api.error
            publishingGeneration.value = null
        }

        function handleDragStart(generation) {
            // This function will be called when drag starts from ArtifactGallery
            // The generation data is already available in the parent scope
        }

        function loadMoreGenerations() {
            // Only load more if there are more generations to show
            if (visibleGenerations.value < generations.value.length) {
                visibleGenerations.value += 50
            }
        }

        function setupIntersectionObserver() {
            if (intersectionObserver) {
                intersectionObserver.disconnect()
            }

            intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadMoreGenerations()
                    }
                })
            }, {
                root: null,
                rootMargin: '100px',
                threshold: 0.1
            })

            if (refBottom.value) {
                intersectionObserver.observe(refBottom.value)
            }
        }

        // Watch for query parameter changes (browser back/forward navigation)
        watch(() => route.query.filter, (newFilter) => {
            const filter = validFilters.includes(newFilter) ? newFilter : 'all'
            if (currentFilter.value !== filter) {
                currentFilter.value = filter
            }
        })

        watch(() => route.query.sort, (newSort) => {
            const sort = validSorts.includes(newSort) ? newSort : '-created'
            if (sortBy.value !== sort) {
                sortBy.value = sort
            }
        })

        // Reset visibleGenerations when thread, filter, or sort changes
        watch(() => [store.selectedThread, currentFilter, sortBy], () => {
            visibleGenerations.value = 50
        })

        // Set up intersection observer when component mounts
        onMounted(() => {
            setupIntersectionObserver()
        })

        // Clean up intersection observer when component unmounts
        onUnmounted(() => {
            if (intersectionObserver) {
                intersectionObserver.disconnect()
            }
        })

        // Re-setup intersection observer when refBottom changes
        watch(refBottom, () => {
            if (refBottom.value) {
                setupIntersectionObserver()
            }
        })

        return {
            renderKey,
            refBottom,
            store,
            events,
            error,
            AllRatings,
            generations,
            pagedGenerations,
            selectedThread,
            pinningImage,
            currentFilter,
            filterCounts,
            sortBy,
            refAudio,
            playAudio,
            playingAudio,
            workflowName,
            isAdmin,
            toArtifacts,
            formatDuration,
            formatRating,
            setFilter,
            setSortBy,
            selectGeneration,
            retryGeneration,
            isRegenerating,
            discardResult,
            changeRating,
            pinPosterImage,
            deleteArtifact,
            publishGeneration,
            publishingGeneration,
            handleDragStart,
            loadMoreGenerations,
            togglePlayButton,
            copyText,
        }
    }
}
