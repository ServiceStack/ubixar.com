import { ref, computed, inject, onMounted, onUnmounted } from "vue"

class Artifact {
    width = 0
    height = 0
}

export const ArtifactImage = {
    template:`<div v-if="artifact" class="overflow-hidden" :style="(imageStyle ?? '') + ';' + (artifact.style ?? '')" @click="$emit('click', $event)">
      <img :alt="artifact.prompt" :width="artifact.preview?.width || artifact.width" :height="artifact.preview?.height || artifact.height"
           :class="[imageClass, draggable ? 'cursor-grab active:cursor-grabbing' : '']"
           :src="artifact.preview?.url || artifact.url" :loading="loading || 'lazy'" @error="this.src = artifact.errorUrl"
           :draggable="draggable" @dragstart="handleDragStart">

  </div>`,
    props: {
        /** @type {import('vue').PropType<Artifact>} */
        artifact:Object,
        imageClass:String,
        imageStyle:String,
        minSize:Number,
        /** @type {import('vue').PropType<'eager'|'lazy'>} */
        loading:String,
        draggable:Boolean,
        generation:Object,
    },
    emits:['dragstart', 'click'],
    setup(props, { emit }) {
        const store = inject('store')

        function handleDragStart(event) {
            if (props.draggable && props.generation) {
                // Set the generation data for the drag operation
                event.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'generation',
                    generationId: props.generation.id,
                    threadId: props.generation.threadId
                }))
                event.dataTransfer.effectAllowed = 'move'
                emit('dragstart', props.generation)
            }
        }

        return {
            store,
            handleDragStart
        }
    }
}

export const ArtifactGallery = {
    components: {
        ArtifactImage,
    },
    template:`<div>
        <div class="grid grid-cols-3 sm:grid-cols-4">
            <div v-for="artifact in results" :key="artifact.id" :class="[artifact.width > artifact.height ? 'col-span-2' : artifact.height > artifact.width ? 'row-span-2' : '']">
                <slot name="artifact-top" :artifact="artifact" :selected="selected"></slot>
                <div @click="handleArtifactClick(artifact, $event)" class="flex justify-center cursor-pointer">
                    <div class="relative flex flex-col items-center" :style="'max-width:' + artifact.width + 'px'">
                        <ArtifactImage :artifact="artifact" :class="artifact.cls ?? 'border border-transparent'"
                            :draggable="!!generation" :generation="generation" @dragstart="handleDragStart" @click="handleArtifactClick(artifact, $event)" />
                        <div class="absolute top-0 left-0 w-full h-full group select-none overflow-hidden border sm:border-2 border-transparent pointer-events-none">
                            <div class="w-full h-full absolute inset-0 z-10 block text-zinc-100 drop-shadow pointer-events-none line-clamp sm:px-2 sm:pb-2 text-sm opacity-0 group-hover:opacity-40 transition duration-300 ease-in-out bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black"></div>
                            <div class="absolute w-full h-full flex z-10 text-zinc-100 justify-between drop-shadow opacity-0 group-hover:opacity-100 transition-opacity sm:mb-1 text-sm">
                                <div class="relative w-full h-full overflow-hidden flex flex-col justify-between overflow-hidden"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <slot name="artifact-bottom" :artifact="artifact" :selected="selected"></slot>
            </div>
        </div>
        <ModalDialog v-if="selected" size-class="" @done="selected=null" class="z-20"
            closeButtonClass="rounded-md text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-600 ring-offset-gray-600">
            <div class="relative">
                <img :src="selected.url">
                <!-- Left Navigation Button -->
                <div v-if="results.length > 1" @click.stop.prevent="navigatePrevious"
                     class="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16 cursor-pointer group">
                    <div class="p-2 rounded-full bg-black/30 text-white opacity-30 group-hover:opacity-80 transition-opacity">
                        <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </div>
                </div>
                <!-- Right Navigation Button -->
                <div v-if="results.length > 1" @click.stop.prevent="navigateNext"
                     class="absolute right-0 top-0 bottom-0 flex items-center justify-center w-16 cursor-pointer group">
                    <div class="p-2 rounded-full bg-black/30 text-white opacity-30 group-hover:opacity-80 transition-opacity">
                        <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            </div>
            <template #bottom>
                <slot name="bottom" :selected="selected"></slot>
            </template>
        </ModalDialog>
    </div>`,
    props: {
        results:Array,
        generation:Object,
    },
    emits:['start-drag'],
    setup(props, { emit, expose }) {
        const store = inject('store')
        const selected = ref()
        const isDragging = ref(false)

        // Computed properties for navigation
        const currentIndex = computed(() => {
            if (!selected.value || !props.results) return -1
            // Find the index by comparing URLs since artifacts might not have consistent IDs
            return props.results.findIndex(a => a.url === selected.value.url)
        })

        // Navigation functions
        function navigatePrevious() {
            if (!props.results || props.results.length === 0) return

            if (currentIndex.value > 0) {
                // Go to previous image
                selected.value = props.results[currentIndex.value - 1]
            } else {
                // Cycle to the last image
                selected.value = props.results[props.results.length - 1]
            }
        }

        function navigateNext() {
            if (!props.results || props.results.length === 0) return

            if (currentIndex.value < props.results.length - 1) {
                // Go to next image
                selected.value = props.results[currentIndex.value + 1]
            } else {
                // Cycle to the first image
                selected.value = props.results[0]
            }
        }

        // Keyboard navigation handler
        function handleKeyDown(e) {
            if (!selected.value) return

            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                navigatePrevious()
                e.preventDefault() // Prevent page scrolling
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                navigateNext()
                e.preventDefault() // Prevent page scrolling
            }
        }

        // Add and remove keyboard event listener
        onMounted(() => {
            window.addEventListener('keydown', handleKeyDown)
        })

        onUnmounted(() => {
            window.removeEventListener('keydown', handleKeyDown)
        })

        function handleDragStart(generation) {
            isDragging.value = true
            emit('start-drag', generation)
            // Reset dragging state after a short delay
            setTimeout(() => {
                isDragging.value = false
            }, 100)
        }

        function handleArtifactClick(artifact, event) {
            // Prevent click if we just started dragging
            if (isDragging.value) {
                event.preventDefault()
                event.stopPropagation()
                return
            }
            selected.value = artifact
        }

        return {
            store,
            selected,
            navigatePrevious,
            navigateNext,
            handleDragStart,
            handleArtifactClick,
        }
    }
}

