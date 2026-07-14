import { ref, computed, inject, onMounted, onUnmounted, nextTick } from "vue"
import { ThreadComments, ThreadReactions } from "./components/Threads.mjs"

const LightboxImage = {
    template: `
    <div>
      <!-- Thumbnail -->
      <div class="cursor-zoom-in hover:opacity-90 transition-opacity" @click="isOpen = true">
        <img :src="src" :alt="alt" :width="width" :height="height" :class="imageClass" />
      </div>

      <!-- Lightbox Modal -->
      <Teleport to="body">
        <div v-if="isOpen"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          @click="isOpen = false"
          style="z-index: 9999;"
        >
          <button type="button"
            class="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            @click="isOpen = false"
            aria-label="Close lightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div class="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img :src="src" :alt="alt" :width="width" :height="height" class="max-w-full max-h-full w-auto h-auto object-contain rounded" @click.stop />
          </div>
        </div>
      </Teleport>
    </div>
    `,
    props: {
        src: { type: String, required: true },
        alt: { type: String, default: '' },
        width: { type: [Number, String], default: undefined },
        height: { type: [Number, String], default: undefined },
        imageClass: {
            type: String,
            default: 'max-w-[400px] max-h-96 rounded-lg border border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-900 shadow-sm transition-transform hover:scale-[1.02]'
        }
    },
    setup(props) {
        const isOpen = ref(false)
        return { isOpen }
    }
}

const UserAvatar = {
    template: `
        <img class="size-8 rounded-full shadow object-cover" :src="avatarUrl" />
    `,
    props: {
        isDark: Boolean
    },
    setup(props) {
        const ctx = inject('ctx')
        const avatarUrl = computed(() => ctx.state.userAvatar + '?theme=' + (props.isDark ? 'dark' : 'light'))
        return { avatarUrl }
    }
}

const AgentAvatar = {
    template: `
        <img class="size-8 rounded-full shadow object-cover" :src="avatarUrl" />
    `,
    props: {
        profile: String,
        isDark: Boolean
    },
    setup(props) {
        const ctx = inject('ctx')
        const avatarUrl = computed(() => {
            if (props.profile && props.profile !== 'default') {
                return '/ext/agents/' + props.profile + '/avatar'
            }
            return ctx.state.agentAvatar + '?theme=' + (props.isDark ? 'dark' : 'light')
        })
        return { avatarUrl }
    }
}

const MessageReasoning = {
    template: `
    <div class="mt-2 mb-2">
        <button type="button" @click="isOpen = !isOpen" class="text-xs flex items-center space-x-1" :class="[$styles.highlighted, $styles.linkHover]">
            <svg class="w-3 h-3 transition-transform duration-200" :class="isOpen ? 'transform rotate-90' : ''" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M7 5l6 5l-6 5z"/></svg>
            <span>{{ isOpen ? 'Hide reasoning' : 'Show reasoning' }}</span>
        </button>
        <div v-if="isOpen" class="reasoning mt-2 p-3 rounded-lg border text-sm bg-gray-50/50 dark:bg-gray-900/50" :class="[$styles.card]">
            <div v-if="typeof reasoning === 'string'" v-html="$fmt.markdown(reasoning)" class="prose prose-xs max-w-none dark:prose-invert"></div>
            <pre v-else class="text-xs whitespace-pre-wrap overflow-x-auto">{{ formatReasoning(reasoning) }}</pre>
        </div>
    </div>
    `,
    props: {
        reasoning: String,
    },
    setup(props) {
        const isOpen = ref(false)
        const formatReasoning = (r) => typeof r === 'string' ? r : JSON.stringify(r, null, 2)
        return { isOpen, formatReasoning }
    }
}

