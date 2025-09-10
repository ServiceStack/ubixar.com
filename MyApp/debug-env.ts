#!/usr/bin/env bun

console.log('=== Environment Debug Info ===')
console.log('Bun version:', Bun.version)
console.log('Platform:', process.platform)
console.log('Architecture:', process.arch)
console.log('Node version:', process.version)
console.log('Working directory:', process.cwd())

console.log('\n=== File System Check ===')
const files = [
    'wwwroot/test/object_info.json',
    'wwwroot/test/JibMixRealisticv18.v1.json',
    'src/to-api-prompt.ts'
]

for (const file of files) {
    const bunFile = Bun.file(file)
    console.log(`${file}: ${await bunFile.exists() ? 'EXISTS' : 'MISSING'}`)
    if (await bunFile.exists()) {
        const stat = await bunFile.stat()
        console.log(`  Size: ${stat.size} bytes`)
        console.log(`  Modified: ${stat.mtime}`)
    }
}

console.log('\n=== Package Dependencies ===')
try {
    const packageJson = await Bun.file('package.json').json()
    console.log('Dependencies:', packageJson.devDependencies)
} catch (e) {
    console.log('Error reading package.json:', e.message)
}

console.log('\n=== LiteGraph Import Test ===')
try {
    const { LGraph, LGraphNode, LiteGraph } = await import('@comfyorg/litegraph')
    console.log('LiteGraph imported successfully')
    console.log('LGraph constructor:', typeof LGraph)
    console.log('LGraphNode constructor:', typeof LGraphNode)
    console.log('LiteGraph object:', typeof LiteGraph)
    
    // Test basic LGraph creation
    const graph = new LGraph()
    console.log('LGraph instance created:', !!graph)
    console.log('LGraph methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(graph)).filter(name => typeof graph[name] === 'function').slice(0, 10))
    
} catch (e) {
    console.log('Error importing LiteGraph:', e.message)
    console.log('Stack:', e.stack)
}

console.log('\n=== Global Environment ===')
console.log('globalThis keys:', Object.keys(globalThis).filter(k => k.includes('COMFY') || k.includes('litegraph')))

// Test the specific error scenario
console.log('\n=== Testing Graph Creation ===')
try {
    const { LGraph } = await import('@comfyorg/litegraph')
    const graph = new LGraph()
    
    // Check if the graph has the problematic property
    console.log('Graph properties:', Object.getOwnPropertyNames(graph).filter(name => name.includes('node') || name.includes('execution')))
    
    // Try to call computeExecutionOrder which might trigger the error
    console.log('Testing computeExecutionOrder...')
    const executionOrder = graph.computeExecutionOrder(false)
    console.log('computeExecutionOrder succeeded, returned:', Array.isArray(executionOrder) ? `Array(${executionOrder.length})` : typeof executionOrder)
    
} catch (e) {
    console.log('Error in graph creation test:', e.message)
    console.log('Stack:', e.stack)
}
