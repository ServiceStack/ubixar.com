import { ref, computed, onMounted, watch } from "vue"
import { WorkflowGroups } from "../lib/utils.mjs"

const majorGroups = WorkflowGroups

const replaceWords = {
    'sdxl': 'SDXL',
    'sdxl-lightning': 'SDXL Lightning',
    'sdxl-turbo': 'SDXL Turbo',
    'sd-1.5': 'SD 1.5',
    'sd-3.5': 'SD 3.5',
    'sd-3.5-large': 'SD 3.5 Large',
    'sdxl-base': 'SDXL Base',
    'hidream': 'HiDream',
    'hidream-i1': 'HiDream-I1',
    'fp8': 'FP8',
    'turbo': 'Turbo',
    'v1': 'V1',
    'v2': 'V2',
    'v3': 'V3',
    'v4': 'V4',
    'v5': 'V5',
    'v6': 'V6',
    'v7': 'V7',
    'v8': 'V8',
    'v9': 'V9',
    'to': 'to',
    'with': 'with',
}


// Replace word with its replacement if it exists
export function formatWord(word) {
    return replaceWords[word] ||
        word.charAt(0).toUpperCase() + word.slice(1)
}

// Format category name for display
export function formatName(name) {
    return name.split('_').map(formatWord).join(' ')
}

// Format group name for display
export function formatGroupName(group) {
    return group === 'default' ? 'General' : formatName(group)
}

export function toWorkflow(path) {
    const parts = path.split('/')
    const category = parts[0] // e.g., text_to_image
    const group = parts.length > 2 ? parts[1] : 'default' // e.g., sd-1.5
    const filename = parts[parts.length - 1]
    const name = filename.replace('.json', '').split('_').map(formatWord).join(' ')
    return {
        path,
        category,
        group,
        name,
        filename
    }
}

