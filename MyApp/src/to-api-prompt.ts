#!/usr/bin/env bun

import { LGraph, LGraphNode, LiteGraph, SubgraphNode } from '@comfyorg/litegraph'

// Ensure proper initialization
if (typeof globalThis !== 'undefined') {
    ;(globalThis as any).__COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'
}

import { validateComfyWorkflow } from './schemas/comfyWorkflowSchema'
import { graphToPrompt } from "./utils/executionUtil"
import type { ComfyWorkflowJSON } from './schemas/comfyWorkflowSchema'
import { fixLinkInputSlots } from './utils/litegraphUtil'

// Mock node classes based on the object info
function createMockNodeClass(nodeType: string, nodeInfo: any) {
    class MockNode extends LGraphNode {
        static override title = nodeInfo.display_name || nodeType
        static comfyClass = nodeType
        override comfyClass: string

        // Dynamic combos (COMFY_DYNAMICCOMBO_V3) reveal nested widgets based on
        // the selected option. Captured here, expanded during configure() once
        // the selected value is known from widgets_values.
        dynamicCombos: { name: string; options: any[] }[] = []

        constructor() {
            super(nodeType)
            this.comfyClass = nodeType
            this.title = nodeInfo.display_name || nodeType

            // Add inputs in the correct order
            if (nodeInfo.input?.required) {
                // Use input_order if available, otherwise use the order from the object
                const inputOrder =
                    nodeInfo.input_order?.required || Object.keys(nodeInfo.input.required)

                inputOrder.forEach((inputName: string) => {
                    const inputDef = nodeInfo.input.required[inputName]
                    if (inputDef) {
                        this.addInput(inputName, inputDef[0])
                    }
                })
            }

            // Add outputs
            if (nodeInfo.output) {
                nodeInfo.output.forEach((outputType: string, index: number) => {
                    const outputName = nodeInfo.output_name?.[index] || outputType
                    this.addOutput(outputName, outputType)
                })
            }

            // Add widgets for required inputs that are not connections
            if (nodeInfo.input?.required) {
                // Use input_order if available, otherwise use the order from the object
                const inputOrder =
                    nodeInfo.input_order?.required || Object.keys(nodeInfo.input.required)

                inputOrder.forEach((inputName: string) => {
                    const inputDef = nodeInfo.input.required[inputName]
                    if (!inputDef) return

                    const [inputType, inputConfig] = inputDef

                    // Check if this is a connection type (should not be a widget)
                    const isConnectionType =
                        typeof inputType === 'string' &&
                        [
                            'MODEL',
                            'CLIP',
                            'VAE',
                            'CONDITIONING',
                            'LATENT',
                            'IMAGE'
                        ].includes(inputType)

                    if (!isConnectionType) {
                        // Add widget for primitive types and choice arrays
                        let defaultValue = inputConfig?.default
                        if (inputType === 'STRING') {
                            defaultValue = defaultValue || ''
                        } else if (inputType === 'INT') {
                            defaultValue = defaultValue || 0
                        } else if (inputType === 'FLOAT') {
                            defaultValue = defaultValue || 0.0
                        } else if (Array.isArray(inputType)) {
                            // For choice arrays (like ckpt_name), use the first option as default
                            defaultValue = defaultValue || inputType[0]
                        }

                        this.addWidget('text', inputName, defaultValue, () => {})

                        // Record dynamic combos so their nested option widgets
                        // can be inserted during configure().
                        if (
                            typeof inputType === 'string' &&
                            inputType.startsWith('COMFY_DYNAMICCOMBO')
                        ) {
                            this.dynamicCombos.push({
                                name: inputName,
                                options: inputConfig?.options ?? []
                            })
                        }

                        // ComfyUI adds a paired `control_after_generate` widget
                        // after seed inputs. It is serialized into widgets_values
                        // (so positional widget alignment during configure holds),
                        // but excluded from the API prompt via options.serialize.
                        if (inputName === 'seed' || inputName === 'noise_seed') {
                            this.addWidget(
                                'text',
                                'control_after_generate',
                                'randomize',
                                () => {},
                                { serialize: false }
                            )
                        }
                    }
                })
            }

            // Add widgets for optional inputs that are exposed as widgets
            // (primitives, choice arrays, dynamic combos). Connection-typed
            // optional inputs (IMAGE, AUDIO, ...) stay as input slots.
            if (nodeInfo.input?.optional) {
                const inputOrder =
                    nodeInfo.input_order?.optional ||
                    Object.keys(nodeInfo.input.optional)

                inputOrder.forEach((inputName: string) => {
                    const inputDef = nodeInfo.input.optional[inputName]
                    if (!inputDef) return

                    const [inputType] = inputDef
                    if (!MockNode.isWidgetType(inputType)) return

                    this.makeWidget(inputName, inputDef)

                    if (
                        typeof inputType === 'string' &&
                        inputType.startsWith('COMFY_DYNAMICCOMBO')
                    ) {
                        this.dynamicCombos.push({
                            name: inputName,
                            options: inputDef[1]?.options ?? []
                        })
                    }
                })
            }
        }

        // An input is rendered as a widget (rather than a connection slot) when
        // it's a choice array, a primitive, a combo, or a dynamic combo.
        static isWidgetType(inputType: any): boolean {
            if (Array.isArray(inputType)) return true
            return (
                typeof inputType === 'string' &&
                (['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO'].includes(
                    inputType
                ) ||
                    inputType.startsWith('COMFY_DYNAMICCOMBO'))
            )
        }

        makeWidget(name: string, inputDef: any) {
            const [inputType, inputConfig] = inputDef
            let defaultValue = inputConfig?.default
            if (inputType === 'STRING') {
                defaultValue = defaultValue ?? ''
            } else if (inputType === 'INT') {
                defaultValue = defaultValue ?? 0
            } else if (inputType === 'FLOAT') {
                defaultValue = defaultValue ?? 0.0
            } else if (inputType === 'BOOLEAN') {
                defaultValue = defaultValue ?? false
            } else if (Array.isArray(inputType)) {
                defaultValue = defaultValue ?? inputType[0]
            }
            return this.addWidget('text', name, defaultValue, () => {})
        }

        // Before litegraph applies widgets_values positionally, expand each
        // dynamic combo's selected option into nested `<combo>.<input>` widgets
        // so the trailing widget values align and serialize with the correct
        // dotted names in the API prompt.
        override configure(info: any) {
            if (info?.widgets_values && this.dynamicCombos.length) {
                for (const combo of this.dynamicCombos) {
                    const comboIdx = this.widgets.findIndex(
                        (w) => w.name === combo.name
                    )
                    if (comboIdx < 0) continue

                    // Index within the serialize!==false widgets, matching how
                    // litegraph maps widgets_values entries to widgets.
                    let serialIdx = -1
                    for (let k = 0; k <= comboIdx; k++) {
                        if (this.widgets[k].serialize !== false) serialIdx++
                    }
                    const selected = info.widgets_values[serialIdx]
                    const option = combo.options.find(
                        (o: any) => o.key === selected
                    )
                    if (!option) continue

                    const defs = {
                        ...(option.inputs?.required ?? {}),
                        ...(option.inputs?.optional ?? {})
                    }
                    const nested = Object.entries(defs).map(([key, def]) =>
                        this.makeWidget(`${combo.name}.${key}`, def)
                    )
                    // makeWidget appended the nested widgets; move them to
                    // directly after the combo widget.
                    this.widgets = this.widgets.filter(
                        (w) => !nested.includes(w)
                    )
                    const insertAt =
                        this.widgets.findIndex((w) => w.name === combo.name) + 1
                    this.widgets.splice(insertAt, 0, ...nested)
                }
            }
            super.configure(info)
        }
    }

    return MockNode
}

