#!/usr/bin/env node

/*
 * Updates model-list.json, custom-node-list.json and extension-node-map.json from ComfyUI-Manager
 */

const files = {
    './wwwroot/data/model-list.json': 'https://raw.githubusercontent.com/Comfy-Org/ComfyUI-Manager/refs/heads/main/model-list.json',
    './wwwroot/data/custom-node-list.json': 'https://raw.githubusercontent.com/Comfy-Org/ComfyUI-Manager/refs/heads/main/custom-node-list.json',
    './wwwroot/data/extension-node-map.json': 'https://raw.githubusercontent.com/Comfy-Org/ComfyUI-Manager/refs/heads/main/extension-node-map.json',
}

import path from 'path'
import fs from 'fs'

async function fetchDownload(url, toFile, retries) {
    const toDir = path.dirname(toFile)
    fs.mkdirSync(toDir, {recursive: true})
    for (let i = retries; i >= 0; --i) {
        try {
            let r = await fetch(url)
            if (!r.ok) {
                throw new Error(`${r.status} ${r.statusText}`);
            }
            let txt = await r.text()
            console.log(`writing ${url} to ${toFile}`)
            await fs.writeFileSync(toFile, txt)
            return
        } catch (e) {
            console.log(`get ${url} failed: ${e}${i > 0 ? `, ${i} retries remaining...` : ''}`)
        }
    }
}

const requests = []
Object.keys(files).forEach(path => {
    let url = files[path]
    requests.push(fetchDownload(url, path, 5))
})

await Promise.all(requests)

const modelListJson = fs.readFileSync('./wwwroot/data/model-list.json', 'utf8')
const modelList = JSON.parse(modelListJson)
const models = modelList.models
const uniqueModels = []
let unknownPaths = {}

// Check and report duplicate URLs:

const supportedPaths = [
    'checkpoints',
    'clip',
    'clip_vision',
    'configs',
    'controlnet',
    'diffusers',
    'diffusion_models',
    'embeddings',
    'gligen',
    'hypernetworks',
    'loras',
    'photomaker',
    'style_models',
    'text_encoders',
    'unet',
    'upscale_models',
    'vae',
    'vae_approx',
    'ultralytics',
    'sams',
]

const urls = new Set()
const duplicates = new Set()
models.forEach(model => {
    if (urls.has(model.url)) {
        duplicates.add(model.url)
    } else {
        urls.add(model.url)
        if (model.save_path === 'default') {
            model.save_path = model.type.toLowerCase()
        }
        if (model.save_path === 'upscale' || model.base === 'upscale') {
            model.save_path = 'upscale_models'
        }
        if (model.save_path === 'diffusion_model') {
            model.save_path = 'diffusion_models'
        }
        if (model.type === 'VAE') {
            model.type = 'vae'
        }
        
        if (true || supportedPaths.some(x => model.save_path.startsWith(x))) {
            const asset = Object.assign({}, 
                model, { 
                save_path: undefined,
                savePath: model.save_path,    
            })
            uniqueModels.push(asset)
        } else {
            unknownPaths[model.save_path] ??= 0
            unknownPaths[model.save_path]++
        }
    }
})
if (duplicates.size > 0) {
    console.log('Duplicate URLs found:')
    console.log(Array.from(duplicates))
}

if (Object.keys(unknownPaths).length > 0) {
    console.log('Unknown save_paths found:')
    // order by value desc
    unknownPaths = Object.fromEntries(
        Object.entries(unknownPaths).sort((a, b) => b[1] - a[1])
    )
    console.log(JSON.stringify(unknownPaths, null, 2))
}

const json = JSON.stringify(uniqueModels, null, 2)
await fs.writeFileSync('./wwwroot/data/assets.json', json)