export default {
    template: `
    <div class="px-4">
        <!-- Workflow picker UI -->
        <div class="flex flex-col items-center">
            <!-- Workflow selection area with transition -->
            <div v-show="show" class="w-full overflow-hidden"
                 style="opacity: 1; transform: translateY(0);"
                 :style="show ? {} : {maxHeight: '0px', opacity: '0', transform: 'translateY(-20px)'}">
                <!-- Tabs for major groups -->
                <div class="mb-8">
                    <div class="flex justify-center">
                        <div class="inline-flex space-x-4" role="group" aria-label="Major groups">
                            <button v-for="group in majorGroups" :key="group.name" type="button"
                                @click="activeMajorGroup = group.name"
                                :class="['select-none flex flex-col items-center px-8 py-4 rounded-lg shadow',
                                    activeMajorGroup === group.name
                                        ? 'bg-indigo-600 dark:bg-indigo-300 text-white dark:text-black shadow-lg transform scale-105'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-300 border border-gray-200 dark:border-gray-700']">
                                <!-- Placeholder SVG icons for each group -->
                                <div class="mb-2">
                                    <svg v-if="group.name === 'Image'" class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
                                        <path fill="currentColor" d="M14 3.5c5.799 0 10.5 4.701 10.5 10.5c0 2.645-.978 5.06-2.591 6.907l-6.513-6.35a2 2 0 0 0-2.792 0l-6.513 6.35A10.46 10.46 0 0 1 3.5 14C3.5 8.201 8.201 3.5 14 3.5m8.576 18.893A11.96 11.96 0 0 0 26 14c0-6.627-5.373-12-12-12S2 7.373 2 14c0 3.267 1.306 6.23 3.423 8.393a.8.8 0 0 0 .233.23A11.96 11.96 0 0 0 14 26a11.96 11.96 0 0 0 8.345-3.376a.75.75 0 0 0 .231-.23m-1.732-.43A10.46 10.46 0 0 1 14 24.5c-2.614 0-5.006-.956-6.844-2.536l6.495-6.333a.5.5 0 0 1 .698 0zM18 11a1 1 0 1 1 0-2a1 1 0 0 1 0 2m0 1.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5"/>
                                    </svg>
                                    <svg v-else-if="group.name === 'Audio'" class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
                                        <path fill="currentColor" d="M27.45 49.504c1.593 0 2.741-1.172 2.741-2.742V9.379c0-1.57-1.148-2.883-2.789-2.883c-1.148 0-1.898.563-3.164 1.688l-11.015 9.773c-.141.14-.352.211-.586.211H5.676c-3.328 0-4.969 1.664-4.969 5.203V32.7c0 3.54 1.64 5.203 4.969 5.203h6.96c.235 0 .446.07.587.211l11.015 9.868c1.149 1.03 2.063 1.523 3.211 1.523m20.25-4.781c.913.609 2.038.375 2.695-.563c3.093-4.312 4.898-10.054 4.898-16.054c0-6.024-1.781-11.766-4.898-16.079c-.68-.914-1.782-1.148-2.696-.539c-.89.61-1.031 1.758-.328 2.766c2.555 3.75 4.149 8.672 4.149 13.852s-1.547 10.148-4.149 13.851c-.68 1.008-.562 2.156.328 2.766m-21.61-.164c-.117 0-.258-.07-.399-.211L15.31 34.996c-.563-.516-1.032-.633-1.664-.633H5.84c-.914 0-1.36-.422-1.36-1.36v-9.937c0-.914.446-1.359 1.36-1.359h7.805c.632 0 1.078-.094 1.664-.633l10.382-9.422c.118-.093.258-.187.399-.187c.21 0 .328.14.328.328v32.414c0 .211-.117.352-.328.352m12.258-6.164c.797.562 1.945.374 2.625-.54c1.828-2.46 2.93-6.07 2.93-9.75s-1.125-7.265-2.93-9.773c-.68-.914-1.805-1.102-2.625-.54c-1.032.68-1.149 1.876-.399 2.907c1.36 1.828 2.18 4.617 2.18 7.406c0 2.79-.867 5.579-2.203 7.43c-.703 1.008-.586 2.156.422 2.86"/>
                                    </svg>
                                    <svg v-else-if="group.name === 'Video'" class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                                        <path fill="currentColor" d="m164.44 121.34l-48-32A8 8 0 0 0 104 96v64a8 8 0 0 0 12.44 6.66l48-32a8 8 0 0 0 0-13.32M120 145.05V111l25.58 17Zm114.33-75.53a24 24 0 0 0-14.49-16.4C185.56 39.88 131 40 128 40s-57.56-.12-91.84 13.12a24 24 0 0 0-14.49 16.4C19.08 79.5 16 97.74 16 128s3.08 48.5 5.67 58.48a24 24 0 0 0 14.49 16.41C69 215.56 120.4 216 127.34 216h1.32c6.94 0 58.37-.44 91.18-13.11a24 24 0 0 0 14.49-16.41c2.59-10 5.67-28.22 5.67-58.48s-3.08-48.5-5.67-58.48m-15.49 113a8 8 0 0 1-4.77 5.49c-31.65 12.22-85.48 12-86 12H128c-.54 0-54.33.2-86-12a8 8 0 0 1-4.77-5.49C34.8 173.39 32 156.57 32 128s2.8-45.39 5.16-54.47A8 8 0 0 1 41.93 68c30.52-11.79 81.66-12 85.85-12h.27c.54 0 54.38-.18 86 12a8 8 0 0 1 4.77 5.49C221.2 82.61 224 99.43 224 128s-2.8 45.39-5.16 54.47Z"/>
                                    </svg>
                                </div>
                                <span class="font-medium text-lg" :title="formatGroupName(group.name)">{{ formatGroupName(group.name) }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Workflow types within the selected major group -->
                <div class="mt-6">
                    <div v-for="workflowType in filteredWorkflowTypes" :key="workflowType" class="mb-4">
                        <!-- Collapsible header with chevron -->
                        <div @click="toggleTypeExpanded(workflowType)"
                             class="select-none flex items-center cursor-pointer py-2 px-1 hover:bg-gray-50 dark:hover:bg-slate-900 rounded-md">
                            <!-- Right-pointing chevron when collapsed, down-pointing when expanded -->
                            <svg v-if="!expandedTypes[workflowType]" class="h-5 w-5 text-gray-500 mr-2"
                                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                            </svg>
                            <svg v-else class="h-5 w-5 text-gray-500 mr-2"
                                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                            </svg>
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white" :title="formatName(workflowType)">{{ formatName(workflowType) }}</h3>
                        </div>

                        <!-- Horizontal side-by-side tree view of workflows for each type -->
                        <div v-show="expandedTypes[workflowType]" class="flex flex-wrap mt-4 transition-all duration-300 ease-in-out overflow-hidden">

                            <div v-for="(group, groupName) in groupedByType[workflowType]" :key="groupName"
                                class="mb-6 mr-6 w-64 flex-shrink-0 border border-gray-200 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-800 shadow-sm">
                                <div class="flex items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                                    <div class="flex items-center text-gray-900 dark:text-gray-100 font-medium w-full justify-between">
                                        <span class="flex items-center" :title="formatGroupName(groupName)">
                                            {{ formatGroupName(groupName) }}
                                        </span>
                                        <span class="text-xs text-gray-500">{{ group.length }} workflow{{group.length==1?'':'s'}}</span>
                                    </div>
                                </div>

                                <div>
                                    <div v-for="workflow in group" :key="workflow.path"
                                        class="py-2 flex items-center hover:bg-gray-50 dark:hover:bg-slate-900 rounded-md px-2 cursor-pointer"
                                        @click="$emit('select',workflow)">
                                        <svg class="h-5 w-5 text-indigo-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                                        <span class="text-gray-700 dark:text-gray-300 truncate" :title="formatName(workflow.name)">{{ formatName(workflow.name) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    props: {
        workflows: Array,
        show: Boolean,
    },
    setup(props) {
        const activeMajorGroup = ref('')
        // Track expanded/collapsed state of workflow types
        const expandedTypes = ref({})

        // Toggle expanded state for a workflow type
        const toggleTypeExpanded = (type) => {
            expandedTypes.value[type] = !expandedTypes.value[type]
        }

        // Process workflows into structured data
        const processedWorkflows = computed(() => {
            return props.workflows
        })

        // Get unique workflow types
        const workflowTypes = computed(() => {
            const uniqueTypes = [...new Set(processedWorkflows.value.map(w => w.category))]
            return uniqueTypes.sort()
        })

        // Filter workflow types based on the selected major group and maintain the defined order
        const filteredWorkflowTypes = computed(() => {
            if (!activeMajorGroup.value) return []

            const selectedGroup = majorGroups.find(g => g.name === activeMajorGroup.value)
            if (!selectedGroup) return []

            // Return types in the exact order they're defined in the major group
            return selectedGroup.categories.filter(category => workflowTypes.value.includes(category))
        })

        // Group workflows by type and then by model group
        const groupedByType = computed(() => {
            const grouped = {}

            workflowTypes.value.forEach(type => {
                const typeWorkflows = processedWorkflows.value.filter(w => w.category === type)
                const groupedByModel = {}

                typeWorkflows.forEach(workflow => {
                    if (!groupedByModel[workflow.base]) {
                        groupedByModel[workflow.base] = []
                    }
                    groupedByModel[workflow.base].push(workflow)
                })

                grouped[type] = groupedByModel
            })

            return grouped
        })

        // Initialize with first major group selected and expand all workflow types by default
        onMounted(async () => {
            if (majorGroups.length > 0) {
                activeMajorGroup.value = majorGroups[0].name

                // Initialize all workflow types as expanded by default
                filteredWorkflowTypes.value.forEach(type => {
                    expandedTypes.value[type] = true
                })
            }
        })

        // When the active major group changes, expand all workflow types in that group
        watch(filteredWorkflowTypes, (newTypes) => {
            newTypes.forEach(type => {
                if (expandedTypes.value[type] === undefined) {
                    expandedTypes.value[type] = true
                }
            })
        })

        return {
            activeMajorGroup,
            majorGroups,
            filteredWorkflowTypes,
            groupedByType,
            formatName,
            formatGroupName,
            expandedTypes,
            toggleTypeExpanded,
        }
    }
}