/**
 * Registers a Litegraph node type for each subgraph definition as the workflow
 * is configured. This mirrors ComfyUI's `subgraphService.registerNewSubgraph`,
 * allowing `LiteGraph.createNode(subgraphId)` to produce a `SubgraphNode` whose
 * inner nodes are expanded during API prompt generation.
 */
function registerSubgraphNodeTypes(graph: LGraph) {
    graph.events.addEventListener('subgraph-created', (e: any) => {
        const subgraph = e.detail.subgraph
        const instanceData = {
            id: -1,
            type: subgraph.id,
            pos: [0, 0],
            size: [100, 100],
            inputs: [],
            outputs: [],
            flags: {},
            order: 0,
            mode: 0
        }

        class MockSubgraphNode extends SubgraphNode {
            constructor() {
                super(graph as any, subgraph, instanceData as any)
                this.serialize_widgets = true
            }

            // Reconcile serialized inputs against the subgraph definition by
            // name. Saved workflows compress widget-promoted input slots, so the
            // serialized node exposes fewer slots than the definition. Rebuilding
            // in definition order keeps subgraph boundary slots aligned; the
            // subsequent fixLinkInputSlots() re-indexes link target slots.
            override configure(data: any) {
                const RESERVED = ['name', 'type', 'shape', 'localized_name']
                const inputByName = new Map(
                    (data.inputs ?? []).map((i: any) => [i.name, i])
                )
                const definedNames = new Set(this.inputs.map((i) => i.name))
                const definedInputs = this.inputs.map((input: any) => {
                    const inputData: any = inputByName.get(input.name)
                    return inputData
                        ? { ...inputData, ...pick(input, [...RESERVED, 'widget']) }
                        : input
                })
                const extraInputs = (data.inputs ?? []).filter(
                    (i: any) => !definedNames.has(i.name)
                )
                data.inputs = [...definedInputs, ...extraInputs]
                super.configure(data)
            }
        }

        LiteGraph.registerNodeType(subgraph.id, MockSubgraphNode as any)
    })
}

