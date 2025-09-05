import { ref, inject, onUnmounted } from "vue"
import { useClient, useAuth } from "@servicestack/vue"
import { SubmitArtifactModeration, RequeueGeneration } from "dtos.mjs"
import { formatRating } from "../lib/utils.mjs"

export default {
    template:`
        <!-- Dropdown Menu -->
        <div v-if="menu.show"
             :style="{ top: menu.y + 'px', left: menu.x + 'px' }"
             class="fixed z-50 w-52 rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black/5 dark:ring-gray-700/50 focus:outline-none"
             @click.stop>

            <!-- Suggest New Rating with submenu -->
            <div v-if="isType(['Image','Video'])" class="relative group">
                <button @click="toggleRatingSubmenu"
                        class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                    <div class="flex items-center">
                        <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Suggest Rating
                    </div>
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>

                <!-- Rating submenu -->
                <div v-if="showRatingSubmenu"
                     class="absolute left-full top-0 ml-1 w-32 rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black/5 dark:ring-gray-700/50">
                    <button v-for="rating in availableRatings" :key="rating"
                            @click="handleAction('rating', menu.artifact, { rating })"
                            :class="[
                                'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center',
                                menu.artifact?.rating === rating
                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'text-gray-700 dark:text-gray-200'
                            ]">
                        <svg v-if="menu.artifact?.rating === rating" class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span v-else class="size-4 mr-2"></span>
                        {{ formatRating(rating) }}
                    </button>
                </div>
            </div>

            <button @click="handleAction('download', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                <svg class="size-5 mr-2 -ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>
                Download {{menu.artifact.type}}
            </button>
            <button @click="handleAction('copyPrompt', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M16 3H4v13"/><path d="M8 7h12v12a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"/></g></svg>
                Copy Prompt
            </button>
            <button v-if="isType(['Image','Video'])" @click="handleAction('hide', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                </svg>
                Hide Image
            </button>
            <button @click="handleAction('report', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9s10.3-3.9 14.2 0 3.9 10.3 0 14.2-10.3 3.9-14.2 0zM12 8v4M12 16h.01"/>
                </svg>
                Report {{menu.artifact.type}}
            </button>
            <button v-if="store.isAdmin" @click="handleAction('delete', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <!-- delete icon -->
                    <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 11v6m-4-6v6M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M4 7h16M7 7l2-4h6l2 4"/></svg>
                Delete {{menu.artifact.type}} <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">#{{menu.artifact.id}}</span>
            </button>
            <button v-if="store.isAdmin" @click="handleAction('regenerate', menu.artifact)" type="button" :disabled="isRegenerating(menu.artifact)"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <!-- regenerate icon -->
                    <svg class="size-4 mr-2" :class="{ 'animate-spin': isRegenerating(menu.artifact) }" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -2 24 24"><path fill="currentColor" d="m19.347 7.24l.847-1.266a.984.984 0 0 1 1.375-.259c.456.31.58.93.277 1.383L19.65 10.38a.984.984 0 0 1-1.375.259L14.97 8.393a1 1 0 0 1-.277-1.382a.984.984 0 0 1 1.375-.26l1.344.915C16.428 4.386 13.42 2 9.863 2c-4.357 0-7.89 3.582-7.89 8s3.533 8 7.89 8c.545 0 .987.448.987 1s-.442 1-.987 1C4.416 20 0 15.523 0 10S4.416 0 9.863 0c4.504 0 8.302 3.06 9.484 7.24"/></svg>
                {{ isRegenerating(menu.artifact) ? 'Regenerating...' : 'Regenerate ' + menu.artifact.type }}
            </button>
            <button v-if="store.isAdmin && isType(['Image','Video']) && store.workflows.find(x => x.version.id === menu.artifact.versionId)" @click="handleAction('pinWorkflowPoster', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <!-- pin icon -->
                    <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m10.25 10.25l4 4m-12.5-7.5l5-5s1 2 2 3s4.5 2 4.5 2l-6.5 6.5s-1-3.5-2-4.5s-3-2-3-2"/></svg>
                <span class="whitespace-nowrap overflow-hidden text-ellipsis" :title="store.workflows.find(x => x.version.id === menu.artifact.versionId)?.name">
                    Pin to {{store.workflows.find(x => x.version.id === menu.artifact.versionId)?.name}}
                </span>
            </button>
            <button v-if="store.isAdmin && isType(['Image','Video']) && menu.artifact.height > menu.artifact.width && !store.isArtifactFeatured(menu.artifact)" @click="handleAction('featureArtifact', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <!-- feature icon -->
                    <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m8.58 17.25l.92-3.89l-3-2.58l3.95-.37L12 6.8l1.55 3.65l3.95.33l-3 2.58l.92 3.89L12 15.19zM12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2m0 2a8 8 0 0 0-8 8a8 8 0 0 0 8 8a8 8 0 0 0 8-8a8 8 0 0 0-8-8"/></svg>
                <span class="whitespace-nowrap overflow-hidden text-ellipsis" :title="store.workflows.find(x => x.version.id === menu.artifact.versionId)?.name">
                    Feature Portrait
                </span>
            </button>
            <button v-if="store.isAdmin && isType(['Image','Video']) && menu.artifact.height > menu.artifact.width && !store.isArtifactUnFeatured(menu.artifact)" @click="handleAction('unFeatureArtifact', menu.artifact)" type="button"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <!-- un feature icon -->
                    <svg class="size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="currentColor" d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2m0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12s-5.4 12-12 12"/><path fill="currentColor" d="M21.4 23L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z"/></svg>
                <span class="whitespace-nowrap overflow-hidden text-ellipsis" :title="store.workflows.find(x => x.version.id === menu.artifact.versionId)?.name">
                    Un Feature Portrait
                </span>
            </button>
        </div>    

        <!-- Toast Error Notification -->
        <div v-if="toastError.show"
             class="fixed bottom-4 right-4 z-50 max-w-sm bg-red-900/90 text-white px-4 py-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out"
             :class="toastError.show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M11.001 10h2v5h-2zM11 16h2v2h-2z"/><path fill="currentColor" d="M13.768 4.2C13.42 3.545 12.742 3.138 12 3.138s-1.42.407-1.768 1.063L2.894 18.064a1.99 1.99 0 0 0 .054 1.968A1.98 1.98 0 0 0 4.661 21h14.678c.708 0 1.349-.362 1.714-.968a1.99 1.99 0 0 0 .054-1.968zM4.661 19L12 5.137L19.344 19z"/></svg>
                    <span class="text-sm font-medium">{{ toastError.message }}</span>
                </div>
                <button @click="hideToastError" type="button"
                        class="ml-4 text-white hover:text-gray-200 transition-colors">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `,
    emits:['close','delete'],
    props: {
        menu: Object
    },
    setup(props, { emit }) {
        const client = useClient()
        const store = inject('store')
        const { user, isAdmin } = useAuth()
        const showRatingSubmenu = ref(false)
        const availableRatings = ['PG','PG13','M','R','X','XXX']
        const regeneratingIdMap = ref({})
        const toastError = ref({
            show: false,
            message: '',
            timeoutId: null
        })
        
        function isType(type) {
            return typeof type === 'string' 
                ? props.menu.artifact.type === type
                : Array.isArray(type)
                    ? type.includes(props.menu.artifact.type)
                    : false
        }

        function isRegenerating(image) {
            return regeneratingIdMap.value[image.generationId] && new Date(regeneratingIdMap.value[image.generationId]) >= new Date(image.modifiedDate)
        }

        function closeMenu() {
            showRatingSubmenu.value = false
            emit('close')
            return false
        }

        async function handleAction(action, image, args) {
            
            if (action === 'download') {
                location.href = image.url + "?download=1"
                return closeMenu()
            }
            if (action === 'copyPrompt') {
                const gen = await store.findWorkflowGeneration(image.generationId)
                if (gen) {
                    navigator.clipboard.writeText(gen.description)
                } else {
                    showToastError('Could not find generation')
                }
                return closeMenu()
            }
            
            if (!user.value) {
                // showToastError('You must be logged in to perform this action', args)
                closeMenu()
                location.href = '/Account/Login'
                return closeMenu()
            }

            const request = new SubmitArtifactModeration({
                artifactId: image.id,
            })
            // Here you can implement the actual remove/report functionality
            if (action === 'hide') {
                // Hide the image by adding its ID to the hidden set
                if (store.hiddenImages.includes(image.id)) {
                    console.log('Image already hidden:', image.id)
                    return closeMenu()
                }
                store.hiddenImages.push(image.id)
                request.hideArtifact = true
                console.log('Hiding image:', image.id)
            } else if (action === 'rating') {
                request.rating = args.rating
            } else if (action === 'delete') {
                console.log('Removing image:', image.id)
                request.poorQuality = 1
            } else if (action === 'regenerate') {

                if (image.generationId in regeneratingIdMap.value) {
                    showToastError('Already regenerating image')
                    return closeMenu()
                }

                // Implement remove image logic
                console.log('Regenerating image:', image.id, image.generationId, image.modifiedDate)

                const api = await client.api(new RequeueGeneration({
                    id: image.generationId,
                }))
                if (api.succeeded) {
                    regeneratingIdMap.value[image.generationId] = image.modifiedDate
                } else if (api.error) {
                    showToastError(api.error?.message || 'Failed to perform action')
                }

                return closeMenu()
            } else if (action === 'pinWorkflowPoster') {
                const api = await store.pinWorkflowPoster(image.versionId, image.url)
                if (api.error) {
                    showToastError(api.error?.message || 'Failed to perform action')
                }
                return closeMenu()
            } else if (action === 'featureArtifact') {
                const api = await store.featureArtifact(image)
                if (api.error) {
                    showToastError(api.error?.message || 'Failed to perform action')
                }
                return closeMenu()
            } else if (action === 'unFeatureArtifact') {
                const api = await store.unFeatureArtifact(image)
                if (api.error) {
                    showToastError(api.error?.message || 'Failed to perform action')
                }
                return closeMenu()
            } else if (action === 'report') {
                // Implement report image logic
                console.log('Reporting image:', image.id)
                return closeMenu()
            } else {
                console.log('Unknown action:', action, image.id)
                return closeMenu()
            }

            console.log(`Action: ${action}`, image, request)
            try {
                const api = await client.api(request)
                const artifact = api.response
                if (artifact) {
                    if (artifact.deletedDate) {
                        // Remove the image from the list
                        emit('delete',image)
                    }
                    // Update the local image rating
                    image.rating = artifact.rating
                    store.processDeletedRows()
                } else if (api.error) {
                    showToastError(api.error?.message || 'Failed to perform action')
                }
            } catch (err) {
                showToastError(err.message || 'Failed to perform action')
            }

            return closeMenu()
        }

        function toggleRatingSubmenu() {
            showRatingSubmenu.value = !showRatingSubmenu.value
        }

        function showToastError(message) {
            console.error('showToastError called with message:', message)

            // Clear any existing timeout
            if (toastError.value.timeoutId) {
                clearTimeout(toastError.value.timeoutId)
            }

            // Show the toast
            toastError.value.message = message
            toastError.value.show = true

            console.log('Toast state after setting:', {
                show: toastError.value.show,
                message: toastError.value.message
            })

            // Auto-hide after 5 seconds
            toastError.value.timeoutId = setTimeout(() => {
                console.log('Auto-hiding toast')
                toastError.value.show = false
                toastError.value.message = ''
                toastError.value.timeoutId = null
            }, 5000)
        }

        function hideToastError() {
            if (toastError.value.timeoutId) {
                clearTimeout(toastError.value.timeoutId)
                toastError.value.timeoutId = null
            }
            toastError.value.show = false
            toastError.value.message = ''
        }

        onUnmounted(() => {
            // Clean up toast timeout
            if (toastError.value.timeoutId) {
                clearTimeout(toastError.value.timeoutId)
            }
        })

        return {
            store,
            user,
            isAdmin,
            toastError,
            showRatingSubmenu,
            availableRatings,
            isType,
            isRegenerating,
            formatRating,
            handleAction,
            hideToastError,
            toggleRatingSubmenu,
        }
    }
}