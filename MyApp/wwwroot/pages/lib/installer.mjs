import { ref } from "vue";
import { delay, storageArray } from "./utils.mjs"
import { combinePaths, lastRightPart, leftPart, rightPart } from "@servicestack/client"
import {
    AgentCommand,
    DeleteModel,
    GetDeviceStatus,
    InstallAsset,
    InstallCustomNode,
    InstallModel, InstallPipPackage,
    UninstallCustomNode, UninstallPipPackage,
    UpdateDevice,
} from "../../mjs/dtos.mjs"

const Types = {
    Node: 'Node',
    Model: 'Model',
    Package: 'Package',
}
const Status = {
    Queued: 'queued',
    Installing: 'installing',
    Installed: 'installed',
    Failed: 'failed',
}

let lastClose = Date.now()

export function useDeviceInstaller(store, client, device, route) {
    const deviceId = device.deviceId
    const downloadKey = `downloads:${deviceId}`
    const uninstallKey = `uninstalls:${deviceId}`

    const refDevice = ref(device)
    const refStatus = ref('')
    const refDownloads = ref(storageArray(downloadKey))
    const refUninstalls = ref(storageArray(uninstallKey))
    const refShowDownloads = ref(false)
    const refError = ref()
    const refMonitor = ref(false)
    const refRunning = ref(false)

    const closeHandlers = {}

    function handleClose() {
        const key = route.query.versionId ? route.query.show + '/versionId' : route.query.show
        const handler = closeHandlers[key]
        if (handler) {
            const shouldInvoke = !lastClose || (Date.now() - lastClose) > 100
            console.log('closeHandler', key, shouldInvoke)
            if (shouldInvoke) {
                lastClose = Date.now()
                handler()
            }
        }
    }

    function registerCloseHandler(tab, handler) {
        closeHandlers[tab] = handler
    }

    function setStatus(msg) {
        refStatus.value = msg
        clearDownloadsIfDisabled(msg)
    }

    function setError(status = null, errorMsg = null) {
        if (!status) {
            refError.value = null
            return
        }
        if (typeof status === 'string') {
            status = {errorCode: 'Exception', message: status}
        }
        if (!status.message) {
            status.message = 'Unknown error'
        }
        if (errorMsg) {
            console.error(errorMsg, status.message)
        } else {
            console.error(status.message)
        }
        refError.value = status

        clearDownloadsIfDisabled(status?.message)
    }

    function saveDownloads() {
        localStorage.setItem(downloadKey, JSON.stringify(refDownloads.value))
    }
    
    function clearDownloadsIfDisabled(msg) {
        if (!msg) return
        if (msg.startsWith('install_nodes is disabled')) {
            clearDownloads({ type: Types.Node })
        } else if (msg.startsWith('install_models is disabled')) {
            clearDownloads({ type: Types.Model })
        } else if (msg.startsWith('install_packages is disabled')) {
            clearDownloads({ type: Types.Package })
        }
    }
    
    function clearDownloads(opt) {
        if (opt?.type) {
            refDownloads.value = refDownloads.value.filter(x => x.type !== opt.type)
        } else {
            refDownloads.value.length = 0
        }
        saveDownloads()
        refShowDownloads.value = false
    }

    function removeDownload(fileOrUrl) {
        refDownloads.value = refDownloads.value.filter(x => x.fileName !== fileOrUrl && x.url !== fileOrUrl)
        saveDownloads()
    }

    function toggleShowDownloads(toggle=undefined) {
        if (typeof toggle === "boolean") {
            refShowDownloads.value = toggle
        } else {
            refShowDownloads.value = !refShowDownloads.value
        }
        if (!this.hasDownloads) {
            refShowDownloads.value = false
        }
        return refShowDownloads.value
    }

    function addDownload(download) {
        refDownloads.value = refDownloads.value.filter(x => x.url !== download.url && x.id !== download.id)
        if (!download.id) download.id = Date.now()
        if (!download.fileName) download.fileName = lastRightPart(download.url, '/')
        download.status = Status.Queued
        refDownloads.value.push(download)
        saveDownloads()

        if (download.type === Types.Model) {
            refUninstalls.value = refUninstalls.value.filter(x =>
                !(x.type === download.type && x.savePath === download.savePath && x.fileName === download.fileName))
        } else {
            refUninstalls.value = refUninstalls.value.filter(x =>
                !(x.type === download.type && x.url === download.url))
        }
        saveUninstalls()

        return download
    }
    
    function addUninstall(uninstall) {
        refUninstalls.value = refUninstalls.value.filter(x => x.url !== uninstall.url && x.id !== uninstall.id)
        if (!uninstall.id) uninstall.id = Date.now()
        if (!uninstall.fileName) uninstall.fileName = lastRightPart(uninstall.url, '/')
        uninstall.status = Status.Queued
        refUninstalls.value.push(uninstall)
        saveUninstalls()

        if (uninstall.type === Types.Model) {
            refDownloads.value = refDownloads.value.filter(x =>
                !(x.type === uninstall.type && x.savePath === uninstall.savePath && x.fileName === uninstall.fileName))
        } else {
            refDownloads.value = refDownloads.value.filter(x =>
                !(x.type === uninstall.type && x.url === uninstall.url))
        }
        saveDownloads()
        return uninstall
    }

    function saveUninstalls() {
        localStorage.setItem(uninstallKey, JSON.stringify(refUninstalls.value))
    }

    function hasInstalled(download) {
        const downloadPath = download.savePath + '/' + download.fileName
        return device.modelsSet.has(downloadPath)
    }
    
    function removeUninstall(url) {
        refUninstalls.value = refUninstalls.value.filter(x => x.url !== url)
        saveUninstalls()
    }

    async function installNode(node) {
        if (!node.url) {
            setError('No installation URL available for this node')
            return
        }

        setError()
        const api = await client.api(new InstallCustomNode({
            deviceId: device.deviceId,
            url: node.url
        }))

        if (api.error) {
            setError(api.error, `Failed to install node: ${node.name}`)
        } else {
            console.log('Node installation queued:', api.response?.result)
            addDownload({
                type: Types.Node,
                url: node.url,
                fileName: lastRightPart(node.url, '/'),
            })
        }
    }
    
    async function installCustomNode(dto) {
        setError()
        if (!dto.url) {
            setError('No installation URL was provided')
            return
        }
        const api = await client.api(dto)

        if (api.error) {
            setError(api.error, 'Failed to install custom node:')
            return false
        } else {
            addDownload({
                type: Types.Node,
                url: dto.url,
            })
            console.log('Custom Node download queued:', api.response?.result)
            return true
        }
    }

    async function uninstallNode(url) {
        const nodeName = store.urlToName(url)
        if (!confirm(`Are you sure you want to uninstall "${nodeName}"?`)) {
            return
        }

        setError()
        const api = await client.api(new UninstallCustomNode({
            deviceId,
            url,
        }))

        if (api.error) {
            setError(api.error, `Failed to uninstall node: ${nodeName}`)
        } else {
            console.log('Node uninstall queued:', api.response?.result)
            addUninstall({
                type: Types.Node,
                url,
            })
        }
    }
    
    function urlToNode(node) {
        return typeof node === 'string' ? {
            url: node.includes('://') 
                ? node 
                : combinePaths('https://github.com', node),
            name: store.urlToName(node),
        } : node
    }
    
    function isNodeInstalled(node) {
        node = urlToNode(node)
        if (node.url === 'https://github.com/comfyanonymous/ComfyUI') return true
        if (!device?.installedNodes) return false

        // Check if any of the node's files are in the installed nodes list
        return device.installedNodes.some(installedUrl =>
            installedUrl === node.url || installedUrl.includes(node.url))
    }

    function isNodeInstalling(node) {
        node = urlToNode(node)
        return !isNodeInstalled(node) && refDownloads.value.some(x => x.type === Types.Node && x.url === node.url)
    }

    function isNodeUninstalling(node) {
        node = urlToNode(node)
        return isNodeInstalled(node) && refUninstalls.value.some(x => x.type === Types.Node && x.url === node.url)
    }
    
    function updateDevice(update) {
        refDevice.value = Object.assign(refDevice.value, update)
        populateDevice(refDevice.value)
    }
    
    function populateDevice(device) {
        if (!device) alert(device)
        device.updated = (device.updated ?? 0) + 1
        device.modelsSet = store.getDeviceModelsSet(device)
        device.installedCustomNodes = (device.installedNodes ?? [])
            .filter(url => url !== 'https://github.com/ServiceStack/comfy-agent')
            .map(url => Object.assign({
                url,
                name: store.urlToName(url),
                nodes: [],
            }, store.customNodesMap[url]))
        device.installedNodes?.forEach(url => {
            removeUninstall(url)
        })
    }
    
    function isModelInstalled(assetPath) {
        return refDevice.value.modelsSet.has(assetPath)
    }
    
    function isModelInstalling(assetPath) {
        return !isModelInstalled(assetPath) && refDownloads.value.some(x => 
            x.type === Types.Model && x.savePath + '/' + x.fileName === assetPath)
    }

    function isModelUninstalling(fileName) {
        return refUninstalls.value.some(x => x.type === Types.Model && x.fileName === fileName)
    }

    async function installModel(model) {
        setError()
        const api = await client.api(new InstallAsset({
            deviceId,
            assetId: model.id,
        }))

        if (api.error) {
            setError(api.error, 'Failed to download model:')
        } else {
            addDownload({
                assetId: model.id,
                type: Types.Model,
                url: model.url,
                savePath: model.savePath,
                fileName: model.fileName,
            })
            console.log('Model download queued:', api.response?.result)
        }
    }
    
    async function installCustomModel(dto) {
        setError()
        const api = await client.api(dto)

        if (api.error) {
            setError(api.error, 'Failed to download model:')
            return false
        } else {
            addDownload({
                type: Types.Model,
                url: dto.url,
                savePath: dto.saveTo,
                fileName: dto.fileName,
            })
            console.log('Model download queued:', api.response?.result)
            return true
        }
    }

    // Delete model function
    async function deleteModel(path) {
        const fileName = lastRightPart(path, '/')
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return
        }

        setError()
        const api = await client.api(new DeleteModel({
            deviceId,
            path: path
        }))

        if (api.error) {
            setError(api.error, 'Failed to delete model:')
        } else {
            const savePath = leftPart(path, '/')
            const fileName = rightPart(path, '/')
            addUninstall({
                type: Types.Model,
                url: path,
                savePath,
                fileName,
            })
            console.log('Model deletion queued:', api.response?.result)
        }
    }
    
    async function updateModelSettings(model, modelSettings) {
        const request = new UpdateDevice({
            deviceId,
            addModelSettings: {
                [model]: modelSettings,
            },
        })

        const api = await client.api(request)
        if (api.error) {
            setError(api.error, 'Failed to update device:')
        } else {
            updateDevice(api.response)
        }
    }
    
    function modelMaxBatchSize(path) {
        const settings = refDevice.value.modelSettings?.[path]
        return settings?.maxBatchSize
    }
    function isModelHidden(path) {
        return modelMaxBatchSize(path) === 0
    }
    async function toggleModelHidden(path) {
        return await updateModelSettings(path, !isModelHidden(path) ? { 
            maxBatchSize: 0 
        } : null)
    }

    function isPackageInstalled(packageName) {
        return refDevice.value.installedPip?.includes(packageName)
    }
    function isPackageInstalling(packageName) {
        return !isPackageInstalled(packageName) && refDownloads.value.some(x =>
            x.type === Types.Package && x.url === packageName)
    }
    function isPackageUninstalling(packageName) {
        return refUninstalls.value.some(x => x.type === Types.Package && x.url === packageName)
    }

    async function installPackage(packageName) {
        setError()
        const api = await client.api(new InstallPipPackage({
            deviceId,
            package: packageName,
        }))

        if (api.error) {
            setError(api.error, `Failed to install package '${packageName}':`)
            return false
        } else {
            addDownload({
                type: Types.Package,
                url: packageName,
            })
            console.log('Package install queued:', api.response?.result)
            return true
        }
    }

    async function uninstallPackage(packageName) {

        if (!confirm(`Are you sure you want to uninstall "${packageName}"?`)) {
            return
        }

        setError()
        const api = await client.api(new UninstallPipPackage({
            deviceId,
            package:packageName,
        }))

        if (api.error) {
            setError(api.error, 'Failed to uninstall package:')
        } else {
            addUninstall({
                type: Types.Package,
                url: packageName,
            })
            console.log('Package uninstall queued:', api.response?.result)
        }
    }
    
    async function agentCommand(command, args) {
        console.log('store.agentCommand', deviceId, command, args)
        setStatus(`${command}ing...`)
        setError()
        const api = await client.api(new AgentCommand({
            deviceId,
            command,
        }))
        if (api.response) {
            setStatus(api.response?.result || `${command} queued...`)
        } else {
            setError(api.error, `Failed to ${command}:`)
        }
    }

    async function startMonitor() {
        console.log('startMonitor()')
        refMonitor.value = true

        if (refRunning.value) return
        refRunning.value = true
        try {

            console.log(`Started monitoring ${deviceId}...`)
            setError()
            const request = new GetDeviceStatus({
                deviceId,
            })

            const minWaitMs = 2000 //5s
            do {
                if (!refMonitor.value) return
                const device = refDevice.value
                let started = Date.now()
                const api = await client.api(request)
                if (api.error) {
                    setError(api.error)
                } else {
                    updateDevice(api.response)
                    //console.log('device models', JSON.stringify(device.models, null, 2))
                    // console.log('installedModels', JSON.stringify(device.models.embeddings))
                    console.log('installedNodes', JSON.stringify(device.installedNodes.filter(x => x.includes('Live'))))
                    //console.log('modelsSet', JSON.stringify([...device.modelsSet], null, 2))
                    //events.publish('deviceUpdated', device)
                    request.poll = true

                    if (api.response.status) {
                        request.statusChanged = api.response.status
                        setStatus(api.response.status || '')
                    }
                    if (api.response.error) {
                        setError(api.response.error)
                    }
                }

                const timeRemaining = minWaitMs - (Date.now() - started)
                if (timeRemaining > 0) {
                    await delay(timeRemaining)
                }
            } while (true)
        } catch (e) {
            console.error('Error monitoring device:', e)
        } finally {
            refRunning.value = false
            console.log(`Stopped monitoring ${deviceId}`)
        }
    }

    function stopMonitor() {
        console.log('stopMonitor()')
        refMonitor.value = false
    }
    
    return globalThis.installer = {
        get device() { return refDevice.value },
        get deviceId() { return refDevice.value?.deviceId },
        get monitoring() { return refMonitor.value },
        startMonitor,
        stopMonitor,
        registerCloseHandler,
        handleClose,
        
        refStatus,
        get status() { return refStatus.value ?? '' },
        setStatus,
        
        refError,
        get error() {
            if (refStatus.value === refError.value?.message) return null
            return refError.value 
        },
        setError,
        
        refDownloads,
        get downloads() { return refDownloads.value },
        get hasDownloads() { return refDownloads.value.length > 0 },
        addDownload,
        clearDownloads,
        hasInstalled,

        refShowDownloads,
        get showDownloads() { return this.hasDownloads && refShowDownloads.value },
        toggleShowDownloads,

        refUninstalls,
        get uninstalls() { return refUninstalls.value },
        addUninstall,
        removeUninstall,

        urlToNode,
        installNode,
        installCustomNode,
        uninstallNode,
        isNodeInstalled,
        isNodeInstalling,
        isNodeUninstalling,

        installModel,
        installCustomModel,
        deleteModel,
        isModelInstalled,
        isModelInstalling,
        isModelUninstalling,
        isModelHidden,
        toggleModelHidden,
        modelMaxBatchSize,
        updateModelSettings,

        installPackage,
        uninstallPackage,
        isPackageInstalled,
        isPackageInstalling,
        isPackageUninstalling,
        
        agentCommand,
    }
}