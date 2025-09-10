#!/usr/bin/env bun

import { LGraph, LGraphNode, LiteGraph } from '@comfyorg/litegraph'

import {
    ComfyWorkflowJSON,
    validateComfyWorkflow
} from './schemas/comfyWorkflowSchema'

import { graphToPrompt } from "./utils/executionUtil"
import type { LGraph, NodeId } from '@comfyorg/litegraph'
import {
  ExecutableNodeDTO,
  LGraphEventMode,
  SubgraphNode
} from '@comfyorg/litegraph'
import type {
  ComfyApiWorkflow,
  ComfyWorkflowJSON
} from './schemas/comfyWorkflowSchema'
import { compressWidgetInputSlots } from './utils/litegraphUtil'

const __COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'

/**
 * Custom input resolution that doesn't rely on nodesByExecutionId
 */
function resolveNodeInput(node: any, inputIndex: number, graph: LGraph) {
  const input = node.inputs[inputIndex]
  if (!input || !input.link) {
    return null
  }

  // Find the link in the graph
  const link = graph.links?.get ? graph.links.get(input.link) : null
  if (!link) {
    return null
  }

  // Get the source node
  const sourceNode = graph._nodes_by_id[link.origin_id]
  if (!sourceNode) {
    return null
  }

  return {
    origin_id: link.origin_id,
    origin_slot: link.origin_slot
  }
}

/**
 * Recursively target node's parent nodes to the new output.
 */
function recursiveAddNodes(
  nodeId: NodeId,
  oldOutput: ComfyApiWorkflow,
  newOutput: ComfyApiWorkflow
) {
  const currentId = String(nodeId)
  const currentNode = oldOutput[currentId]!
  if (newOutput[currentId] == null) {
    newOutput[currentId] = currentNode
    for (const inputValue of Object.values(currentNode.inputs || [])) {
      if (Array.isArray(inputValue)) {
        recursiveAddNodes(inputValue[0], oldOutput, newOutput)
      }
    }
  }
  return newOutput
}

/**
 * Fixed version of graphToPrompt that doesn't use problematic resolveInput
 */
const graphToPromptFixed = async (
  graph: LGraph,
  options: { sortNodes?: boolean; queueNodeIds?: NodeId[] } = {}
): Promise<{ workflow: ComfyWorkflowJSON; output: ComfyApiWorkflow }> => {
  const { sortNodes = false, queueNodeIds } = options

  for (const node of graph.computeExecutionOrder(false)) {
    const innerNodes = (node as any).getInnerNodes ? (node as any).getInnerNodes() : [node]
    for (const innerNode of innerNodes) {
      if (innerNode.isVirtualNode) {
        innerNode.applyToGraph?.()
      }
    }
  }

  const workflow = graph.serialize({ sortNodes })

  // Remove localized_name from the workflow
  for (const node of workflow.nodes) {
    for (const slot of node.inputs ?? []) {
      delete slot.localized_name
    }
    for (const slot of node.outputs ?? []) {
      delete slot.localized_name
    }
  }

  compressWidgetInputSlots(workflow)
  workflow.extra ??= {}
  workflow.extra.frontendVersion = __COMFYUI_FRONTEND_VERSION__

  const computedNodeDtos = graph
    .computeExecutionOrder(false)
    .map(
      (node) =>
        new ExecutableNodeDTO(
          node,
          [],
          node instanceof SubgraphNode ? node : undefined
        )
    )

  let output: ComfyApiWorkflow = {}
  // Process nodes in order of execution
  for (const outerNode of computedNodeDtos) {
    // Don't serialize muted nodes
    if (
      outerNode.mode === LGraphEventMode.NEVER ||
      outerNode.mode === LGraphEventMode.BYPASS
    ) {
      continue
    }

    for (const node of outerNode.getInnerNodes()) {
      if (
        node.isVirtualNode ||
        node.mode === LGraphEventMode.NEVER ||
        node.mode === LGraphEventMode.BYPASS
      ) {
        continue
      }

      const inputs: ComfyApiWorkflow[string]['inputs'] = {}
      const { widgets } = node

      // Store all widget values
      if (widgets) {
        for (const [i, widget] of widgets.entries()) {
          if (!widget.name || (widget.options as any)?.serialize === false) continue

          const widgetValue = (widget as any).serializeValue
            ? await (widget as any).serializeValue(node, i)
            : widget.value

          inputs[widget.name] = Array.isArray(widgetValue)
            ? {
                __value__: widgetValue
              }
            : widgetValue
        }
      }

      // Store all node links using our custom resolution
      for (const [i, input] of node.inputs.entries()) {
        const resolvedInput = resolveNodeInput(node, i, graph)
        if (!resolvedInput) continue

        inputs[input.name] = [
          String(resolvedInput.origin_id),
          parseInt(resolvedInput.origin_slot)
        ]
      }

      output[String(node.id)] = {
        inputs,
        class_type: node.comfyClass!,
        _meta: {
          title: node.title
        }
      }
    }
  }

  // Remove inputs connected to removed nodes
  for (const { inputs } of Object.values(output)) {
    for (const [i, input] of Object.entries(inputs)) {
      if (Array.isArray(input) && input.length === 2 && !output[input[0]]) {
        delete inputs[i]
      }
    }
  }

  // Partial execution
  if (queueNodeIds?.length) {
    const newOutput = {}
    for (const queueNodeId of queueNodeIds) {
      recursiveAddNodes(queueNodeId, output, newOutput)
    }
    output = newOutput
  }

  return { workflow: workflow as unknown as ComfyWorkflowJSON, output }
}

