import { ref, computed } from "vue"
import FileUpload from "./FileUpload.mjs"
import { 
    WorkflowGroups, toJsonObject, toJsonArray, acceptedImages, acceptedVideos, acceptedAudios, 
    getNextSeedValue, 
} from "../lib/utils.mjs"

export default {
    components: {
        FileUpload,
    },
    template:`
<!-- Top controls: Workflow selection, text prompt, and run button -->
<div class="relative w-full mb-8">
    <div v-if="$route.query.change !== undefined || !selectedWorkflow">
        Select a Workflow
        
        <div class="mt-4" v-for="group of WorkflowGroups">
            <h4 class="w-full pl-2 text-gray-500 dark:text-gray-400 uppercase pt-2 text-sm leading-6 font-semibold">
                {{group.name}}
            </h4>
            <div v-for="category of group.categories">
                <RouterLink :to="{ query: { category, change:$route.query.change } }" 
                    :class="($route.query.category || 'Text to Image') == category ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'"
                    class="pl-4 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-900 group flex gap-x-3 rounded-md p-2 text-sm leading-6 justify-between font-semibold"
                    >
                    {{category}}
                </RouterLink>
            </div>
        </div>
    </div>
    <form ref="refForm" @submit.prevent="runWorkflow" v-else>
        <!-- Text prompt input -->
        <div class="w-full md:flex-grow">
            <textarea
                type="text" spellcheck="false"
                v-model="workflowArgs.positivePrompt"
                :placeholder="hasInput('positivePrompt') ? 'Enter your prompt...' : 'Description for this generation...'"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                :class="hasInput('positivePrompt') ? 'h-48' : 'h-24'"
                :disabled="!selectedWorkflow"
                @keydown.ctrl.enter.prevent="runWorkflow"
            />
            <div class="-mt-3 mr-2 float-right">
                <button type="button" class="text-sm" @click="resetPositivePrompt" title="Reset Positive Prompt">reset</button>
            </div>
            <div v-if="selectedWorkflow?.info">
                <!-- Controls Row -->
                <div class="mt-2 w-full flex flex-col lg:flex-row justify-center gap-2">
                    <!-- Aspect Ratio Controls -->
                    <div v-if="hasInput('width','height')" class="inline-flex items-center lg:rounded-md lg:shadow-sm" role="group" aria-label="Aspect ratio selection">
                        <!-- Square aspect ratio -->
                        <button type="button"
                            @click="setArgs({ width:1024, height:1024 })"
                            :class="['px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-l-lg',
                                Number(workflowArgs.width) === Number(workflowArgs.height)
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            ]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            </svg>
                            <span class="text-xs mt-1 block">Square</span>
                        </button>
                        <!-- Landscape aspect ratio -->
                        <button type="button"
                            @click="setArgs({ width:1344, height:768 })"
                            :class="['px-4 py-2 text-sm font-medium border-t border-b border-gray-200 dark:border-gray-700',
                                Number(workflowArgs.width) > Number(workflowArgs.height)
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            ]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                            </svg>
                            <span class="text-xs mt-1 block">Landscape</span>
                        </button>
                        <!-- Portrait aspect ratio -->
                        <button
                            type="button"
                            @click="setArgs({ height:1344, width:768 })"
                            :class="[
                                'px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-r-lg',
                                Number(workflowArgs.width) < Number(workflowArgs.height)
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            ]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                            </svg>
                            <span class="text-xs mt-1 block">Portrait</span>
                        </button>
                    </div>
                    <div v-if="hasInput('width','height')" class="px-4 py-1 text-sm font-medium flex items-center">
                        <div class="text-center">
                            <div class="text-xs">
                                <input type="text" v-model="workflowArgs.width" class="w-8 p-0 m-0 text-xs text-center border-none">
                            </div>
                            <div class="text-xs px-0.5 text-gray-500">x</div>
                            <div class="text-xs">
                                <input type="text" v-model="workflowArgs.height" class="w-8 p-0 m-0 text-xs text-center border-none">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-2 flex flex-col lg:flex-row justify-center gap-2">

                    <!-- Denoise/Creativity Slider -->
                    <div v-if="hasInput('denoise')" class="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
                        <label for="denoise" class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-help"
                            title="The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling.">
                            Denoise
                        </label>
                        <input
                            id="denoise"
                            type="range"
                            v-model="workflowArgs.denoise"
                            min="0"
                            max="1"
                            step="0.01"
                            class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        >
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 w-2 text-right">{{ workflowArgs.denoise }}</span>
                    </div>

                    <!-- CFG Input with Up/Down Controls -->
                    <div v-if="hasInput('cfg')" class="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
                        <label for="cfg-control" class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-help"
                            title="The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality.">
                            CFG
                        </label>
                        <div class="flex items-center">
                            <button type="button" @click="workflowArgs.cfg = Math.max(0, parseFloat((workflowArgs.cfg - 0.1).toFixed(1)))"
                                    class="py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                            <input type="text" v-model="workflowArgs.cfg" class="w-8 p-0 text-sm text-center border-none">
                            <button type="button" @click="workflowArgs.cfg = Math.min(100, parseFloat((workflowArgs.cfg + 0.1).toFixed(1)))"
                                    class="py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div v-if="hasInput('image')">
                    <div v-if="workflowArgs.image || $route.query.image" 
                         class="flex justify-center border-gray-300 dark:border-gray-600 border-dashed relative flex flex-col items-center justify-center w-full h-64 border-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <CloseButton @click="$router.push({ query: {} }); delete workflowArgs.image" />
                      <img :src="'/artifacts/' + (workflowArgs.image || $route.query.image)" alt=""
                           class="size-28 aspect-square object-cover rounded-lg">
                      <input type="hidden" :value="workflowArgs.image || $route.query.image">
                    </div>
                    <FileUpload v-else ref="refImage" id="image" required
                        accept=".webp,.jpg,.jpeg,.png,.gif" :acceptLabel="acceptedImages" @change="renderKey++">
                        <template #title>
                            <span class="font-semibold text-green-600">Click to upload</span> or drag and drop
                        </template>
                        <template #icon>
                            <svg class="mb-2 h-12 w-12 text-green-500 inline" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true" data-phx-id="m9-phx-F_34be7KYfTF66Xh">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </template>
                    </FileUpload>
                </div>
                <div v-if="hasInput('audio')" class="mt-4">
                    <FileUpload ref="refAudio" id="audio" v-model="workflowArgs.audio" required
                        accept=".mp3,.m4a,.aac,.flac,.wav,.wma" :acceptLabel="acceptedAudios" @change="renderKey++">
                        <template #title>
                            <span class="font-semibold text-green-600">Click to upload</span> or drag and drop
                        </template>
                        <template #icon>
                            <svg class="mb-2 h-12 w-12 text-green-500 inline" viewBox="0 0 24 24">
                                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M22 12c-.237 5.082-4.622 9.133-9.995 9.133q-.976.001-1.936-.178c-.459-.087-.689-.13-.849-.105c-.16.024-.387.145-.842.386a6.5 6.5 0 0 1-4.226.657a5.3 5.3 0 0 0 1.087-2.348c.1-.53-.147-1.045-.519-1.422C3.034 16.411 2 14.105 2 11.567C2 6.284 6.48 2 12.005 2q.762 0 1.495.106M16 4.5c.491-.506 1.8-2.5 2.5-2.5M21 4.5c-.491-.506-1.8-2.5-2.5-2.5m0 0v8m-6.504 2h.008m3.987 0H16m-8 0h.009" color="currentColor"/>
                            </svg>
                        </template>
                    </FileUpload>
                </div>
                <div v-if="hasInput('video')" class="mt-4">
                    <FileUpload ref="refVideo" id="video" v-model="workflowArgs.video" required
                        accept=".mp4,.mov,.webm,.mkv,.avi,.wmv,.ogg" :acceptLabel="acceptedVideos" @change="renderKey++">
                        <template #title>
                            <span class="font-semibold text-green-600">Click to upload</span> or drag and drop
                        </template>
                        <template #icon>
                            <svg class="mb-2 h-12 w-12 text-green-500 inline" viewBox="0 0 24 24">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1">
                                    <path stroke-miterlimit="10" d="M9.047 9.5v5"/>
                                    <path stroke-linejoin="round" d="M11.34 11.605L9.373 9.638a.46.46 0 0 0-.651 0l-1.968 1.967"/>
                                    <path stroke-linejoin="round" d="M12 5.32H6.095A3.595 3.595 0 0 0 2.5 8.923v6.162a3.595 3.595 0 0 0 3.595 3.595H12a3.595 3.595 0 0 0 3.595-3.595V8.924A3.594 3.594 0 0 0 12 5.32m9.5 4.118v5.135c0 .25-.071.496-.205.708a1.36 1.36 0 0 1-.555.493a1.27 1.27 0 0 1-.73.124a1.37 1.37 0 0 1-.677-.278l-3.225-2.588a1.38 1.38 0 0 1-.503-1.047c0-.2.045-.396.133-.575c.092-.168.218-.315.37-.432l3.225-2.567a1.36 1.36 0 0 1 .678-.278c.25-.032.504.011.729.124a1.33 1.33 0 0 1 .76 1.181"/>
                                </g>
                            </svg>
                        </template>
                    </FileUpload>
                </div>

                <!-- Advanced Controls Toggle -->
                <div v-if="advancedInputs.length" class="mt-4">
                    <button v-if="hasInput('positivePrompt')"  @click="setPrefs({ showAdvanced: !prefs.showAdvanced })" type="button"
                        class="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path v-if="prefs.showAdvanced" fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                            <path v-else fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                        </svg>
                        {{ prefs.showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options' }}
                    </button>

                    <!-- Advanced Inputs -->
                    <div v-show="prefs.showAdvanced || !hasInput('positivePrompt')" class="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="input in advancedInputs" class="flex flex-col space-y-1" :class="input.type === 'String' && input.multiline ? 'col-span-2 row-span-2' : ''">
                                <label :for="input.name" class="text-sm font-medium text-gray-700 dark:text-gray-300" :class="input.tooltip ? 'cursor-help' : ''" :title="input.tooltip">{{input.label}}</label>
                                <div v-if="input.name.endsWith('seed')" class="flex items-center gap-1">
                                  <input v-model="workflowArgs[input.name]"
                                         :id="input.name"
                                         :placeholder="input.placeholder || ''"
                                         spellcheck="false"
                                         type="text"
                                         class="w-32 px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                  <button type="button" @click="workflowArgs[input.name] = getNextSeedValue(selectedWorkflow)"
                                    title="Generate new Random Seed">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" viewBox="0 0 24 24"><path fill="currentColor" d="m13.146 11.05l-.174-1.992l2.374-.208a5 5 0 1 0 .82 6.173l2.002.5a7 7 0 1 1-1.315-7.996l-.245-2.803L18.6 4.55l.523 5.977z"/></svg>
                                  </button>
                                </div>
                                <textarea v-else-if="input.type === 'String' && input.multiline" spellcheck="false"
                                    :id="input.name" :name="input.name" rows="5" :placeholder="input.placeholder || ''"
                                    v-model="workflowArgs[input.name]"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    @keydown.ctrl.enter.prevent="runWorkflow"></textarea>
                                <input v-else-if="input.type === 'String'" spellcheck="false"
                                    v-model="workflowArgs[input.name]"
                                    :id="input.name"
                                    type="text"
                                    :placeholder="input.placeholder || ''"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <input v-else-if="input.type === 'Int' || input.type === 'Float'"
                                    v-model="workflowArgs[input.name]"
                                    :id="input.name"
                                    type="number"
                                    :step="input.step ?? 1"
                                    :min="input.min ?? 0"
                                    :max="input.name === 'batch_size' ? 8 : input.max ?? Number.MAX_SAFE_INTEGER"
                                    :placeholder="input.placeholder || ''"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    @keydown.enter.prevent="runWorkflow">
                                <select v-else-if="input.type === 'Enum'"
                                    v-model="workflowArgs[input.name]"
                                    :id="input.name"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    <option v-for="value in input.enumValues" :value="value">{{ value }}</option>
                                </select>
                                <div v-else class="text-sm text-red-500">Unknown {{input.name}} {{input.classType}}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <slot name="bottom"></slot>
    </form>
</div>
    `,
    props: {
        selectedWorkflow: Object,
        workflowArgs: Object,
    },
    emits:['run'],
    setup(props, { emit, expose }) {
        
        const renderKey = ref(0)
        const refForm = ref()
        const refImage = ref()
        const refAudio = ref()
        const refVideo = ref()
        const prefs = ref(toJsonObject(localStorage.getItem('comfy:prefs')) ?? {
            showAdvanced: true, // Toggle for showing/hiding advanced controls
            width: 1024,
            height: 1024,
        })

        expose({ refForm })

        const advancedInputs = computed(() => {
            return props.selectedWorkflow?.info?.inputs?.filter(x =>
                !['positivePrompt','width','height','denoise','cfg','image','audio','video'].includes(x.name)) ?? []
        })

        function hasInput(...inputs) {
            if (!props.selectedWorkflow?.info?.inputs?.length) {
                return false
            }
            for (const input of inputs) {
                if (!props.selectedWorkflow.info.inputs.find(x => x.name === input)) {
                    return false
                }
            }
            return true
        }

        function runWorkflow(e) {
            if (props.selectedWorkflow && props.workflowArgs.positivePrompt) {
                emit('run', props.selectedWorkflow)
            }
        }
        
        function setArgs(newArgs) {
            Object.assign(props.workflowArgs, newArgs)
        }
        function setPrefs(newPrefs) {
            Object.assign(prefs.value, newPrefs)
            localStorage.setItem('comfy:prefs', JSON.stringify(prefs.value,undefined,2))
        }
        
        function resetPositivePrompt() {
            if (!props.selectedWorkflow.info) return
            props.workflowArgs.positivePrompt = props.selectedWorkflow.info.inputs.find(x => x.name === 'positivePrompt')?.default ?? ''
            props.workflowArgs.negativePrompt = props.selectedWorkflow.info.inputs.find(x => x.name === 'negativePrompt')?.default ?? ''
            props.workflowArgs.width = props.selectedWorkflow.info.inputs.find(x => x.name === 'width')?.default ?? 1024
            props.workflowArgs.height = props.selectedWorkflow.info.inputs.find(x => x.name === 'height')?.default ?? 1024
            props.workflowArgs.batch_size = props.selectedWorkflow.info.inputs.find(x => x.name === 'batch_size')?.default ?? 1
            const denoise = props.selectedWorkflow.info.inputs.find(x => x.name === 'denoise')?.default
            if (denoise !== undefined) {
                props.workflowArgs.denoise = denoise
            }
            const cfg = props.selectedWorkflow.info.inputs.find(x => x.name === 'cfg')?.default
            if (cfg !== undefined) {
                props.workflowArgs.cfg = cfg
            }
            const steps = props.selectedWorkflow.info.inputs.find(x => x.name === 'steps')?.default
            if (steps !== undefined) {
                props.workflowArgs.steps = steps
            }
            const sampler_name = props.selectedWorkflow.info.inputs.find(x => x.name === 'sampler_name')?.default
            if (sampler_name !== undefined) {
                props.workflowArgs.sampler_name = sampler_name
            }
            const scheduler = props.selectedWorkflow.info.inputs.find(x => x.name === 'scheduler')?.default
            if (scheduler !== undefined) {
                props.workflowArgs.scheduler = scheduler
            }
            // const seed = props.selectedWorkflow.info.inputs.find(x => x.name === 'seed')?.default
            // if (seed !== undefined) {
            //     props.workflowArgs.seed = seed
            // }
            // console.log(JSON.stringify(props.selectedWorkflow.info))
        }

        return {
            renderKey,
            prefs,
            refForm,
            refImage,
            refAudio,
            refVideo,
            hasInput,
            acceptedImages, 
            acceptedVideos, 
            acceptedAudios,
            advancedInputs,
            runWorkflow,
            setArgs,
            setPrefs,
            resetPositivePrompt,
            getNextSeedValue,
            WorkflowGroups,
        }
    }
}
