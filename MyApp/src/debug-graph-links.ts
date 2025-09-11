#!/usr/bin/env bun

import { LGraph, LGraphNode, LiteGraph } from '@comfyorg/litegraph'
import { ComfyWorkflowJSON, validateComfyWorkflow } from './schemas/comfyWorkflowSchema'

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
                const inputOrder = nodeInfo.input_order?.required || Object.keys(nodeInfo.input.required)
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
        }
    }
    return MockNode
}

function registerObjectInfoNodeDefinitions(comfyObjectInfo: any) {
    Object.entries(comfyObjectInfo).forEach(([nodeType, nodeInfo]: [string, any]) => {
        const MockNodeClass = createMockNodeClass(nodeType, nodeInfo)
        LiteGraph.registerNodeType(nodeType, MockNodeClass)
    })
}

function createNodeFromData(nodeData: any, graph: LGraph, nodeMap: Map<string | number, LGraphNode>, comfyObjectInfo: any) {
    const node = LiteGraph.createNode(nodeData.type)
    if (!node) {
        console.error(`Failed to create node of type: ${nodeData.type}`)
        return
    }

    node.id = nodeData.id
    node.pos = [nodeData.pos[0], nodeData.pos[1]] as [number, number]
    
    graph.add(node)
    nodeMap.set(nodeData.id, node)
    
    console.log(`Created node ${nodeData.id} (${nodeData.type}) with ${node.inputs?.length || 0} inputs and ${node.outputs?.length || 0} outputs`)
}

function createWorkflowGraph(comfyObjectInfo: any, workflow: ComfyWorkflowJSON) {
    const graph = new LGraph()
    const nodeMap = new Map<string | number, LGraphNode>()

    // First pass: Create all nodes
    for (const nodeData of workflow.nodes) {
        createNodeFromData(nodeData, graph, nodeMap, comfyObjectInfo)
    }

    console.log(`\nCreated ${nodeMap.size} nodes`)
    console.log(`Graph has ${workflow.links?.length || 0} links to process`)

    // Second pass: Create connections based on links
    if (workflow.links && Array.isArray(workflow.links)) {
        const linkMap = new Map()
        for (const link of workflow.links) {
            if (Array.isArray(link) && link.length >= 6) {
                linkMap.set(link[0], link)
                console.log(`Link ${link[0]}: ${link[1]}:${link[2]} -> ${link[3]}:${link[4]} (${link[5]})`)
            }
        }

        // Connect nodes based on the node inputs that reference links
        for (const nodeData of workflow.nodes) {
            const targetNode = nodeMap.get(nodeData.id)
            if (!targetNode || !nodeData.inputs) continue

            console.log(`\nProcessing node ${nodeData.id} (${nodeData.type}) with ${nodeData.inputs?.length || 0} inputs`)
            
            for (const input of nodeData.inputs) {
                console.log(`  Input: ${input.name} (link: ${input.link})`)
                if (input.link && linkMap.has(input.link)) {
                    const link = linkMap.get(input.link)
                    const [, sourceNodeId, sourceSlot] = link
                    const sourceNode = nodeMap.get(sourceNodeId)

                    const targetInputIndex = targetNode.inputs.findIndex(
                        (nodeInput) => nodeInput.name === input.name
                    )

                    if (sourceNode && targetInputIndex !== -1) {
                        try {
                            console.log(`    Connecting ${sourceNodeId}:${sourceSlot} -> ${nodeData.id}:${targetInputIndex} (${input.name})`)
                            sourceNode.connect(sourceSlot, targetNode, targetInputIndex)
                        } catch (error) {
                            console.error(`    Connection failed: ${error.message ?? error}`)
                        }
                    } else {
                        console.error(`    Cannot connect - sourceNode: ${!!sourceNode}, targetInputIndex: ${targetInputIndex}`)
                    }
                }
            }
        }
    }

    // Check final graph state
    console.log(`\nFinal graph state:`)
    console.log(`Graph.links type: ${typeof graph.links}`)
    console.log(`Graph.links instanceof Map: ${graph.links instanceof Map}`)
    console.log(`Graph.links size: ${graph.links?.size || 'no size property'}`)
    
    if (graph.links instanceof Map) {
        console.log(`Graph.links keys: [${Array.from(graph.links.keys()).slice(0, 10).join(', ')}]`)
    }

    return graph
}

;(async () => {
    const cliArgs = Bun.argv.slice(2)
    
    if (cliArgs.length != 2) {
        console.log(`USAGE ${import.meta.file} <path-to-object_info.json> <path-to-workflow.json>`)
        process.exit(1);
    }
    
    try {
        const objectInfoFile = Bun.file(cliArgs[0])
        const objectInfoJson = await objectInfoFile.text()
        const objectInfo = JSON.parse(objectInfoJson)
        
        const workflowFile = Bun.file(cliArgs[1])
        const workflowJson = await workflowFile.text()
        const workflowData = JSON.parse(workflowJson)

        const workflow = await validateComfyWorkflow(workflowData)
        if (!workflow) {
            throw new Error(`${cliArgs[1]} is not a valid workflow`)
        }

        registerObjectInfoNodeDefinitions(objectInfo)
        const graph = createWorkflowGraph(objectInfo, workflow)
        
        console.log(`\nDebug complete.`)
    } catch (e) {
        console.error(`${e.message ?? e}`)
        process.exit(1);
    }
})()
