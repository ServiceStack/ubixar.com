import { ref, computed, onMounted, onUnmounted, inject, watch } from "vue"
import { useClient, useFormatters, useUtils } from "@servicestack/vue"
import { $1, leftPart, lastRightPart } from "@servicestack/client"
import { QueryComments, CreateThreadReaction, DeleteThreadReaction, MyThreadReactions, CreateComment, DeleteComment, } from "../dtos.mjs"

export function toJsonArray(json) {
    try {
        return json ? JSON.parse(json) : []
    } catch (e) {
        return []
    }
}
export function toJsonObject(json) {
    try {
        return json ? JSON.parse(json) : null
    } catch (e) {
        return null
    }
}
export function storageArray(key) {
    return toJsonArray(localStorage.getItem(key)) ?? []
}
export function storageObject(key) {
    return toJsonObject(localStorage.getItem(key)) ?? {}
}
export function redirectedAnonUser(ctx) {
    if (!ctx.state.user) {
        location.href = '/Account/Login?ReturnUrl=' + encodeURIComponent(location.href)
        return true
    }
    return false
}

const reactionEmojis = ["👍", "❤", "😂", "😢"]
export function reactionCounts(reactions, emojis = null) {
    const ret = {}
    emojis ??= reactionEmojis
    emojis.forEach(emoji => {
        ret[emoji] = reactions[emoji] || 0
    })
    return ret
}

function getSignInUrl() {
    return `/Account/Login?ReturnUrl=` + encodeURIComponent(location.href)
}