function pick(obj: any, keys: string[]) {
    const result: any = {}
    for (const key of keys) if (obj && key in obj) result[key] = obj[key]
    return result
}

const COMFY_BASE_URL = `http://localhost:8188`

// Check for verbose flag
const isVerbose = Bun.argv.includes('--verbose')
const log = (...args: any[]) => isVerbose && console.error(...args)

async function getComfyObjectInfo() {
    // Mock the global frontend version variable
    ;(globalThis as any).__COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'

    const response = await fetch(`${COMFY_BASE_URL}/api/object_info`)
    if (!response.ok) {
        return
    }
    const comfyObjectInfo = await response.json()
    return comfyObjectInfo
}

function registerObjectInfoNodeDefinitions(comfyObjectInfo: any) {
    // Register mock node types based on object info
    Object.entries(comfyObjectInfo).forEach(
        ([nodeType, nodeInfo]: [string, any]) => {
            const MockNodeClass = createMockNodeClass(nodeType, nodeInfo)
            LiteGraph.registerNodeType(nodeType, MockNodeClass)
        }
    )
}

function createWorkflowGraph(
    comfyObjectInfo: any,
    workflow: ComfyWorkflowJSON,
    errors: string[]
) {
    const graph = new LGraph()

    // Register subgraph definitions as node types before configure() creates
    // the graph nodes (subgraph-created fires during configure, ahead of nodes).
    registerSubgraphNodeTypes(graph)

    try {
        // Native Litegraph configure handles node creation, widget value
        // application, link wiring and subgraph definition/instance expansion.
        graph.configure(workflow as any)

        // Re-index link target slots to match the actual node input slots.
        // Required after subgraph nodes expand their compressed widget inputs.
        fixLinkInputSlots(graph)
    } catch (e: any) {
        errors.push(`Failed to configure workflow graph: ${e?.message ?? e}`)
    }

    return graph
}

