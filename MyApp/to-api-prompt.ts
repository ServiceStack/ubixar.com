#!/usr/bin/env bun

import { LGraph, LGraphNode, LiteGraph } from '@comfyorg/litegraph'

import {
    ComfyWorkflowJSON,
    validateComfyWorkflow
} from './src/schemas/comfyWorkflowSchema'

import { graphToPrompt } from "./src/utils/executionUtil"

// Mock node classes based on the object info
function createMockNodeClass(nodeType: string, nodeInfo: any) {
    class MockNode extends LGraphNode {
        static override title = nodeInfo.display_name || nodeType
        static comfyClass = nodeType
        override comfyClass: string

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
                    }
                })
            }
        }
    }

    return MockNode
}

const COMFY_BASE_URL = `http://localhost:8188`

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

function setNodeWidgetValues(
    node: LGraphNode,
    widgets_values: any,
    nodeInfo: any
) {
    if (!widgets_values || !node.widgets) return

    if (Array.isArray(widgets_values)) {
        // Apply KSampler widget value workaround similar to app.ts loadGraphData method
        // This handles known widget value issues for KSampler nodes in default workflow

        /* KSampler object_info required input order:
          "input_order": {
            "required": [
              "model",         @type {MODEL} 
              "seed",          @type {INT} (control_after_generate:true)
              "steps",         @type {INT}
              "cfg",           @type {FLOAT}
              "sampler_name",  @type {["euler","euler_cfg_pp",..,"uni_pc_bh2"]}
              "scheduler",     @type {["simple","sgm_uniform",..,"kl_optimal"]}
              "positive",      @type {CONDITIONING}
              "negative",      @type {CONDITIONING}
              "latent_image",  @type {LATENT}
              "denoise",       @type {FLOAT}
            ]
          }
        
          KSampler values in workflow:
          "widgets_values": [
            1080261417831844, // "seed"
            "randomize",      // "seed" (control_after_execute ? "randomize" : "fixed")
            20,               // "steps"
            8,                // "cfg"
            "euler",          // "sampler_name"
            "normal",         // "scheduler"
            1.0               // "denoise"
          ]
        */
        const WIDGET_VALUE_TYPES = ['INT', 'INT', 'FLOAT', 'STRING', 'BOOLEAN']
        // Check if this is a connection type (should not be a widget)
        const isConnectionType = (inputType: any) =>
            typeof inputType === 'string' &&
            ['MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE'].includes(
                inputType
            )

        // For array format, we need to map values to the correct widget order
        // The widgets are created in the order they appear in nodeInfo.input.required
        const widgetInputs: string[] = []
        if (nodeInfo?.input?.required) {
            Object.entries(nodeInfo.input.required).forEach(
                ([inputName, inputDef]: [string, any]) => {
                    const [inputType] = inputDef

                    if (
                        Array.isArray(inputType) ||
                        (typeof inputType === 'string' &&
                            WIDGET_VALUE_TYPES.includes(inputType))
                    ) {
                        widgetInputs.push(inputName)
                        if (inputName === 'seed' || inputName === 'noise_seed') {
                            widgetInputs.push('control_after_generate')
                        }
                    }
                }
            )
        }

        // Map array values to correct widgets by name
        for (
            let i = 0;
            i < Math.min(widgets_values.length, widgetInputs.length);
            i++
        ) {
            const widgetName = widgetInputs[i]
            const widget = node.widgets?.find((w) => w.name === widgetName)
            if (widget && widgets_values[i] !== undefined) {
                widget.value = widgets_values[i] as any
                if (widgetName === 'sampler_name') {
                    if (
                        typeof widget.value === 'string' &&
                        widget.value.startsWith('sample_')
                    ) {
                        widget.value = widget.value.slice(7)
                    }
                }
            }
        }
    } else if (typeof widgets_values === 'object') {
        Object.entries(widgets_values).forEach(([key, value]) => {
            const widget = node.widgets?.find((w) => w.name === key)
            if (widget) {
                widget.value = value as any
            }
        })
    }
}