export const ThreadComments = {
    template: `
    <!-- Discussion Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 pr-6 mb-6">
        <h3 v-if="comments.length" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Comments
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({{ comments.length }})
            </span>
        </h3>

        <div v-else-if="!loadingComments" class="text-center flex gap-2">
            <svg class="size-6 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 2.19c3.13 0 5.68 2.25 5.68 5s-2.55 5-5.68 5a5.7 5.7 0 0 1-1.89-.29l-.75-.26l-.56.56a14 14 0 0 1-2 1.55a.13.13 0 0 1-.07 0v-.06a6.58 6.58 0 0 0 .15-4.29a5.25 5.25 0 0 1-.55-2.16c0-2.77 2.55-5 5.68-5M8 .94c-3.83 0-6.93 2.81-6.93 6.27a6.4 6.4 0 0 0 .64 2.64a5.53 5.53 0 0 1-.18 3.48a1.32 1.32 0 0 0 2 1.5a15 15 0 0 0 2.16-1.71a6.8 6.8 0 0 0 2.31.36c3.83 0 6.93-2.81 6.93-6.27S11.83.94 8 .94"></path>
              <ellipse cx="5.2" cy="7.7" fill="currentColor" rx=".8" ry=".75"></ellipse><ellipse cx="8" cy="7.7" fill="currentColor" rx=".8" ry=".75"></ellipse><ellipse cx="10.8" cy="7.7" fill="currentColor" rx=".8" ry=".75"></ellipse>
            </svg>
            <p class="text-gray-500 dark:text-gray-400">
                No comments yet. 
              <a :href="getSignInUrl()" v-if="!$state.user" class="underline">Sign In</a>
              <span v-else>Be the first</span>
              to share your thoughts!
            </p>
        </div>

        <!-- Add Comment Form -->
        <div v-if="$state.user" class="mt-4 flex space-x-3">
            <img class="size-6 lg:size-12 rounded-full cursor-pointer" :src="$state.user.profileUrl" alt="" 
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
                        {{ submittingComment ? 'Commenting...' : 'Add Comment' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Comments List -->
        <div v-if="comments.length" class="mt-4 space-y-4">
            <div v-for="comment in comments" :key="comment.id"
                 class="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                <div class="flex items-start space-x-3">
                    <span class="flex-shrink-0">
                        <img v-if="comment.profileUrl"
                             :src="comment.profileUrl"
                             :alt="comment.userName"
                             class="w-8 h-8 rounded-full">
                        <div v-else class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                                {{ comment.userName?.charAt(0)?.toUpperCase() || '?' }}
                            </span>
                        </div>
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="mb-1 flex justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {{ comment.userName || 'Anonymous' }}
                                </span>
                                <span class="text-xs text-gray-500 dark:text-gray-400" :title="comment.createdDate">
                                    {{ relativeTimeFromDate(new Date(comment.createdDate)) }}
                                </span>
                            </div>
                            <div>
                                <button v-if="comment.userName === $state.user?.userName" type="button" class="m-0" @click="deleteComment(comment)" title="Delete Comment">
                                    <svg class="size-4 text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100" viewBox="0 0 32 32"><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z"></path><path fill="currentColor" d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"></path></svg>
                                </button>
                            </div>
                        </div>
                        <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">{{ comment.content }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="loadingComments" class="text-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
    </div>    
    `,
    setup(props) {
        const thread = inject('thread')
        const client = useClient()
        const { formatDate, relativeTimeFromDate } = useFormatters()
        const { copyText } = useUtils()

        const comments = ref([])
        const newComment = ref('')
        const submittingComment = ref(false)
        const loadingComments = ref(false)

        async function loadComments() {
            loadingComments.value = true
            try {
                const api = await client.api(new QueryComments({
                    threadId: thread.id,
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
            if (!newComment.value.trim() || !thread.id) return

            submittingComment.value = true
            try {
                const api = await client.api(new CreateComment({
                    threadId: thread.id,
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

        async function deleteComment(comment) {
            const api = await client.api(new DeleteComment({
                id: comment.id
            }))
            await loadComments()
        }

        onMounted(async () => {
            await loadComments()
        })

        return {
            Q: $1,
            client,
            comments,
            newComment,
            loadingComments,
            submittingComment,
            formatDate,
            relativeTimeFromDate,
            copyText,
            submitComment,
            deleteComment,
            getSignInUrl,
        }
    }
}


export const ThreadReactions = {
    template: `
    <div class="text-sm flex items-center justify-between w-full">
        <button v-for="(count,emoji) of reactionCounts(reactions)" type="button" @click.prevent.stop="toggleReaction(emoji)"
                :title="'React with ' + emoji"
                class="px-1 py-0.5 lg:px-2 rounded border border-transparent" :class="[ hasReaction(threadId, emoji) ? 'shadow-sm bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700' ]">
            <div>
                <span class="flex gap-1">
                    <div :class="{ 'text-red-500': emoji == '❤' }">{{emoji === '❤' ? '&hearts;' : emoji}}</div> {{count}}
                </span>
            </div>
        </button>
    </div>
    `,
    props: {
        threadId: Number,
        reactions: Object,
    },
    emits: ['changed'],
    setup(props, { emit }) {
        const ctx = inject('ctx')
        const client = inject('client')
        
        const threadReactionsMap = ref({})

        function hasReaction(threadId, reaction) {
            return threadReactionsMap.value[threadId]?.includes(reaction)
        }

        async function loadMyThreadReactions() {
            const api = await client.api(new MyThreadReactions({ threadId: props.threadId }))
            if (api.response) {
                threadReactionsMap.value = {}
                for (const reaction of api.response.results) {
                    threadReactionsMap.value[reaction.t] ??= []
                    threadReactionsMap.value[reaction.t].push(String.fromCodePoint(reaction.r))
                }
            }
        }

        async function toggleReaction(reactionChar) {
            if (redirectedAnonUser(ctx)) return

            const hadReaction = hasReaction(props.threadId, reactionChar)
            const reaction = reactionChar.codePointAt(0)
            const threadId = props.threadId
            const request = hadReaction
                ? new DeleteThreadReaction({ threadId, reaction })
                : new CreateThreadReaction({ threadId, reaction })
            const api = await client.apiVoid(request)
            if (api.succeeded) {
                const reactionChar = String.fromCodePoint(reaction)
                if (props.reactions[reactionChar] == null) {
                    props.reactions[reactionChar] = 0
                }
                if (hadReaction) {
                    threadReactionsMap.value[props.threadId] = threadReactionsMap.value[props.threadId].filter(x => x !== reactionChar)
                    props.reactions[reactionChar]--
                } else {
                    threadReactionsMap.value[props.threadId] ??= []
                    threadReactionsMap.value[props.threadId].push(reactionChar)
                    props.reactions[reactionChar]++
                }
            }
            return api
        }

        onMounted(async () => {
            await loadMyThreadReactions()
        })

        return {
            hasReaction,
            toggleReaction,
            reactionCounts,
        }
    }
}