const ToolCall = {
    template: `
        <div v-if="collapsed" @click="collapsed = !collapsed" class="cursor-pointer rounded-lg overflow-hidden border" :class="[$styles.card]">
            <div class="px-3 py-2 flex items-center justify-between space-x-4">
                <div class="flex items-center gap-2">
                    <svg class="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    <span class="font-mono text-xs font-bold">{{ tool.function.name }}</span>
                    <span v-if="toolSummary" :title="toolSummary" class="font-mono text-xs truncate overflow-hidden xl:max-w-2xl lg:max-w-xl md:max-w-lg sm:max-w-sm max-w-xs text-gray-500">{{ toolSummary }}</span>
                </div>
                <span class="text-[10px] uppercase tracking-wider font-medium whitespace-nowrap" :class="[$styles.muted]">Tool Call</span>
            </div>
        </div>
        <div v-else class="rounded-lg border overflow-hidden" :class="[$styles.card]">
            <!-- Tool Call Header -->
            <div @click="collapsed = !collapsed" class="cursor-pointer px-3 py-2 flex items-center space-x-4 justify-between border-b" :class="[$styles.chromeBorder]">
                <div class="flex items-center gap-2">
                    <svg class="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    <span class="font-mono text-xs font-bold">{{ tool.function.name }}</span>
                </div>
                <span class="text-[10px] uppercase tracking-wider font-medium whitespace-nowrap">Tool Call</span>
            </div>
            
            <!-- Tool Arguments -->
            <div class="px-3 py-2 bg-gray-50/30 dark:bg-gray-900/30 border-b" :class="[$styles.chromeBorder]">
                <div class="text-[10px] font-semibold uppercase tracking-wider mb-1" :class="[$styles.muted]">Arguments</div>
                <pre class="text-xs font-mono p-2 rounded bg-gray-100 dark:bg-gray-800/80 overflow-x-auto whitespace-pre-wrap">{{ formatArgs(tool.function.arguments) }}</pre>
            </div>

            <!-- Tool Output -->
            <div v-if="toolOutput" class="px-3 py-2">
                <div class="text-[10px] font-semibold uppercase tracking-wider mb-1" :class="[$styles.muted]">Output</div>
                <pre class="text-xs font-mono p-2 rounded bg-gray-100 dark:bg-gray-800/80 overflow-x-auto whitespace-pre-wrap">{{ toolOutput.content }}</pre>
            </div>
        </div>
    `,
    props: {
        thread: { type: Object, required: true },
        tool: { type: Object, required: true }
    },
    setup(props) {
        const collapsed = ref(true)
        const toolOutput = computed(() => props.thread?.messages?.find(m => m.role === 'tool' && m.tool_call_id === props.tool.id))
        const toolArgs = computed(() => {
            try {
                return typeof props.tool.function.arguments === 'string'
                    ? JSON.parse(props.tool.function.arguments)
                    : props.tool.function.arguments
            } catch (e) {
                return {}
            }
        })
        const toolSummary = computed(() => {
            const toolName = props.tool.function.name
            const args = toolArgs.value
            const output = toolOutput.value
            if (toolName === 'run_bash' && args.command) {
                return args.command
            }
            if (toolName === 'skill' && args.name) {
                return args.name
            }
            if (args?.path) {
                return args.path
            }
            return ''
        })
        const formatArgs = (args) => {
            try {
                if (typeof args === 'string') {
                    return JSON.stringify(JSON.parse(args), null, 2)
                }
                return JSON.stringify(args, null, 2)
            } catch (e) {
                return args
            }
        }
        return { collapsed, toolOutput, toolSummary, formatArgs }
    }
}

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