function createNodeFromData(
    nodeData: any,
    graph: LGraph,
    nodeMap: Map<string | number, LGraphNode>,
    comfyObjectInfo: any,
    errors:string[]
) {
    
    const node = LiteGraph.createNode(nodeData.type)
    if (!node) {
        errors.push(`Failed to create node of type: ${nodeData.type}`)
        return
    }

    // Add missing inputs that are expected by the workflow but not created by the mock node class
    if (nodeData.inputs) {
        const existingInputNames = new Set(node.inputs?.map((i) => i.name) || [])

        for (const expectedInput of nodeData.inputs) {
            if (!existingInputNames.has(expectedInput.name)) {
                // Add the missing input
                node.addInput(expectedInput.name, expectedInput.type)
            }
        }
    }

    // Set basic node properties
    node.id = nodeData.id
    node.pos = [nodeData.pos[0], nodeData.pos[1]] as [number, number]
    if (nodeData.size) {
        node.size = [nodeData.size[0], nodeData.size[1]] as [number, number]
    }

    // Set widget values using node info from comfyObjectInfo
    const nodeInfo = comfyObjectInfo[nodeData.type]
    setNodeWidgetValues(node, nodeData.widgets_values, nodeInfo)

    // Set node mode
    if (nodeData.mode) {
        node.mode = nodeData.mode
    }
    
    // Set node colors
    if (nodeData.color) {
        node.color = nodeData.color
    }
    if (nodeData.bgcolor) {
        node.bgcolor = nodeData.bgcolor
    }

    // Add node to graph and store in map
    graph.add(node)
    nodeMap.set(nodeData.id, node)
}

function createWorkflowGraph(
    comfyObjectInfo: any,
    workflow: ComfyWorkflowJSON,
    errors:string[]
) {
    const graph = new LGraph()
    const nodeMap = new Map<string | number, LGraphNode>()

    // First pass: Create all nodes
    for (const nodeData of workflow.nodes) {
        createNodeFromData(nodeData, graph, nodeMap, comfyObjectInfo, errors)
    }

    // Second pass: Create connections based on links
    if (workflow.links && Array.isArray(workflow.links)) {
        // Create a map of link IDs to link data for quick lookup
        const linkMap = new Map()
        for (const link of workflow.links) {
            if (Array.isArray(link) && link.length >= 6) {
                // Link format: [link_id, source_node_id, source_slot, target_node_id, target_slot, type]
                linkMap.set(link[0], link)
            }
        }

        // Connect nodes based on the node inputs that reference links
        for (const nodeData of workflow.nodes) {
            const targetNode = nodeMap.get(nodeData.id)
            if (!targetNode || !nodeData.inputs) continue

            for (const input of nodeData.inputs) {
                if (input.link && linkMap.has(input.link)) {
                    const link = linkMap.get(input.link)
                    const [, sourceNodeId, sourceSlot] = link
                    const sourceNode = nodeMap.get(sourceNodeId)

                    // Find the actual input index by name in the target node
                    const targetInputIndex = targetNode.inputs.findIndex(
                        (nodeInput) => nodeInput.name === input.name
                    )

                    if (sourceNode && targetInputIndex !== -1) {
                        try {
                            sourceNode.connect(sourceSlot, targetNode, targetInputIndex)
                        } catch (error) {
                            errors.push(`Failed to connect nodes ${sourceNodeId}:${sourceSlot} -> ${nodeData.id}:${targetInputIndex} (${input.name}): ${error.message ?? error}`)
                        }
                    }
                }
            }
        }
    }

    return graph
}

async function generateWorkflowApiPrompt(graph: LGraph) {
    const apiPrompt = await graphToPrompt(graph)
    return apiPrompt
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

    const hiResFix = Object.values(prompt).find(
        (node: any) => node.class_type === 'easy hiresFix'
    )

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
    const prompt = result.output
    return prompt
}

;(async () => {
    const cliArgs = Bun.argv.slice(2)
    // console.log(cliArgs)
    
    if (cliArgs.length != 2) {
        console.log(`USAGE ${import.meta.file} <path-to-object_info.json> <path-to-workflow.json>`)
        process.exit(1);
    }
    try {
        const objectInfoFile = Bun.file(cliArgs[0])
        if (!objectInfoFile.exists()) {
            throw new Error(`${cliArgs[0]} does not exist`)
        }
        const objectInfoJson = await objectInfoFile.text()
        const objectInfo = JSON.parse(objectInfoJson)
        
        const workflowFile = Bun.file(cliArgs[1])
        if (!objectInfoFile.exists()) {
            throw new Error(`${cliArgs[1]} does not exist`)
        }
        const workflowJson = await workflowFile.text()
        const workflowData = JSON.parse(workflowJson)

        const workflow = await validateComfyWorkflow(workflowData)
        if (!workflow) {
            throw new Error(`${cliArgs[1]} is not a valid workflow`)
        }

        const errors = []
        const apiPrompt = await createApiPrompt(objectInfo, workflow, errors)
        console.log(JSON.stringify(apiPrompt, null, 2))
    } catch (e) {
        console.error(`${e.message ?? e}`)
        process.exit(1);
    }
})()