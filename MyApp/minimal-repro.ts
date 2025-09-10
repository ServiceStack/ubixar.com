#!/usr/bin/env bun

// Minimal reproduction of the issue
import { LGraph, LGraphNode, LiteGraph } from '@comfyorg/litegraph'

console.log('Starting minimal reproduction...')

try {
    // Mock the global frontend version variable (from original script)
    ;(globalThis as any).__COMFYUI_FRONTEND_VERSION__ = '1.0.0-test'
    
    console.log('Creating LGraph instance...')
    const graph = new LGraph()
    
    console.log('Graph created successfully')
    console.log('Graph instance:', !!graph)
    
    // Test the specific method that might be causing issues
    console.log('Testing computeExecutionOrder...')
    const executionOrder = graph.computeExecutionOrder(false)
    console.log('computeExecutionOrder completed successfully')
    
    // Test creating a simple node
    console.log('Testing node creation...')
    
    // Create a mock node class
    class TestNode extends LGraphNode {
        static title = "TestNode"
        static comfyClass = "TestNode"
        comfyClass: string
        
        constructor() {
            super("TestNode")
            this.comfyClass = "TestNode"
            this.title = "TestNode"
        }
    }
    
    // Register the node type
    LiteGraph.registerNodeType("TestNode", TestNode)
    
    // Create a node
    const node = LiteGraph.createNode("TestNode")
    if (node) {
        console.log('Node created successfully')
        graph.add(node)
        console.log('Node added to graph')
        
        // Test execution order again with a node
        const executionOrder2 = graph.computeExecutionOrder(false)
        console.log('computeExecutionOrder with node completed successfully')
    } else {
        console.log('Failed to create node')
    }
    
    // Test serialization
    console.log('Testing graph serialization...')
    const serialized = graph.serialize({ sortNodes: false })
    console.log('Graph serialized successfully')
    
    console.log('All tests passed!')
    
} catch (error) {
    console.error('Error occurred:', error.message)
    console.error('Stack trace:', error.stack)
    
    // Additional debugging
    console.log('\n=== Additional Debug Info ===')
    console.log('Error name:', error.name)
    console.log('Error constructor:', error.constructor.name)
    
    // Check if it's the specific error we're looking for
    if (error.message.includes('nodesByExecutionId')) {
        console.log('This is the nodesByExecutionId error!')
        console.log('Likely cause: LiteGraph library initialization issue')
    }
}