async function generateWorkflowApiPrompt(graph: LGraph) {
    return await graphToPrompt(graph)
}

async function test() {
    // First check if ComfyUI server is available
    const comfyObjectInfo = await getComfyObjectInfo()
    if (!comfyObjectInfo) {
        console.warn('ComfyUI server not available, skipping integration test')
        return
    }

    registerObjectInfoNodeDefinitions(comfyObjectInfo)

    const workflowResponse = await fetch(
        `${COMFY_BASE_URL}/api/userdata/${encodeURIComponent('workflows/default_workflow.json')}`
    )
    if (!workflowResponse.ok) {
        console.warn(
            'Failed to load default workflow, skipping integration test',
            workflowResponse.status,
            workflowResponse.statusText
        )
        return
    }
    const workflowData = await workflowResponse.json()
    const workflow = await validateComfyWorkflow(workflowData)
    if (!workflow) {
        console.warn(
            'Failed to validate default workflow, skipping integration test'
        )
        return
    }
    const errors = []
    const workflowGraph = createWorkflowGraph(comfyObjectInfo, workflow, errors)

    const result = await generateWorkflowApiPrompt(workflowGraph)
    const prompt = result.output

    console.log('Generated API prompt:')
    console.log(JSON.stringify(prompt, null, 2))

    const apiPrompt = { prompt }
    const r = await fetch(`${COMFY_BASE_URL}/api/prompt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPrompt)
    })
    const responseJson = await r.text()
    const responseBody = JSON.parse(responseJson)
    console.log(r.status, 'Response:')
    console.log(JSON.stringify(responseBody, null, 2))
}

//test()

async function createApiPrompt(objectInfo:any, workflow:ComfyWorkflowJSON, errors) {
    registerObjectInfoNodeDefinitions(objectInfo)

    const workflowGraph = createWorkflowGraph(objectInfo, workflow, errors)

    const result = await generateWorkflowApiPrompt(workflowGraph)

    // Exclude nodes that cannot be mapped to a comfyClass (e.g. frontend-only
    // nodes like MarkdownNote that aren't part of the executable API prompt).
    const prompt: typeof result.output = {}
    for (const [nodeId, node] of Object.entries(result.output)) {
        if (node.class_type) prompt[nodeId] = node
    }
    return prompt
}

;(async () => {
    const cliArgs = Bun.argv.slice(2)

    // Filter out --verbose flag from args
    const filteredArgs = cliArgs.filter(arg => arg !== '--verbose')

    if (filteredArgs.length != 2) {
        console.log(`USAGE ${import.meta.file} [--verbose] <path-to-object_info.json> <path-to-workflow.json>`)
        process.exit(1);
    }
    // Use filtered args for file paths
    const [objectInfoPath, workflowPath] = filteredArgs

    try {
        const objectInfoFile = Bun.file(objectInfoPath)
        if (!objectInfoFile.exists()) {
            throw new Error(`${objectInfoPath} does not exist`)
        }
        const objectInfoJson = await objectInfoFile.text()
        const objectInfo = JSON.parse(objectInfoJson)

        const workflowFile = Bun.file(workflowPath)
        if (!workflowFile.exists()) {
            throw new Error(`${workflowPath} does not exist`)
        }
        const workflowJson = await workflowFile.text()
        const workflowData = JSON.parse(workflowJson)

        const workflow = await validateComfyWorkflow(workflowData)
        if (!workflow) {
            throw new Error(`${workflowPath} is not a valid workflow`)
        }

        const errors = []
        log(`DEBUG: Starting API prompt creation`)
        const apiPrompt = await createApiPrompt(objectInfo, workflow, errors)
        log(`DEBUG: API prompt creation completed. Errors:`, errors)
        console.log(JSON.stringify(apiPrompt, null, 2))
    } catch (e) {
        console.error(`${e.message ?? e}`)
        process.exit(1);
    }
})()
