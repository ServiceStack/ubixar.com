import type {
  ExecutableLGraphNode,
  ExecutionId,
  LGraph,
} from '@comfyorg/litegraph'
import {
  ExecutableNodeDTO,
  LGraphEventMode,
} from '@comfyorg/litegraph'

import type {
  ComfyApiWorkflow,
  ComfyWorkflowJSON
} from '../schemas/comfyWorkflowSchema'

import { compressWidgetInputSlots } from './litegraphUtil'

const __COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'

/**
 * Converts the current graph workflow for sending to the API.
 * @note Node widgets are updated before serialization to prepare queueing.
 *
 * @param graph The graph to convert.
 * @param options The options for the conversion.
 *  - `sortNodes`: Whether to sort the nodes by execution order.
 * @returns The workflow and node links
 */
export const graphToPrompt = async (
  graph: LGraph,
  options: { sortNodes?: boolean } = {}
): Promise<{ workflow: ComfyWorkflowJSON; output: ComfyApiWorkflow }> => {
  const { sortNodes = false } = options

  for (const node of graph.computeExecutionOrder(false)) {
    const innerNodes = (node as any).getInnerNodes
      ? (node as any).getInnerNodes(new Map())
      : [node]
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

  const nodeDtoMap = new Map<ExecutionId, ExecutableLGraphNode>()
  for (const node of graph.computeExecutionOrder(false)) {
    const dto = new ExecutableNodeDTO(node, [], nodeDtoMap) as ExecutableLGraphNode

    nodeDtoMap.set(dto.id, dto)

    if (
      node.mode === LGraphEventMode.NEVER ||
      node.mode === LGraphEventMode.BYPASS
    ) {
      continue
    }

    for (const innerNode of dto.getInnerNodes()) {
      nodeDtoMap.set(innerNode.id, innerNode)
    }
  }

  const output: ComfyApiWorkflow = {}
  // Process nodes in order of execution
  for (const node of nodeDtoMap.values()) {
    // Don't serialize muted nodes
    if (
      node.isVirtualNode ||
      node.mode === LGraphEventMode.NEVER ||
      node.mode === LGraphEventMode.BYPASS
    ) {
      continue
    }

    const inputs: ComfyApiWorkflow[string]['inputs'] = {}
    const { widgets } = node

    // Store all widget values in the API prompt.
    if (widgets) {
      for (const [i, widget] of widgets.entries()) {
        if (!widget.name || (widget.options as any)?.serialize === false) continue

        const widgetValue = (widget as any).serializeValue
          ? await (widget as any).serializeValue(node, i)
          : widget.value
        // By default, Array values are reserved to represent node connections.
        // We need to wrap the array as an object to avoid the misinterpretation
        // of the array as a node connection.
        // The backend automatically unwraps the object to an array during
        // execution.
        inputs[widget.name] = Array.isArray(widgetValue)
          ? (widget as any).type === 'curve'
            ? { __type__: 'CURVE', __value__: widgetValue }
            : { __value__: widgetValue }
          : widgetValue
      }
    }

    // Store all node links
    for (const [i, input] of node.inputs.entries()) {
      const resolvedInput = node.resolveInput(i)
      if (!resolvedInput) continue

      // Resolved to an actual widget value rather than a node connection
      if ((resolvedInput as any).widgetInfo) {
        const { value } = (resolvedInput as any).widgetInfo
        inputs[input.name] = Array.isArray(value) ? { __value__: value } : value
        continue
      }

      inputs[input.name] = [
        String(resolvedInput.origin_id),
        parseInt(String(resolvedInput.origin_slot))
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

  // Remove inputs connected to removed nodes
  for (const { inputs } of Object.values(output)) {
    for (const [i, input] of Object.entries(inputs)) {
      if (Array.isArray(input) && input.length === 2 && !output[input[0]]) {
        delete inputs[i]
      }
    }
  }

  return { workflow: workflow as unknown as ComfyWorkflowJSON, output }
}