export const ArtifactDownloads = {
    template:`
        <div class="z-40 fixed bottom-0 gap-x-6 w-full flex justify-center p-4 bg-black/20 select-none">
            <a :href="url + '?download=1'" @mouseover="showVariants=false" class="flex text-sm text-gray-300 hover:text-gray-100 hover:drop-shadow">
                <svg class="w-5 h-5 mr-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 20h12M12 4v12m0 0l3.5-3.5M12 16l-3.5-3.5"></path></svg>
                download
            </a>
            <div @mouseover="showVariants=true">
                <button type="button" class="flex text-sm text-gray-300 hover:text-gray-100 hover:drop-shadow" aria-expanded="true" aria-haspopup="true">
                  <span class="sr-only">Open Variants</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                    <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                  </svg>
                  <span>variants</span>
                </button>
                <div v-if="showVariants" class="font-normal absolute z-10 w-40 -ml-4 bottom-10 rounded-md bg-white dark:bg-black py-1 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                    <a :href="variant({width:512,height:512})" target="_blank" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" tabindex="-1">512 x 512</a>
                    <a :href="variant({width:256,height:256})" target="_blank" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" tabindex="-1">256 x 256</a>
                    <a :href="variant({width:128})" target="_blank" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" tabindex="-1">128w</a>
                    <a :href="variant({height:128})" target="_blank" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" tabindex="-1">128h</a>
                </div>
            </div>
            <div @mouseover="showVariants=false">
                <slot></slot>
            </div>
        </div>
    `,
    props: {
        url:String,
    },
    setup(props) {
        const showVariants = ref(false)
        function variant(args) {
            const variants = Object.keys(args).map(x => `${x}=${args[x]}`).join(',')
            return props.url.replace('/artifacts/',`/variants/${variants}/`)
        }
        return { showVariants, variant }
    }
}