// Check for verbose flag
const isVerbose = Bun.argv.includes('--verbose')
const log = (...args: any[]) => isVerbose && console.log(...args)
const error = (...args: any[]) => console.error(...args)

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

function setNodeWidgetValues(
    node: LGraphNode,
    widgets_values: any,
    nodeInfo: any
) {
    if (!widgets_values || !node.widgets) return

    try {
        if (Array.isArray(widgets_values)) {
            log(`Setting array widget values for node ${node.title}:`, widgets_values)

            const WIDGET_VALUE_TYPES = ['INT', 'INT', 'FLOAT', 'STRING', 'BOOLEAN']
            const isConnectionType = (inputType: any) =>
                typeof inputType === 'string' &&
                ['MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE'].includes(inputType)

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

            for (
                let i = 0;
                i < Math.min(widgets_values.length, widgetInputs.length);
                i++
            ) {
                const widgetName = widgetInputs[i]
                const widget = node.widgets?.find((w) => w.name === widgetName)
                if (widget && widgets_values[i] !== undefined) {
                    log(`  Setting widget ${widgetName} = ${widgets_values[i]}`)
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
            log(`Setting object widget values for node ${node.title}:`, widgets_values)
            Object.entries(widgets_values).forEach(([key, value]) => {
                const widget = node.widgets?.find((w) => w.name === key)
                if (widget) {
                    log(`  Setting widget ${key} = ${value}`)
                    widget.value = value as any
                }
            })
        }
    } catch (err) {
        error(`Error setting widget values for node ${node.title}:`, err.message)
        throw err
    }
}

function registerObjectInfoNodeDefinitions(comfyObjectInfo: any) {
    log(`Registering ${Object.keys(comfyObjectInfo).length} node types...`)

    Object.entries(comfyObjectInfo).forEach(
        ([nodeType, nodeInfo]: [string, any]) => {
            try {
                const MockNodeClass = createMockNodeClass(nodeType, nodeInfo)
                LiteGraph.registerNodeType(nodeType, MockNodeClass)
            } catch (error) {
                error(`Failed to register node type ${nodeType}:`, error.message)
            }
        }
    )
    log('Node registration completed')
}

function createNodeFromData(
    nodeData: any,
    graph: LGraph,
    nodeMap: Map<string | number, LGraphNode>,
    comfyObjectInfo: any,
    errors: string[]
) {
    log(`Creating node: ${nodeData.type} (ID: ${nodeData.id})`)

    try {
        const node = LiteGraph.createNode(nodeData.type)
        if (!node) {
            const errorMsg = `Failed to create node of type: ${nodeData.type}`
            errors.push(errorMsg)
            error(errorMsg)
            return
        }

        // Add missing inputs that are expected by the workflow but not created by the mock node class
        if (nodeData.inputs) {
            log(`  Adding missing inputs for node ${nodeData.type}`)
            const existingInputNames = new Set(node.inputs?.map((i) => i.name) || [])

            for (const expectedInput of nodeData.inputs) {
                if (!existingInputNames.has(expectedInput.name)) {
                    log(`    Adding missing input: ${expectedInput.name} (${expectedInput.type})`)
                    node.addInput(expectedInput.name, expectedInput.type)
                }
            }
        }

        // Set basic node properties
        log(`  Setting basic properties for node ${nodeData.type}`)
        node.id = nodeData.id
        node.pos = [nodeData.pos[0], nodeData.pos[1]] as [number, number]
        if (nodeData.size) {
            node.size = [nodeData.size[0], nodeData.size[1]] as [number, number]
        }

        // Set widget values using node info from comfyObjectInfo
        if (nodeData.widgets_values) {
            log(`  Setting widget values for node ${nodeData.type}`)
            const nodeInfo = comfyObjectInfo[nodeData.type]
            setNodeWidgetValues(node, nodeData.widgets_values, nodeInfo)
        }

        // Set node mode
        if (nodeData.mode) {
            log(`  Setting mode ${nodeData.mode} for node ${nodeData.type}`)
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
        log(`Node ${nodeData.type} (ID: ${nodeData.id}) created successfully`)

    } catch (err) {
        const errorMsg = `Error in createNodeFromData for ${nodeData.type} (ID: ${nodeData.id}): ${err.message}`
        errors.push(errorMsg)
        error(errorMsg)
        error('Stack:', err.stack)
        throw err
    }
}

function createWorkflowGraph(
    comfyObjectInfo: any,
    workflow: ComfyWorkflowJSON,
    errors: string[]
) {
    log('Creating workflow graph...')
    const graph = new LGraph()
    const nodeMap = new Map<string | number, LGraphNode>()

    log(`Processing ${workflow.nodes.length} nodes...`)

    // First pass: Create all nodes
    for (const nodeData of workflow.nodes) {
        try {
            createNodeFromData(nodeData, graph, nodeMap, comfyObjectInfo, errors)
        } catch (err) {
            const errorMsg = `Error creating node ${nodeData.type} (ID: ${nodeData.id}): ${err.message}`
            errors.push(errorMsg)
            error(errorMsg)
            // Don't rethrow here, continue with other nodes
        }
    }

    log(`Created ${nodeMap.size} nodes successfully`)

    // Second pass: Create connections based on links
    if (workflow.links && Array.isArray(workflow.links)) {
        log(`Processing ${workflow.links.length} links...`)

        try {
            // Create a map of link IDs to link data for quick lookup
            const linkMap = new Map()
            for (const link of workflow.links) {
                if (Array.isArray(link) && link.length >= 6) {
                    // Link format: [link_id, source_node_id, source_slot, target_node_id, target_slot, type]
                    linkMap.set(link[0], link)
                    log(`  Mapped link ${link[0]}: ${link[1]}:${link[2]} -> ${link[3]}:${link[4]} (${link[5]})`)
                }
            }

            // Connect nodes based on the node inputs that reference links
            for (const nodeData of workflow.nodes) {
                const targetNode = nodeMap.get(nodeData.id)
                if (!targetNode || !nodeData.inputs) continue

                log(`  Processing inputs for node ${nodeData.type} (ID: ${nodeData.id})`)

                for (const input of nodeData.inputs) {
                    if (input.link && linkMap.has(input.link)) {
                        try {
                            const link = linkMap.get(input.link)
                            const [, sourceNodeId, sourceSlot] = link
                            const sourceNode = nodeMap.get(sourceNodeId)

                            log(`    Connecting link ${input.link}: ${sourceNodeId}:${sourceSlot} -> ${nodeData.id}:${input.name}`)

                            // Find the actual input index by name in the target node
                            const targetInputIndex = targetNode.inputs.findIndex(
                                (nodeInput) => nodeInput.name === input.name
                            )

                            if (sourceNode && targetInputIndex !== -1) {
                                log(`      Connecting ${sourceNodeId}:${sourceSlot} -> ${nodeData.id}:${targetInputIndex}`)
                                sourceNode.connect(sourceSlot, targetNode, targetInputIndex)
                                log(`      Connection successful`)
                            } else {
                                const errorMsg = `Failed to find nodes or input for connection ${sourceNodeId}:${sourceSlot} -> ${nodeData.id}:${input.name}`
                                error(errorMsg)
                                errors.push(errorMsg)
                            }
                        } catch (connectionError) {
                            const errorMsg = `Failed to connect nodes ${input.link}: ${connectionError.message}`
                            error(errorMsg)
                            error('Connection error stack:', connectionError.stack)
                            errors.push(errorMsg)
                        }
                    }
                }
            }

            log('Link processing completed')
        } catch (linkError) {
            const errorMsg = `Error processing links: ${linkError.message}`
            error(errorMsg)
            error('Link error stack:', linkError.stack)
            errors.push(errorMsg)
        }
    }

    log('Graph creation completed')
    return graph
}

async function generateWorkflowApiPrompt(graph: LGraph) {
    log('Generating API prompt...')
    log('Graph nodes count:', graph._nodes.length)

    // This is where the error likely occurs
    try {
        log('About to call graph.computeExecutionOrder(false)...')
        const executionOrder = graph.computeExecutionOrder(false)
        log('computeExecutionOrder completed, got:', executionOrder.length, 'nodes')

        // Try to initialize the graph's execution context properly
        log('Initializing graph execution context...')

        // Ensure all nodes have proper graph reference
        for (const node of graph._nodes) {
            if (!node.graph) {
                log(`Setting graph reference for node ${node.id}`)
                node.graph = graph
            }
        }

        // Try to update execution order to ensure internal state is set
        log('Updating execution order...')
        graph.updateExecutionOrder()

        log('About to call graphToPrompt...')
        let apiPrompt
        try {
            apiPrompt = await graphToPrompt(graph)
        } catch (originalError) {
            error('Original graphToPrompt failed, trying fixed version...')
            error('Original error:', originalError.message)
            apiPrompt = await graphToPromptFixed(graph)
            log('Fixed graphToPrompt succeeded!')
        }
        log('API prompt generated successfully')
        return apiPrompt
    } catch (err) {
        error('Error in generateWorkflowApiPrompt:', err.message)
        error('Error name:', err.name)
        error('Error constructor:', err.constructor.name)

        // Check for the specific nodesByExecutionId error
        if (err.message && err.message.includes('nodesByExecutionId')) {
            error('*** This is the nodesByExecutionId error! ***')
            error('Graph state:')
            error('  _nodes length:', graph._nodes?.length || 'undefined')
            error('  _nodes_by_id keys:', Object.keys(graph._nodes_by_id || {}))
            error('  Graph properties:', Object.getOwnPropertyNames(graph).filter(name => name.includes('node') || name.includes('execution')))

            // Check individual nodes
            error('Node states:')
            for (const node of graph._nodes) {
                error(`  Node ${node.id} (${node.title}):`)
                error(`    graph reference:`, !!node.graph)
                error(`    properties:`, Object.getOwnPropertyNames(node).filter(name => name.includes('node') || name.includes('execution')))
            }
        }

        error('Full stack:', err.stack)
        throw err
    }
}

async function createApiPrompt(objectInfo: any, workflow: ComfyWorkflowJSON, errors: string[]) {
    log('Starting API prompt creation...')

    registerObjectInfoNodeDefinitions(objectInfo)

    const workflowGraph = createWorkflowGraph(objectInfo, workflow, errors)

    const result = await generateWorkflowApiPrompt(workflowGraph)
    const prompt = result.output
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
        log('=== Starting Debug Version ===')
        log('Args:', filteredArgs)

        log('Loading object info...')
        const objectInfoFile = Bun.file(objectInfoPath)
        if (!await objectInfoFile.exists()) {
            throw new Error(`${objectInfoPath} does not exist`)
        }
        const objectInfoJson = await objectInfoFile.text()
        const objectInfo = JSON.parse(objectInfoJson)
        log(`Object info loaded: ${Object.keys(objectInfo).length} node types`)

        log('Loading workflow...')
        const workflowFile = Bun.file(workflowPath)
        if (!await workflowFile.exists()) {
            throw new Error(`${workflowPath} does not exist`)
        }
        const workflowJson = await workflowFile.text()
        const workflowData = JSON.parse(workflowJson)
        log(`Workflow loaded: ${workflowData.nodes?.length || 0} nodes`)

        log('Validating workflow...')
        const workflow = await validateComfyWorkflow(workflowData)
        if (!workflow) {
            throw new Error(`${workflowPath} is not a valid workflow`)
        }
        log('Workflow validation passed')

        const errors: string[] = []
        const apiPrompt = await createApiPrompt(objectInfo, workflow, errors)

        if (errors.length > 0) {
            error('Errors encountered:')
            errors.forEach(err => error('  -', err))
        }

        console.log(JSON.stringify(apiPrompt, null, 2))
    } catch (e) {
        error('=== FATAL ERROR ===')
        error(`${e.message ?? e}`)
        if (isVerbose) {
            error('Stack:', e.stack)
        }
        process.exit(1);
    }
})()
