import {ref, computed, onMounted, onUnmounted, inject, watch} from "vue"
import { useRoute } from "vue-router"
import {PrimaryButton, SelectInput, useClient, useFormatters, useUtils} from "@servicestack/vue"
import { $1, leftPart, lastRightPart } from "@servicestack/client"
import { getHDClass, getRatingColorClass, humanifyNumber } from "./lib/utils.mjs"
import { GetArtifactVariants, QueryComments, CreateGenerationComment } from "../mjs/dtos.mjs"
import VisibilityIcon from "./components/VisibilityIcon.mjs"
import ArtifactMenu from "./components/ArtifactMenu.mjs"
import ArtifactReactions from "./components/ArtifactReactions.mjs"
import RatingsBadge from "./components/RatingsBadge.mjs"
import AudioPlayer from "./components/AudioPlayer.mjs"

export default {
    components: {
        SelectInput,
        PrimaryButton,
        VisibilityIcon,
        ArtifactMenu,
        ArtifactReactions,
        RatingsBadge,
        AudioPlayer,
    },
    template:`
        <ErrorSummary :status="error" />

        <div v-if="selectedArtifact?.caption" class="mt-4 px-8 text-center overflow-hidden whitespace-nowrap overflow-ellipsis" :title="selectedArtifact.caption">
            <span v-if="getHDClass(selectedArtifact.width, selectedArtifact.height)"
                  class="mr-1 inline-flex items-center rounded-md font-bold ring-1 ring-inset transition-all duration-200 cursor-default"
                  :class="('px-2 py-1 text-xs ') + getRatingColorClass('M')" :title="selectedArtifact.width + ' x ' + selectedArtifact.height">
              {{getHDClass(selectedArtifact.width, selectedArtifact.height)}}
            </span>
            {{selectedArtifact.caption}}
        </div>
            
        <div v-if="generation" class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-4">
        
            <!-- Main Panel -->
            <div class="flex-1 min-w-0">
                <!-- Main Image Display bg-white dark:bg-gray-800 -->
                <div v-if="selectedArtifact" class="rounded-lg shadow-lg overflow-hidden mb-4">
                    <div class="flex items-center justify-center relative"
                         :class="[{ 'aspect-square': !store.prefs.zoomIn && isType(['Image','Video']), }, !selectedArtifact.color ? 'bg-gray-100 dark:bg-gray-700' : '']" 
                         :style="selectedArtifact.color ? 'background-color:' + selectedArtifact.color : ''"
                         @contextmenu.prevent.stop="showContextMenu($event, selectedArtifact)"
                         >
                        <div v-if="isType('Audio')" class="w-full h-full cursor-pointer flex flex-col justify-between"
                             @click.stop="refAudio?.player?.toggle()"
                          >
                          <img src="/img/bg-audio.svg" class="absolute top-0 left-0 h-20 w-full">

                          <div class="mt-20 mb-12 flex-grow flex items-center">
                            <svg class="mx-auto size-64 text-purple-600 dark:text-purple-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                          
                          <AudioPlayer ref="refAudio" :src="store.assetUrl(selectedUrl)" :clsFilter="cls => cls.replace('dark:bg-black/70', 'dark:bg-black/20')"/>
                        </div>
                        <template v-else>
                          <!-- Main Image - only show if rating is viewable -->
                          <img v-if="selectedUrl && store.isRatingViewable(selectedArtifact)"
                               :src="selectedUrl"
                               :alt="selectedArtifact.caption || generation.description || 'Generated image'"
                               class="max-w-full max-h-full object-contain"
                               :class="{ 'cursor-zoom-in': !store.prefs.zoomIn, 'cursor-zoom-out':store.prefs.zoomIn }"
                               @click="store.setPrefs({ zoomIn: !store.prefs.zoomIn })">
                          <div v-else-if="selectedUrl && selectedArtifact"
                               class="h-full w-full bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8">
                            <!-- Ratings Guard Overlay -->
                            <div class="text-center max-w-lg">
                              <!-- Large Rating Tag -->
                              <div class="flex justify-center mb-6">
                                <RatingsBadge :artifact="selectedArtifact" size="lg" />
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
                          <div v-else class="text-gray-400 dark:text-gray-500">
                            <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                            </svg>
                          </div>
                        </template>
                    </div>
                    <ArtifactReactions class="my-1 max-w-sm mx-auto" :artifact="selectedArtifact" @changed="selectedArtifact.reactions = $event.reactions" />
                </div>

                <!-- Artifact Gallery -->
                <div v-if="artifacts.length > 1" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Generation Artifacts</h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div v-for="artifact in artifacts" :key="artifact.id"
                           class="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-blue-500 relative"
                           :class="{ 'ring-2 ring-blue-500': artifact.url === selectedUrl }"
                           @click="selectedUrl = artifact.url">
                      <img v-if="store.isRatingViewable(artifact)"
                             :src="artifact.url"
                             :alt="'Artifact ' + artifact.id"
                             class="w-full object-cover">
    
                        <!-- Ratings Guard for Thumbnails -->
                      <div v-else class="w-full h-full py-8 text-center bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-2">
                        <!-- Large Rating Tag -->
                        <div class="flex justify-center mb-2">
                          <RatingsBadge :artifact="artifact" />
                        </div>
                        <span class="text-xs text-gray-400">Restricted Content</span>
                      </div>
                    </div>
                  </div>
                </div>
              
                <div v-if="selectedArtifact?.description" class="p-4 text-sm text-gray-600 dark:text-gray-400">
                    {{selectedArtifact.description}}
                </div>

                <!-- Discussion Section -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Discussion
                        <span v-if="comments.length" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({{ comments.length }})
                        </span>
                    </h3>

                    <!-- Add Comment Form -->
                    <div v-if="store.user" class="mb-6 flex space-x-3">
                        <img class="size-6 lg:size-12 rounded-full cursor-pointer" :src="store.user.profileUrl" alt="" 
                             @click="Q('#newComment').focus()">
                        <div class="flex-grow">
                            <textarea v-model="newComment" id="newComment"
                                      placeholder="Share your thoughts about this generation..."
                                      class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows="3"></textarea>
                            <div class="flex justify-end mt-2">
                                <button @click="submitComment" type="button"
                                        :disabled="!newComment.trim() || submittingComment"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {{ submittingComment ? 'Posting...' : 'Post Comment' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Comments List -->
                    <div v-if="comments.length" class="space-y-4">
                        <div v-for="comment in comments" :key="comment.id"
                             class="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                            <div class="flex items-start space-x-3">
                                <RouterLink :to="{ path, query: { user: comment.userName } }" class="flex-shrink-0">
                                    <img v-if="comment.profileUrl"
                                         :src="comment.profileUrl"
                                         :alt="comment.userName"
                                         class="w-8 h-8 rounded-full">
                                    <div v-else class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {{ comment.userName?.charAt(0)?.toUpperCase() || '?' }}
                                        </span>
                                    </div>
                                </RouterLink>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <RouterLink :to="{ path, query: { user: comment.userName } }" class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {{ comment.userName || 'Anonymous' }}
                                        </RouterLink>
                                        <span class="text-xs text-gray-500 dark:text-gray-400">
                                            {{ formatDate(comment.createdDate) }}
                                        </span>
                                    </div>
                                    <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">{{ comment.content }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="!loadingComments" class="text-center py-8">
                        <svg class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.697-.413l-2.725.725.725-2.725A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                        </svg>
                        <p class="text-gray-500 dark:text-gray-400">No comments yet. Be the first to share your thoughts!</p>
                    </div>

                    <div v-if="loadingComments" class="text-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                </div>

              <ArtifactMenu v-if="menu" :menu="menu" @close="closeMenu" @delete="location.reload()" />
            </div>

            <!-- Right Sidebar -->
            <div class="w-full lg:w-96 flex-shrink-0 space-y-2">
                <!-- Artifact Details -->
                <div v-if="selectedArtifact" class="bg-white dark:bg-gray-800">

                    <div class="mb-4">
                        <div class="flex flex-wrap gap-2">
                            <!-- Rating Tag -->
                            <div v-if="selectedArtifact.rating">
                                <div class="flex flex-wrap gap-2">
                                    <RatingsBadge :artifact="selectedArtifact" />
                                </div>
                            </div>
                            <!-- Categories Section -->
                            <RouterLink :to="{ path, query: { category } }" v-for="(score, category) in selectedArtifact.categories ?? {}"
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
                        </div>
                    </div>

                    <!-- Tags Section -->
                    <div v-if="Object.keys(selectedArtifact.tags ?? {}).length > 0">
                        <div class="flex flex-wrap gap-2">
                            <RouterLink :to="{ path, query: { tag } }"  v-for="(score, tag) in selectedArtifact.tags ?? {}"
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
                        <div class="mt-2 flex items-center space-x-2">
                          <RouterLink @click.stop v-if="selectedArtifact?.userName" :to="{ path, query: { user: selectedArtifact?.userName } }" class="flex items-center space-x-1 text-sm opacity-75" :title="'Explore @' + selectedArtifact.userName + ' creations'">
                            <img class="mt-1 ml-1 size-6 rounded-full" :src="'/avatar/' + selectedArtifact.userName" :alt="selectedArtifact.userName + ' avatar'">
                            <p v-if="selectedArtifact.userKarma" class="text-yellow-700 dark:text-yellow-300 font-medium lg:block">{{humanifyNumber(selectedArtifact.userKarma)}}</p>
                          </RouterLink>

                          <RouterLink v-if="isType('Image')" :to="{ path, query: { similar: selectedArtifact.id } }"
                            class="flex items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400"
                            title="Explore Similar Images">
                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"></path></svg>
                            <span>explore similar</span>
                          </RouterLink>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="Object.keys(selectedArtifact.categories ?? {}).length === 0 && Object.keys(selectedArtifact.tags ?? {}).length === 0"
                         class="text-center py-4">
                        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <p class="text-sm text-gray-500 dark:text-gray-400">No categories or tags available</p>
                    </div>
                </div>

                <!-- Prompt -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Prompt</h3>
                        <button @click="copyDescription" type="button"
                                class="p-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors opacity-50 hover:opacity-100"
                                :title="copiedDescription ? 'Copied!' : 'Copy description'">
                            <svg v-if="copiedDescription" class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <svg v-else class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                        {{ generation.args?.positivePrompt || generation.description || 'No description available' }}
                    </p>
                    <div v-if="generation.args?.negativePrompt" class="mt-4">
                        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Negative Prompt</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">{{ generation.args.negativePrompt }}</p>
                    </div>
                </div>
            
                <!-- Technical Details -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex justify-between">
                        <span>{{workflow?.name ?? 'Technical Details'}}</span>
                        <RouterLink :to="{ path:'/generate/feed', query: { 'new':'', remix: generation.id } }"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                title="Remix this generation with the same settings">
                            Remix
                        </RouterLink>
                    </h3>
                    <div class="space-y-3 text-sm">
                        <div v-if="generation.checkpoint" class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Checkpoint</span>
                            <span class="text-gray-900 dark:text-gray-100 max-w-48 truncate" :title="generation.checkpoint">{{ generation.checkpoint }}</span>
                        </div>
                        <div v-if="generation.lora" class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">LoRA</span>
                            <span class="text-gray-900 dark:text-gray-100 max-w-48 truncate" :title="generation.lora">{{ generation.lora }}</span>
                        </div>
                        <div v-if="generation.vae" class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">VAE</span>
                            <span class="text-gray-900 dark:text-gray-100 max-w-48 truncate" :title="generation.vae">{{ generation.vae }}</span>
                        </div>
                        <div v-if="generation.controlNet" class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">ControlNet</span>
                            <span class="text-gray-900 dark:text-gray-100 max-w-48 truncate" :title="generation.controlNet">{{ generation.controlNet }}</span>
                        </div>
                        <div v-if="generation.upscaler" class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Upscaler</span>
                            <span class="text-gray-900 dark:text-gray-100 max-w-48 truncate" :title="generation.upscaler">{{ generation.upscaler }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Credits</span>
                            <span class="text-gray-900 dark:text-gray-100">{{ generation.credits || 0 }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Created</span>
                            <span class="text-gray-900 dark:text-gray-100">{{ formatDate(generation.createdDate) }}</span>
                        </div>
                    </div>
                    <div v-if="workflowVersion" class="mt-3 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Other Assets</span>
                            <div class="text-right">
                                <div v-for="asset in workflowVersion.assets
                                    .filter(x => ![generation.checkpoint, generation.lora, generation.vae, generation.controlNet, generation.upscaler]
                                                 .includes(leftPart(lastRightPart(x,'/'),'.')))">
                                    <span :title="asset">{{leftPart(lastRightPart(asset,'/'),'.')}}</span>
                                </div>
                            </div>
                        </div>
                        <div v-if="workflowVersion.nodes.length" class="mt-3 flex justify-between">
                            <span class="text-gray-500 dark:text-gray-400">Custom Nodes</span>
                            <div class="text-right">
                                <div v-for="node in [...new Set(workflowVersion.nodes)].sort()">
                                    <span :title="node">{{node}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Generation Parameters -->
                <div v-if="filteredArgs.length" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Generation Parameters</h3>
                    <div class="space-y-3">
                        <div v-for="(value, field) in filteredArgs" :key="field"
                             class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0">
                            <div class="flex justify-between items-start">
                                <span class="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                                    {{ formatFieldName(field) }}
                                </span>
                                <span class="text-sm text-gray-900 dark:text-gray-100 text-right ml-4 truncate" :title="formatFieldValue(value)">
                                    {{ formatFieldValue(value) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Variant Gallery -->
                <div v-if="store.variantWorkflowsForArtifact(selectedArtifact).length || variants.length" 
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Variants</h3>
                    
                    <div v-if="variants.length" class="grid grid-cols-2 gap-4">
                      <RouterLink v-for="artifact in variants" :key="artifact.id"
                           class="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-blue-500 relative"
                           :to="{ path:'/generations/' + artifact.generationId }">
                        <div v-if="getHDClass(artifact.width, artifact.height)" class="absolute top-1 left-1 flex items-center inline-flex rounded-sm bg-gray-200/50 dark:bg-gray-700/50 px-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-700/10">
                          {{getHDClass(artifact.width, artifact.height)}}
                        </div>
                        <img v-if="store.isRatingViewable(artifact)"
                             :src="artifact.url"
                             :alt="'Artifact ' + artifact.id"
                             class="w-full object-cover">
                    
                        <!-- Ratings Guard for Thumbnails -->
                        <div v-else class="w-full h-full py-8 text-center bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-2">
                          <!-- Large Rating Tag -->
                          <div class="flex justify-center mb-2">
                            <RatingsBadge :artifact="artifact" />
                          </div>
                          <span class="text-xs text-gray-400">Restricted Content</span>
                        </div>
                        <span v-if="artifact.variantName" class="px-1 text-xs text-center truncate" :title="artifact.variantName">{{artifact.variantName}}</span>
                      </RouterLink>
                    </div>
                    
                    <div v-if="store.variantWorkflowsForArtifact(selectedArtifact).length" class="mt-4 flex items-end gap-x-2">
                      <SelectInput id="newVariant" v-model="newVariant" 
                                   :entries="store.variantWorkflowsForArtifact(selectedArtifact).map(x => ({ key: x.id, value: x.name }))" />
                      <div>
                        <RouterLink :to="!newVariant ? '' : { path:'/generate/feed', query: { 'new':'', version:newVariant, image:lastRightPart(selectedArtifact.url,'/') } }"
                                    class="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-lg transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                    :class="!newVariant ? 'bg-purple-800' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105 '"
                                    title="Remix this generation with the same settings">
                          Remix
                        </RouterLink>
                      </div>
                    </div>
                </div>
              
            </div>
        </div>
    `,
    setup() {
        const store = inject('store')
        const route = useRoute()
        const client = useClient()
        const { formatDate } = useFormatters()
        const { copyText } = useUtils()

        const refAudio = ref()
        const generation = ref()
        const artifacts = ref([])
        const variants = ref([])
        const newVariant = ref('')
        const error = ref()
        const selectedUrl = ref()
        const comments = ref([])
        const newComment = ref('')
        const submittingComment = ref(false)
        const loadingComments = ref(false)
        const userVotes = ref({})
        const copiedDescription = ref(false)
        const workflow = computed(() => store.workflows.find(x => x.id === generation.value?.workflowId))
        const workflowVersion = computed(() => 
            store.workflowVersions.find(x => x.id === generation.value?.versionId)
            ?? store.workflowVersions.find(x => x.parentId === generation.value?.workflowId))
        
        const path = computed(() => {
            return generation.value?.output?.toLowerCase() === 'audio'
                ? '/audio'
                : '/images'
        })
        
        const selectedArtifact = computed(() => {
            const artifact = artifacts.value.find(a => a.url === selectedUrl.value)
            // If no artifact matches the selectedUrl, use the first artifact as fallback
            return artifact || artifacts.value[0]
        })

        const filteredArgs = computed(() => {
            if (!generation.value?.args) return {}
            const { positivePrompt, negativePrompt, ...rest } = generation.value.args
            return rest
        })

        const menu = ref({
            show: false,
            x: 0,
            y: 0,
            image: null
        })

        function isType(type) {
            if (!selectedArtifact.value) return null
            return typeof type === 'string'
                ? selectedArtifact.value.type === type
                : Array.isArray(type)
                    ? type.includes(selectedArtifact.value.type)
                    : false
        }

        function formatFieldName(field) {
            return field.replace('_', ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        }

        function formatFieldValue(value) {
            if (typeof value === 'boolean') return value ? 'Yes' : 'No'
            if (typeof value === 'number') return value.toString()
            if (Array.isArray(value)) return value.join(', ')
            if (typeof value === 'object') return JSON.stringify(value)
            return value?.toString() || ''
        }

        async function loadComments() {
            let threadId = generation.value?.publicThreadId
            if (!threadId) {
                await loadGeneration()
                threadId = generation.value?.publicThreadId
                if (!threadId) return
            }

            loadingComments.value = true
            try {
                const api = await client.api(new QueryComments({ 
                    threadId,
                    orderByDesc: 'id'
                }))
                if (api.succeeded) {
                    comments.value = api.response?.results || []
                }
            } catch (err) {
                console.error('Error loading comments:', err)
            } finally {
                loadingComments.value = false
            }
        }

        async function submitComment() {
            if (!newComment.value.trim() || !generation.value?.threadId) return

            submittingComment.value = true
            try {
                const api = await client.api(new CreateGenerationComment({
                    generationId: generation.value.id,
                    content: newComment.value.trim()
                }))

                if (api.succeeded) {
                    newComment.value = ''
                    await loadComments() // Reload comments
                }
            } catch (err) {
                console.error('Error submitting comment:', err)
            } finally {
                submittingComment.value = false
            }
        }

        function copyDescription() {
            const description = generation.value?.args?.positivePrompt || generation.value?.description || 'No description available'
            copyText(description)
            copiedDescription.value = true
            setTimeout(() => copiedDescription.value = false, 3000)
        }
        
        async function loadGeneration() {
            error.value = null
            const api = await store.getWorkflowGeneration(route.params.id)
            generation.value = api.response?.result
            artifacts.value = api.response?.artifacts ?? []
            error.value = api.error
        }
        
        async function loadVariants() {
            const api = await client.api(new GetArtifactVariants({
                generationId: route.params.id
            }))
            variants.value = api.response?.results ?? []
        }

        async function onRouteChange() {
            await Promise.all([
                loadGeneration(),
                loadVariants(),
            ])

            // Set the selected URL, preferring posterImage, then first artifact URL
            if (generation.value?.posterImage) {
                selectedUrl.value = generation.value.posterImage
            } else if (artifacts.value.length > 0) {
                // Use the first artifact's URL directly since artifacts from GetWorkflowGeneration
                // should already have the correct URLs
                selectedUrl.value = artifacts.value[0].url
            }

            // Debug logging for troubleshooting
            console.log('Generation page loaded:', {
                hasGeneration: !!generation.value,
                artifactsCount: artifacts.value.length,
                selectedUrl: selectedUrl.value,
                posterImage: generation.value?.posterImage,
                selectedRatings: store.selectedRatings,
                artifactRatings: artifacts.value.map(a => ({
                    url: a.url,
                    rating: a.rating || 'Unrated',
                    isViewable: store.isRatingViewable(a)
                }))
            })

            // Load comments and user votes if generation has a threadId
            if (generation.value?.threadId) {
                await Promise.all([
                    loadComments(),
                ])
            }
        }

        watch(() => route.path, onRouteChange)

        onMounted(async () => {
            document.addEventListener("keydown", handleKeydown)
            await onRouteChange()
        })

        onUnmounted(() => {
            document.removeEventListener("keydown", handleKeydown)
        })
        

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

        // Keyboard navigation
        function handleKeydown(event) {
            switch (event.key) {
                case "Escape":
                    if (menu.value.show) {
                        closeMenu()
                    }
                    break
            }
        }

        function isPlaying(audio) {
            return refAudio.value?.player?.isPlaying && playAudio.value === audio
        }
        

        return {
            Q:$1,
            store,
            error,
            refAudio,
            menu,
            path,
            generation,
            artifacts,
            variants,
            newVariant,
            selectedUrl,
            selectedArtifact,
            workflow,
            workflowVersion,
            comments,
            newComment,
            submittingComment,
            loadingComments,
            userVotes,
            copiedDescription,
            filteredArgs,
            formatFieldName,
            formatFieldValue,
            formatDate,
            loadComments,
            submitComment,
            copyDescription,
            leftPart,
            lastRightPart,
            toggleMenu,
            showContextMenu,
            closeMenu,
            handleKeydown,
            getHDClass,
            getRatingColorClass,
            isType,
            isPlaying,
        }
    }
}