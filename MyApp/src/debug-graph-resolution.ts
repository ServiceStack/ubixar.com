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
}

function resolveNodeInput(node: any, inputIndex: number, graph: LGraph) {
    console.log(`  resolveNodeInput: node ${node.id}, inputIndex ${inputIndex}`)
    
    const input = node.inputs[inputIndex]
    if (!input || !input.link) {
        console.log(`    No input or link: input=${!!input}, link=${input?.link}`)
        return null
    }
    console.log(`    Input name: ${input.name}, link: ${input.link}`)

    // Find the link in the graph
    const link = graph.links?.get ? graph.links.get(input.link) : null
    if (!link) {
        console.log(`    No link found in graph.links`)
        console.log(`    graph.links type: ${typeof graph.links}`)
        console.log(`    graph.links instanceof Map: ${graph.links instanceof Map}`)
        console.log(`    graph.links size: ${graph.links?.size}`)
        if (graph.links instanceof Map) {
            console.log(`    Available link IDs: [${Array.from(graph.links.keys()).slice(0, 10).join(', ')}]`)
        }
        return null
    }
    console.log(`    Found link:`, link)

    // Get the source node
    const sourceNode = graph._nodes_by_id[link.origin_id]
    if (!sourceNode) {
        console.log(`    No source node found for origin_id ${link.origin_id}`)
        console.log(`    Available node IDs: [${Object.keys(graph._nodes_by_id).slice(0, 10).join(', ')}]`)
        return null
    }
    console.log(`    Source node found: ${sourceNode.id} (${sourceNode.type})`)

    return {
        origin_id: link.origin_id,
        origin_slot: link.origin_slot
    }
}

function createWorkflowGraph(comfyObjectInfo: any, workflow: ComfyWorkflowJSON) {
    const graph = new LGraph()
    const nodeMap = new Map<string | number, LGraphNode>()

    // First pass: Create all nodes
    for (const nodeData of workflow.nodes) {
        createNodeFromData(nodeData, graph, nodeMap, comfyObjectInfo)
    }

    // Second pass: Create connections based on links
    if (workflow.links && Array.isArray(workflow.links)) {
        const linkMap = new Map()
        for (const link of workflow.links) {
            if (Array.isArray(link) && link.length >= 6) {
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

                    const targetInputIndex = targetNode.inputs.findIndex(
                        (nodeInput) => nodeInput.name === input.name
                    )

                    if (sourceNode && targetInputIndex !== -1) {
                        try {
                            sourceNode.connect(sourceSlot, targetNode, targetInputIndex)
                        } catch (error) {
                            console.error(`Connection failed: ${error.message ?? error}`)
                        }
                    }
                }
            }
        }
    }

    return graph
}

async function testGraphToPrompt(graph: LGraph) {
    console.log(`\nTesting graph to prompt conversion...`)
    
    // Find KSampler node
    const kSamplerNode = graph._nodes.find((n: any) => n.type === 'KSampler')
    if (!kSamplerNode) {
        console.log(`No KSampler node found in graph`)
        return
    }
    
    console.log(`Found KSampler node ${kSamplerNode.id} with ${kSamplerNode.inputs?.length} inputs`)
    
    // Test resolveNodeInput for each input
    for (let i = 0; i < kSamplerNode.inputs.length; i++) {
        console.log(`\nTesting input ${i}:`)
        const resolved = resolveNodeInput(kSamplerNode, i, graph)
        console.log(`  Resolved: ${resolved ? `${resolved.origin_id}:${resolved.origin_slot}` : 'null'}`)
    }
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
        
        await testGraphToPrompt(graph)
        
    } catch (e) {
        console.error(`Error: ${e.message ?? e}`)
        console.error(`Stack: ${e.stack}`)
        process.exit(1);
    }
})()