const ThemeSelector = {
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


const App = {
    components: {
        LightboxImage,
        UserAvatar,
        AgentAvatar,
        MessageReasoning,
        ToolCall,
        ThemeSelector,
        ThemeButton,
        ThreadComments,
        ThreadReactions,
    },
    template: `
    <div class="min-h-screen transition-colors duration-300 bg-fixed" :class="$styles.app">
        <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8" :class="$styles.appInner">
            <!-- Error Screen -->
        <div v-if="error" class="mx-auto max-w-md mt-16 text-center">
            <div class="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl shadow-sm">
                <div class="size-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Failed to load thread</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ error.message || 'Unknown error' }}</p>
            </div>
        </div>

        <div v-else-if="!thread" class="mx-auto max-w-md mt-16 text-center">
            <div class="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl shadow-sm">
                <div class="size-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No thread info</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400">No chat thread data is currently available.</p>
            </div>
        </div>

        <!-- Thread Screen -->
        <div v-else class="mx-auto max-w-5xl">
            <!-- Header -->
            <div class="border-b pb-4 mb-6" :class="[$styles.chromeBorder]">
                <!-- Top row: Title (left) & Link + Theme Switcher (right) -->
                <div class="flex items-start justify-between gap-4">
                    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-slate-900 dark:!text-slate-100">
                        {{ title || 'Untitled Thread' }}
                    </h1>
                </div>

                <!-- Subtitle row: model pill (left) & date (right) -->
                <div class="text-xs mt-3 flex items-center justify-between gap-4" :class="[$styles.muted]">
                    <!-- Left: Model Pill -->
                    <div>
                        <span v-if="model" class="relative inline-block group/model-card align-middle">
                            <!-- Model badge + pricing -->
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-help shadow-sm border transition-all"
                                  :class="[$styles.dropdownButton, $styles.chromeBorder]">
                                <ProviderIcon :provider="thread.provider" class="size-3" />
                                <span class="font-medium whitespace-nowrap">{{ model }}</span>
                                <span v-if="modelCost" class="opacity-80 border-l pl-1.5" :class="[$styles.chromeBorder]" v-html="modelCost"></span>
                            </span>

                            <!-- Hover popover card -->
                            <div class="absolute left-0 mt-2 w-80 p-4 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none opacity-0 translate-y-1 invisible group-hover/model-card:opacity-100 group-hover/model-card:translate-y-0 group-hover/model-card:visible transition-all duration-200 ease-out z-[90] text-sm text-left border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-default">
                                
                                <!-- Header -->
                                <div class="mb-2.5">
                                    <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ modelInfo?.name || model }}</h4>
                                    <p v-if="modelInfo?.provider" class="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Provider: {{ modelInfo.provider }}
                                    </p>
                                </div>

                                <!-- Description -->
                                <p v-if="modelInfo?.description" class="text-xs text-slate-600 dark:text-slate-300 mb-3.5 line-clamp-3 leading-relaxed">
                                    {{ modelInfo.description }}
                                </p>

                                <!-- Pricing/Cost -->
                                <div v-if="modelInfo?.cost" class="grid grid-cols-2 gap-2 mb-3.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                    <div>
                                        <div class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Input Price</div>
                                        <div class="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">&#36;{{ formatCostLong(modelInfo.cost.input) }}/M tk</div>
                                    </div>
                                    <div>
                                        <div class="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Output Price</div>
                                        <div class="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">&#36;{{ formatCostLong(modelInfo.cost.output) }}/M tk</div>
                                    </div>
                                </div>

                                <!-- Details grid -->
                                <div class="space-y-1.5 text-xs">
                                    <div v-if="modelInfo?.family" class="flex justify-between">
                                        <span class="text-slate-500 dark:text-slate-400">Family:</span>
                                        <span class="font-medium text-slate-800 dark:text-slate-200">{{ modelInfo.family }}</span>
                                    </div>
                                    <div v-if="modelInfo?.release_date" class="flex justify-between">
                                        <span class="text-slate-500 dark:text-slate-400">Released:</span>
                                        <span class="font-medium text-slate-800 dark:text-slate-200">{{ formatDateOnly(modelInfo.release_date) }}</span>
                                    </div>
                                    <div v-if="modelInfo?.limit?.context" class="flex justify-between">
                                        <span class="text-slate-500 dark:text-slate-400">Context Limit:</span>
                                        <span class="font-mono font-medium text-slate-800 dark:text-slate-200">{{ formatNumber(modelInfo.limit.context) }} tk</span>
                                    </div>
                                </div>

                                <!-- Modalities & Features tags -->
                                <div class="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                                    <!-- Modalities -->
                                    <span v-for="mod in getModalities" :key="mod" 
                                          class="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider font-mono bg-blue-50 text-blue-700 border border-blue-100/50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-transparent">
                                        {{ mod }}
                                    </span>
                                    <!-- Features -->
                                    <span v-if="modelInfo?.tool_call" 
                                          class="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-transparent">
                                        Tools
                                    </span>
                                    <span v-if="modelInfo?.reasoning" 
                                          class="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-transparent">
                                        Reasoning
                                    </span>
                                </div>
                            </div>
                        </span>
                    </div>

                    <!-- Right: Date & Theme Selector -->
                    <div class="flex items-center gap-2 select-none">
                        <span v-if="startedAt" :title="dateTooltip" class="cursor-help font-medium">
                            {{ formatDate(startedAt) }}
                        </span>
                        <ThemeSelector />
                    </div>
                </div>
            </div>

            <!-- Messages Area -->
            <div class="space-y-4">
                <div v-for="message in currentThreadMessages" :key="message.timestamp"
                     v-show="message.role !== 'tool' && (message.content || message.tool_calls?.length || message.images?.length || message.audios?.length)"
                     class="flex items-start space-x-3 group"
                     :class="message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''"
                >
                    <!-- Avatar -->
                    <div class="flex-shrink-0 flex flex-col justify-center">
                        <UserAvatar v-if="message.role === 'user'" :isDark="isDark" />
                        <AgentAvatar v-else :profile="thread?.metadata?.profile" :isDark="isDark" />
                    </div>

                    <!-- Message Bubble -->
                    <div v-if="message.role === 'assistant' && !message.content?.trim() && message.tool_calls?.length && !message.images?.length && !message.audios?.length" class="flex-1 max-w-[85%] space-y-4">
                        <ToolCall v-for="(tool, i) in message.tool_calls" :key="i" :thread="thread" :tool="tool" />
                    </div>
                    <div v-else class="message rounded-2xl px-4 py-3 relative group max-w-[85%] shadow-sm hover:shadow transition-shadow duration-200"
                         :class="message.role === 'user' ? $styles.messageUser : $styles.messageAssistant"
                    >
                        <!-- Copy Button -->
                        <button v-if="message.content"
                                type="button"
                                @click="copyMessageContent(message)"
                                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none"
                                :class="[$styles.mutedIcon]"
                                title="Copy message content"
                        >
                            <svg v-if="copying === message.timestamp" class="size-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <svg v-else class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                        </button>

                        <!-- Content rendering -->
                        <div v-if="message.role === 'assistant'"
                             v-html="$fmt.markdown(message.content)"
                             class="prose prose-sm max-w-none dark:prose-invert"
                        ></div>
                        <div v-else-if="message.role === 'user'"
                             v-html="$fmt.content(message.content)"
                             class="prose prose-sm max-w-none dark:prose-invert break-words"
                        ></div>

                        <!-- Collapsible Reasoning -->
                        <MessageReasoning v-if="message.role === 'assistant' && (message.reasoning || message.thinking || message.reasoning_content)" 
                                          :reasoning="message.reasoning || message.thinking || message.reasoning_content" />

                        <!-- Tool Calls -->
                        <div v-if="message.tool_calls && message.tool_calls.length > 0" class="mt-3 space-y-4">
                            <ToolCall v-for="(tool, i) in message.tool_calls" :key="i" :thread="thread" :tool="tool" />
                        </div>

                        <!-- User Attachments -->
                        <div v-if="getAttachments(message).length > 0" class="mt-3 flex flex-wrap gap-2">
                            <div v-for="(attachment, i) in getAttachments(message)" :key="i">
                                <div v-if="attachment.type === 'image_url'">
                                    <LightboxImage :src="resolveUrl(attachment.image_url.url)" />
                                </div>
                                <div v-else-if="attachment.type === 'input_audio'">
                                    <div class="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <svg class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                                        <audio controls :src="resolveUrl(attachment.input_audio.data)" class="h-8 w-64"></audio>
                                    </div>
                                </div>
                                <div v-else-if="attachment.type === 'file'">
                                    <a :href="resolveUrl(attachment.file.file_data)" target="_blank"
                                       class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <span class="max-w-xs truncate">{{ attachment.file.filename || 'Attachment' }}</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Assistant attachments (images/audios) -->
                        <div v-if="message.images && message.images.length > 0" class="mt-2 flex flex-wrap gap-2">
                            <div v-for="(img, i) in message.images" :key="i">
                                <LightboxImage v-if="img.type === 'image_url'" :src="resolveUrl(img.image_url.url)" />
                            </div>
                        </div>
                        <div v-if="message.audios && message.audios.length > 0" class="mt-2 flex flex-wrap gap-2">
                            <div v-for="(audio, i) in message.audios" :key="i">
                                <div v-if="audio.type === 'audio_url' || audio.type === 'input_audio'"
                                     class="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                    <svg class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                                    <audio controls :src="resolveUrl(audio.type === 'input_audio' ? audio.input_audio.data : audio.audio_url.url)" class="h-8 w-64"></audio>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="my-2 w-72 mx-auto">
                    <ThreadReactions />
                </div>
            </div>

            <!-- Stats -->
            <div v-if="stats && stats.outputTokens" class="text-center text-xs mt-8 pb-4" :class="[$styles.muted]">
                <span :title="statsTitle">
                    <span v-if="stats.cost">
                        &#36;{{ formatCost(stats.cost) }} for 
                    </span>
                    {{ stats.inputTokens.toLocaleString() }} &rarr; {{ stats.outputTokens.toLocaleString() }} tokens over 
                    {{ stats.requests }} request{{ stats.requests === 1 ? '' : 's' }} in 
                    {{ (stats.duration).toFixed(2) }}s
                    <span v-if="stats.outputTokens > 0 && stats.duration > 0">
                        ({{ Math.round(stats.outputTokens / stats.duration) }} tk/s)
                    </span>
                </span>
            </div>

            <ThreadComments class="mt-8" />

        </div>
    </div>
    </div>
    `,
    setup(props) {
        const ctx = inject('ctx')
        const thread = inject('currentThread', null)
        const error = inject('error', null)

        const id = thread?.id
        const title = thread?.title
        const startedAt = thread?.startedAt
        const model = thread?.model
        const stats = thread?.stats
        const modelInfo = thread?.modelInfo



        const formatCostShort = (val) => {
            if (val == null) return ''
            const num = parseFloat(val)
            if (num === 0) return '0'
            if (Number.isInteger(num)) return num.toString()
            return num.toFixed(4).replace(/\.?0+$/, '')
        }

        const modelCost = computed(() => {
            const cost = modelInfo?.cost
            if (!cost) return null
            if (parseFloat(cost.input) === 0 && parseFloat(cost.output) === 0) {
                return 'Free'
            }
            return '$' + formatCostShort(cost.input) + ' &rarr; $' + formatCostShort(cost.output) + ' M'
        })

        const getModalities = computed(() => {
            if (!modelInfo?.modalities) return []
            const inputs = modelInfo.modalities.input || []
            const outputs = modelInfo.modalities.output || []
            const all = new Set([...inputs, ...outputs])
            return Array.from(all)
        })

        const formatDateOnly = (val) => {
            if (!val) return ''
            const date = new Date(val)
            if (isNaN(date.getTime())) return val
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        }

        const formatNumber = (num) => {
            return num?.toLocaleString() || '0'
        }

        const formatCostLong = (val) => {
            if (val == null) return ''
            const num = parseFloat(val)
            if (num === 0) return '0'
            return num.toFixed(6).replace(/\.?0+$/, '')
        }

        const isDark = computed(() => ctx.state.theme.vars.colorScheme === 'dark')

        const copying = ref(null)
        const copyMessageContent = async (message) => {
            let content = ''
            if (Array.isArray(message.content)) {
                content = message.content.map(part => {
                    if (part.type === 'text') return part.text
                    if (part.type === 'image_url') {
                        const name = part.image_url.url.split('/').pop() || 'image'
                        return '\n![' + name + '](' + part.image_url.url + ')\n'
                    }
                    if (part.type === 'input_audio') {
                        const name = part.input_audio.data.split('/').pop() || 'audio'
                        return '\n[' + name + '](' + part.input_audio.data + ')\n'
                    }
                    if (part.type === 'file') {
                        const name = part.file.filename || part.file.file_data.split('/').pop() || 'file'
                        return '\n[' + name + '](' + part.file.file_data + ')'
                    }
                    return ''
                }).join('\n')
            } else {
                content = message.content
            }

            try {
                copying.value = message.timestamp
                await navigator.clipboard.writeText(content)
            } catch (err) {
                console.error('Failed to copy message content:', err)
                const textArea = document.createElement('textarea')
                textArea.value = content
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
            }
            setTimeout(() => { copying.value = null }, 2000)
        }

        const getAttachments = (message) => {
            if (!Array.isArray(message.content)) return []
            return message.content.filter(c => c.type === 'image_url' || c.type === 'input_audio' || c.type === 'file')
        }

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

        const formatDate = (val) => {
            if (!val) return ''
            const date = new Date(val)
            return date.toLocaleString()
        }

        const dateTooltip = computed(() => {
            const lines = []
            if (startedAt) lines.push('Started: ' + formatDate(startedAt))
            if (thread?.publishedAt) lines.push('Published: ' + formatDate(thread.publishedAt))
            if (thread?.createdAt && thread.createdAt !== startedAt) lines.push('Created: ' + formatDate(thread.createdAt))
            return lines.join('\n')
        })

        const formatCost = (cost) => {
            if (!cost) return '0.00'
            const num = parseFloat(cost)
            return num.toFixed(6).replace(/\.?0+$/, '')
        }

        const statsTitle = computed(() => {
            if (!stats) return ''
            const lines = []
            if (stats.cost) lines.push('Total Cost: $' + parseFloat(stats.cost).toFixed(6))
            if (stats.inputTokens) lines.push('Input Tokens: ' + stats.inputTokens.toLocaleString())
            if (stats.outputTokens) lines.push('Output Tokens: ' + stats.outputTokens.toLocaleString())
            if (stats.requests) lines.push('Requests: ' + stats.requests)
            if (stats.duration) lines.push('Duration: ' + (stats.duration).toFixed(2) + 's')
            return lines.join('\n')
        })

        const currentThreadMessages = computed(() => {
            const ignoreUserMessages = ['proceed', 'retry']
            return thread?.messages?.filter(x => x.role !== 'system' && !(x.role === 'user' && Array.isArray(x.content) && ignoreUserMessages.includes(x.content[0]?.text))) || []
        })

        const addCopyButtons = () => {
            document.querySelectorAll('.prose pre>code').forEach(code => {
                let pre = code.parentElement
                if (pre.classList.contains('group')) return
                pre.classList.add('relative', 'group')

                const div = document.createElement('div')
                div.className = 'opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex absolute right-2 top-2 select-none z-10'

                const label = document.createElement('div')
                label.className = 'hidden font-sans p-1 px-2 mr-1 rounded bg-gray-800 text-gray-300 text-xs border border-gray-700'

                const btn = document.createElement('button')
                btn.type = 'button'
                btn.className = 'p-1 rounded border block text-gray-400 hover:text-gray-200 border-gray-700 bg-gray-900/60 hover:bg-gray-800/80 transition-colors'
                btn.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'

                btn.onclick = () => {
                    label.classList.remove('hidden')
                    label.innerHTML = 'copied'
                    btn.classList.add('border-gray-600', 'bg-gray-700')
                    btn.classList.remove('border-gray-700')
                    btn.innerHTML = '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'

                    navigator.clipboard.writeText(code.innerText)
                    setTimeout(() => {
                        label.classList.add('hidden')
                        label.innerHTML = ''
                        btn.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'
                        btn.classList.remove('border-gray-600', 'bg-gray-700')
                        btn.classList.add('border-gray-700')
                    }, 2000)
                }

                div.appendChild(label)
                div.appendChild(btn)
                pre.insertBefore(div, code)
            })
        }

        onMounted(() => {
            nextTick(() => {
                addCopyButtons()
            })
        })

        return {
            thread,
            error,
            id,
            title,
            startedAt,
            model,
            stats,
            modelInfo,
            modelCost,
            getModalities,
            formatDateOnly,
            formatNumber,
            formatCostLong,
            dateTooltip,
            isDark,
            copying,
            copyMessageContent,
            getAttachments,
            resolveUrl,
            formatDate,
            formatCost,
            statsTitle,
            currentThreadMessages
        }
    }
}

export default App