#!/usr/bin/env bun

import { LGraph, LGraphNode, LiteGraph } from '@comfyorg/litegraph'

import {
    ComfyWorkflowJSON,
    validateComfyWorkflow
} from './schemas/comfyWorkflowSchema'

import { graphToPrompt } from "./utils/executionUtil"

// Ensure proper initialization
if (typeof globalThis !== 'undefined') {
    ;(globalThis as any).__COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'
}

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
                const inputOrder =
                    nodeInfo.input_order?.required || Object.keys(nodeInfo.input.required)

                inputOrder.forEach((inputName: string) => {
                    const inputDef = nodeInfo.input.required[inputName]
                    if (!inputDef) return

                    const [inputType, inputConfig] = inputDef

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
                        let defaultValue = inputConfig?.default
                        if (inputType === 'STRING') {
                            defaultValue = defaultValue || ''
                        } else if (inputType === 'INT') {
                            defaultValue = defaultValue || 0
                        } else if (inputType === 'FLOAT') {
                            defaultValue = defaultValue || 0.0
                        } else if (Array.isArray(inputType)) {
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

function registerObjectInfoNodeDefinitions(comfyObjectInfo: any) {
    console.log(`Registering ${Object.keys(comfyObjectInfo).length} node types...`)
    
    Object.entries(comfyObjectInfo).forEach(
        ([nodeType, nodeInfo]: [string, any]) => {
            try {
                const MockNodeClass = createMockNodeClass(nodeType, nodeInfo)
                LiteGraph.registerNodeType(nodeType, MockNodeClass)
            } catch (error) {
                console.error(`Failed to register node type ${nodeType}:`, error.message)
            }
        }
    )
    console.log('Node registration completed')
}

function createNodeFromData(
    nodeData: any,
    graph: LGraph,
    nodeMap: Map<string | number, LGraphNode>,
    comfyObjectInfo: any,
    errors: string[]
) {
    console.log(`Creating node: ${nodeData.type} (ID: ${nodeData.id})`)
    
    const node = LiteGraph.createNode(nodeData.type)
    if (!node) {
        const error = `Failed to create node of type: ${nodeData.type}`
        errors.push(error)
        console.error(error)
        return
    }

    // Set basic node properties
    node.id = nodeData.id
    node.pos = [nodeData.pos[0], nodeData.pos[1]] as [number, number]
    if (nodeData.size) {
        node.size = [nodeData.size[0], nodeData.size[1]] as [number, number]
    }

    // Add node to graph and store in map
    graph.add(node)
    nodeMap.set(nodeData.id, node)
    console.log(`Node ${nodeData.type} (ID: ${nodeData.id}) created successfully`)
}

function createWorkflowGraph(
    comfyObjectInfo: any,
    workflow: ComfyWorkflowJSON,
    errors: string[]
) {
    console.log('Creating workflow graph...')
    const graph = new LGraph()
    const nodeMap = new Map<string | number, LGraphNode>()

    console.log(`Processing ${workflow.nodes.length} nodes...`)
    
    // First pass: Create all nodes
    for (const nodeData of workflow.nodes) {
        try {
            createNodeFromData(nodeData, graph, nodeMap, comfyObjectInfo, errors)
        } catch (error) {
            const errorMsg = `Error creating node ${nodeData.type} (ID: ${nodeData.id}): ${error.message}`
            errors.push(errorMsg)
            console.error(errorMsg)
        }
    }

    console.log(`Created ${nodeMap.size} nodes successfully`)
    console.log('Graph creation completed')
    return graph
}

async function generateWorkflowApiPrompt(graph: LGraph) {
    console.log('Generating API prompt...')
    console.log('Graph nodes count:', graph._nodes.length)
    
    // This is where the error likely occurs
    try {
        const apiPrompt = await graphToPrompt(graph)
        console.log('API prompt generated successfully')
        return apiPrompt
    } catch (error) {
        console.error('Error in graphToPrompt:', error.message)
        console.error('Stack:', error.stack)
        throw error
    }
}

async function createApiPrompt(objectInfo: any, workflow: ComfyWorkflowJSON, errors: string[]) {
    console.log('Starting API prompt creation...')
    
    registerObjectInfoNodeDefinitions(objectInfo)
    
    const workflowGraph = createWorkflowGraph(objectInfo, workflow, errors)

    const result = await generateWorkflowApiPrompt(workflowGraph)
    const prompt = result.output
    return prompt
}

;(async () => {
    const cliArgs = Bun.argv.slice(2)
    
    if (cliArgs.length != 2) {
        console.log(`USAGE ${import.meta.file} <path-to-object_info.json> <path-to-workflow.json>`)
        process.exit(1);
    }
    
    try {
        console.log('=== Starting Debug Version ===')
        console.log('Args:', cliArgs)
        
        console.log('Loading object info...')
        const objectInfoFile = Bun.file(cliArgs[0])
        if (!await objectInfoFile.exists()) {
            throw new Error(`${cliArgs[0]} does not exist`)
        }
        const objectInfoJson = await objectInfoFile.text()
        const objectInfo = JSON.parse(objectInfoJson)
        console.log(`Object info loaded: ${Object.keys(objectInfo).length} node types`)
        
        console.log('Loading workflow...')
        const workflowFile = Bun.file(cliArgs[1])
        if (!await workflowFile.exists()) {
            throw new Error(`${cliArgs[1]} does not exist`)
        }
        const workflowJson = await workflowFile.text()
        const workflowData = JSON.parse(workflowJson)
        console.log(`Workflow loaded: ${workflowData.nodes?.length || 0} nodes`)

        console.log('Validating workflow...')
        const workflow = await validateComfyWorkflow(workflowData)
        if (!workflow) {
            throw new Error(`${cliArgs[1]} is not a valid workflow`)
        }
        console.log('Workflow validation passed')

        const errors: string[] = []
        const apiPrompt = await createApiPrompt(objectInfo, workflow, errors)
        
        if (errors.length > 0) {
            console.error('Errors encountered:')
            errors.forEach(error => console.error('  -', error))
        }
        
        console.log('=== SUCCESS ===')
        console.log(JSON.stringify(apiPrompt, null, 2))
    } catch (e) {
        console.error('=== FATAL ERROR ===')
        console.error(`${e.message ?? e}`)
        console.error('Stack:', e.stack)
        process.exit(1);
    }
})()
