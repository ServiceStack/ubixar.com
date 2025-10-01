import { reactive, ref, toRaw } from "vue"
import { useAuth, useFormatters } from "@servicestack/vue"
import { JsonServiceClient, ApiResult, combinePaths, rightPart, lastRightPart } from "@servicestack/client"
import { openDB, deleteDB, wrap, unwrap } from '/lib/mjs/idb.mjs'
import { toJsonObject, sortByCreatedDesc, getRatingDisplay, getHDClass, toJsonArray, storageArray } from "./utils.mjs"

import {
    QueryWorkflows,
    GetWorkflowInfo,
    GetWorkflowVersion,
    QueryWorkflowVersions,
    MyWorkflowGenerations,
    DeleteMyWorkflowGeneration,
    HardDeleteWorkflowGeneration,
    MyThreads,
    CreateThread,
    UpdateThread,
    DeleteThread,
    UpdateGenerationAsset,
    PinWorkflowGenerationArtifact,
    DeleteWorkflowGenerationArtifact,
    UpdatePreferences,
    GetWorkflowGeneration,
    PublishGeneration,
    MoveGeneration,
    GetDeletedRows,
    MyArtifactReactions,
    CreateArtifactReaction,
    DeleteArtifactReaction,
    MyWorkflowVersionReactions,
    CreateWorkflowVersionReaction,
    DeleteWorkflowVersionReaction,
    WaitForMyWorkflowGenerations,
    PinToWorkflowVersion,
    FeatureArtifact,
    UnFeatureArtifact,
    RemoveDevice,
    QueryArtifacts,
    DevicePool,
    MyDevices,
    QueryAssets,
    AgentCommand, 
    MyInfo,
    Rating,
    Table, 
} from "../../mjs/dtos.mjs"

const { truncate } = useFormatters()

export const AssetsBasePath = globalThis.AssetsBasePath = globalThis.Server?.app.baseUrl ?? location.origin
export const DefaultRatings = ['PG', 'PG13']

export class CacheEntry {
    id;      // number autoIncrement
    type;    // string
    value;   // string blob
    expires; // number Date
}
export const AppDatabase = 'ComfyApp'
export const UserDatabase = 'ComfyUser'

const AppTables = {
    Workflow: 'Workflow',
    WorkflowVersion: 'WorkflowVersion',
    Artifact: 'Artifact',
    Asset: 'Asset',
    DeletedRow: 'DeletedRow',
    Cache: 'Cache',
}
const UserTables = {
    WorkflowGeneration: 'WorkflowGeneration',
    Thread: 'Thread',
    ThreadReaction: 'ThreadReaction',
    ArtifactReaction: 'ArtifactReaction',
    CommentReaction: 'CommentReaction',
    WorkflowVersionReaction: 'WorkflowVersionReaction',
    Achievement: 'Achievement',
}
export const Tables = {
    ...AppTables,
    ...UserTables,
}

const Errors = {
    NotAuthenticated: new ApiResult({ error: { errorCode: 'NotAuthenticated', message: 'Not Authenticated' } }),
    NotAdmin: new ApiResult({ error: { errorCode: 'Forbidden', message: 'Operation not allowed' } }), 
}

function createStore(db, table, createOptions, storeOptions) {
    const store = db.createObjectStore(table, createOptions)
    if (storeOptions) {
        if (Array.isArray(storeOptions.indexes)) {
            storeOptions.indexes.forEach(index => store.createIndex(index, index))
        }
    }
    return store
}

const take = 500

let o = {
    AssetsBasePath,
    Tables,
    user: null,
    appConfig: null, // populated in VueApp.razor
    _init: false,
    initializing: false,
    staticRender: null,
    _dbApp: null,
    _dbUser: null,
    _client: new JsonServiceClient(),
    events: null,
    router: null,
    prefs: null,
    workflowGenerationCount: 0,
    threadCount: 0,
    usedSeeds:[],
    threads:[],
    workflows:[],
    workflowVersions:[],
    selectedThread: null,
    selectedWorkflowArgs: null,
    threadGenerations:[],
    hiddenImages:[],
    //generations:[],
    selectedRatings:DefaultRatings,
    /** @type {{ [index:number]: number; }} */
    threadUnpublishedCount: {},
    /** @type {{ [index:string]: string; }} */
    lastModified:{},
    cursors: {},
    /** @type {{ [index:string]: number[]; }} */
    artifactReactions:{},
    /** @type {{ [index:string]: number[]; }} */
    workflowVersionReactions:{},
    /** @type {AchievementInfo[]} */

    /** @type {AgentInfo[]} */
    poolDevices: [],
    /** @type {AgentInfo[]} */
    myDevices: [],
    /** @type {AgentInfo[]} */
    allDevices: [],
    customNodes: [],
    customNodesMap: {},
    deviceDownloads: {},
    deviceUninstalls: {},
    
    async init(client, events, router) {
        console.log('store.init', this._init, useAuth().user?.value?.userName)
        if (this._init) return
        this._client = client
        this.events = events
        this.router = router

        this.user = useAuth().user?.value
        const prevUser = toJsonObject(localStorage.getItem('gateway:user'))
        if (this.user) // Allow anonymous browsing without nuking cache
        {
            localStorage.setItem('gateway:user', JSON.stringify(this.user))
            if (!prevUser || !this.user || prevUser.userId !== this.user.userId) {
                console.log('User changed, clearing db', prevUser, this.user)
                await this.clearUserDb()
            }
        }

        this.prefs = toJsonObject(localStorage.getItem(this.prefsKey)) ?? {
            isOver18: false,
            sortBy: '-createdDate',
        }
        this.selectedWorkflowArgs = toJsonObject(localStorage.getItem(this.workflowArgsKey))
        this.cursors = toJsonObject(localStorage.getItem(this.cursorsKey)) ?? {
            deletedRow: undefined,
        }
        
        this.info = globalThis.info ?? {}
        this.appConfig = globalThis.appConfig ?? {}

        await this.openAppDb()
        if (this.user) {
            await this.openUserDb()
        } else {
            await this.clearUserDb()
            try {
                await this.recreateUserDb()
            } catch {}
            if (!this._dbUser) console.log('Failed to open user db')
        }
        this.reload()
        this._init = true
    },

    get userId() { return this.user?.userId },
    get isAdmin() { return this.user?.roles?.includes('Admin') },
    get prefsKey() { return `gateway:${this.user?.userName ?? 'anon'}:prefs` },
    get workflowArgsKey() { return `gateway:${this.user?.userName ?? 'anon'}:workflow` },
    get ratingsKey() { return `gateway:${this.user?.userName ?? 'anon'}:ratings` },
    get cursorsKey() { return `gateway:${this.user?.userName ?? 'anon'}:cursors` },

    db(table) { return table in AppTables ? this._dbApp : this._dbUser },
    transaction(table,mode=undefined) { 
        return table in AppTables ? this._dbApp?.transaction(table,mode) : this._dbUser?.transaction(table,mode) 
    },
    getAll(table) { return this.db(table).getAll(table) },
    get(table,key) { return this.db(table).get(table,key) },
    put(table,row) { return this.db(table).put(table,row) },
    
    /** @param {{ skip?: number, take?: number, filter?: (row: any) => boolean, index?: string }} [args] 
     * Example:
     * let r = await store.query('Artifact', { skip: 5, take: 10, index:'-' })      // sort descending by id/key
     * let r = await store.query('Artifact', { skip: 5, take: 10, index:'-type' })  // sort descending by index 'type' 
     * */
    async query(table, { skip, take, filter, index }) { 
        let i = 0
        const results = []
        const tx = this.transaction(table)

        let txCursor = null
        if (index) {
            let direction = 'next'
            if (index.startsWith('-')) {
                index = index.substring(1)
                direction = 'prev'
            }
            const txIndex = index
                ? tx.store.index(index)
                : tx.store
            txCursor = direction === 'prev'
                ? await txIndex.openCursor(null, direction)
                : await txIndex.openCursor()
            // console.log('txCursor', txIndex, direction === 'prev', txCursor)
        } else {
            txCursor = tx.store
        }
        
        if (!txCursor) {
            console.log(table, 'is empty, txCursor is null', table, index)
            return []
        }
        
        for await (const cursor of txCursor) {
            if (filter && !filter(cursor.value)) continue
            if (i++ < skip) continue
            const row = cursor.value
            results.push(row)
            if (results.length >= take) break
        }
        return results
    },
    
    async openAppDb() {
        console.log('openAppDb', AppDatabase)
        this._dbApp = await openDB(AppDatabase, 1, {
            upgrade(db) {
                // App Tables
                createStore(db, Tables.Workflow, { keyPath: 'id' }, {
                    indexes: ['createdBy', 'createdDate', 'modifiedDate']
                })
                createStore(db, Tables.WorkflowVersion, { keyPath: 'id' }, {
                    indexes: ['parentId', 'modifiedDate']
                })
                createStore(db, Tables.Artifact, { keyPath: 'id' }, {
                    indexes: ['type', 'generationId', 'createdBy', 'createdDate']
                })
                createStore(db, Tables.Asset, { keyPath: 'id' }, {
                    indexes: ['name', 'type', 'base', 'modifiedBy', 'modifiedDate']
                })
                createStore(db, Tables.DeletedRow, { keyPath: 'id' })
                createStore(db, Tables.Cache, { keyPath: 'id' })
            },
            blocked(currentVersion, blockedVersion, event) {
                console.log('Database blocked - close all connections first', event);
            },
            blocking(currentVersion, blockedVersion, event) {
                console.log('Database blocking - close all connections first', event);
            },
            terminated() {
                console.log('Database terminated - close all connections first');
            },
        })
    },
    
    async openUserDb() {
        console.log('openUserDb', UserDatabase)
        this._dbUser = await openDB(UserDatabase, 1, {
            upgrade(db) {
                // Tables scoped to user
                createStore(db, Tables.WorkflowGeneration, { keyPath: 'id' }, {
                    indexes: ['modifiedDate', 'userId', 'threadId', 'workflowId', 'output', 'checkpoint', 'lora']
                })
                createStore(db, Tables.Thread, { keyPath: 'id' }, {
                    indexes: ['createdBy', 'createdDate', 'modifiedDate']
                })
                createStore(db, Tables.Achievement, { keyPath: 'id' }, {
                })
                createStore(db, Tables.ThreadReaction, { keyPath: 'id' }, {
                    indexes: ['t']
                })
                createStore(db, Tables.ArtifactReaction, { keyPath: 'id' }, {
                    indexes: ['a']
                })
                createStore(db, Tables.CommentReaction, { keyPath: 'id' }, {
                    indexes: ['c']
                })
                createStore(db, Tables.WorkflowVersionReaction, { keyPath: 'id' }, {
                    indexes: ['v']
                })
            },
            blocked(currentVersion, blockedVersion, event) {
                console.error('Database blocked - close all connections first', event);
            },
            blocking(currentVersion, blockedVersion, event) {
                console.error('Database blocking - close all connections first', event);
            },
            terminated() {
                console.error('Database terminated - close all connections first');
            },
        })
    },

    async clearAppDb() {
        console.log('clearAppDb')
        await this.clearAllObjectStores(UserDatabase)
    },

    async clearUserDb() {
        console.log('clearUserDb')
        await this.clearAllObjectStores(UserDatabase)
    },

    clearAllObjectStores(dbName) {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open(dbName);
            openRequest.onsuccess = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames?.length) {
                    resolve('No object stores found');
                    return;
                }
                const tx = db.transaction(db.objectStoreNames, 'readwrite');
    
                // Clear each object store
                for (let storeName of db.objectStoreNames) {
                    const store = tx.objectStore(storeName);
                    store.clear();
                }
                tx.oncomplete = function() {
                    db.close();
                    resolve('All object stores cleared');
                };
                tx.onerror = function() {
                    db.close();
                    reject('Error clearing object stores');
                };
            };
            openRequest.onerror = function() {
                reject('Error opening database');
            };
        });
    },
    
    async resetAndDestroy() {
        console.log('resetAndDestroy')
        Object.keys(localStorage)
            .filter(x => x.startsWith('gateway:') || x === '/metadata/app.json')
            .forEach(x => localStorage.removeItem(x))
        await this.recreateAppDb()
        await this.recreateUserDb()
    },

    async recreateAppDb() {
        if (this._dbApp) {
            this._dbApp.close()
            this._dbApp = null
        }
        // Request to delete the database
        await this.recreateDb(AppDatabase, () => this.openAppDb())
    },

    async recreateUserDb() {
        if (this._dbUser) {
            this._dbUser.close()
            this._dbUser = null
        }
        // Request to delete the database
        await this.recreateDb(UserDatabase, () => this.openUserDb())
    },

    async recreateDb(dbName, openDb) {
        console.log('recreateDb', dbName)
        return new Promise((resolve, reject) => {
            // Step 1: Delete the database
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => {
                console.log('Database deleted successfully')
                // Step 2: Recreate immediately after successful deletion
                if (openDb) {
                    openDb().then(resolve).catch(reject)
                }
            }
            deleteReq.onerror = (event) => {
                reject(event.target.error);
            }
            deleteReq.onblocked = () => {
                console.warn('Delete blocked - close all tabs/connections');
                reject(new Error('Database deletion blocked'));
            };
        })
    },

    async reload() {
        console.log('store.reload()')
        const db = this.db(Tables.WorkflowGeneration)
        // Only show initializing screen if we don't have any generations
        const hasGenerations = Array.from(this._dbUser?.objectStoreNames ?? []).includes(Tables.WorkflowGeneration) && db 
            ? (await db.count(Tables.WorkflowGeneration) ?? 0) > 0 
            : false
        this.initializing = !hasGenerations

        this.selectedRatings = this.loadSelectedRatings()
        const tasks = [
            this.loadWorkflowsAndVersions(),
            this.processDeletedRows(),
            this.loadPoolDevices(),
            this.loadMyDevices(),
            this.loadAssets(),
            this.loadCustomNodes(),
        ]
        if (this.user) {
            tasks.push(
                this.loadThreads(),
                this.loadMyGenerations(),
                this.loadMyArtifactReactions(),
                this.loadMyWorkflowVersionReactions(),
            )
        }
        await Promise.all(tasks)
        this.initializing = false
    },

    async loadWorkflows() {
        // Get last modified workflow
        const afterModifiedDate = await this.getLastModified(Tables.Workflow)

        // Query for any new or modified workflows
        const request = afterModifiedDate
            ? new QueryWorkflows({ afterModifiedDate })
            : new QueryWorkflows()

        const api = await this._client.api(request)
        if (api.response?.results) {
            // save to IndexedDB
            const tx = this.transaction(Tables.Workflow, 'readwrite')
            await Promise.all(api.response.results.map(x => tx.store.put(x)))
            await tx.done
        }
    },

    async loadWorkflowVersions() {
        // Get last modified workflow version
        const afterModifiedDate = await this.getLastModified(Tables.WorkflowVersion)

        // Query for any new or modified workflows
        const request = afterModifiedDate
            ? new QueryWorkflowVersions({ afterModifiedDate })
            : new QueryWorkflowVersions()

        const api = await this._client.api(request)
        if (api.response?.results) {
            // save to IndexedDB
            const tx = this.transaction(Tables.WorkflowVersion, 'readwrite')
            await Promise.all(api.response.results.map(x => tx.store.put(x)))
            await tx.done
        }
        this.workflowVersions = await this.getWorkflowVersions()
    },

    async loadWorkflowsAndVersions() {
        await Promise.all([
            this.loadWorkflows(),
            this.loadWorkflowVersions(),
        ])
        
        const workflows = await this.getWorkflows()
        const workflowVersions = await this.getWorkflowVersions()
        workflows.forEach(x => {
            x.versions = workflowVersions.filter(y => y.parentId === x.id)
            x.version = x.versions.find(y => y.id === x.pinVersionId)
                ?? x.versions[0]
            if (x.version) {
                x.version.name ??= x.name
            }
        })
        this.workflows = workflows.filter(x => x.version)
        this.workflows.sort((a, b) => b.version.reactionsCount - a.version.reactionsCount)
    },
    
    async loadAssets() {
        let afterModifiedDate = await this.getLastModified(Tables.Asset)
        const orderBy = 'modifiedDate' 
        const request = afterModifiedDate
            ? new QueryAssets({ afterModifiedDate, orderBy })
            : new QueryAssets({ orderBy })

        const api = await this._client.api(request)
        if (api.response?.results) {
            // save to IndexedDB
            const tx = this.transaction(Tables.Asset, 'readwrite')
            await Promise.all(api.response.results.map(x => tx.store.put(x)))
            await tx.done
        }
    },

    async processDeletedRows() {
        const lastDeletedRowId = this.cursors.deletedRow
        const request = lastDeletedRowId
            ? new GetDeletedRows({ afterId: lastDeletedRowId })
            : new GetDeletedRows()
        
        let api = null
        
        do {
            api = await this._client.api(request)
            if (api.response?.results) {
                for (const row of api.response.results) {
                    await this.deleteRow(row)
                    if (!request.afterId || row.id > request.afterId) {
                        request.afterId = row.id
                    }
                }
            }
        } while (api?.response?.results?.length >= 1000)
        
        this.cursors.deletedRow = api.response?.lastId ?? request.afterId
        await this.saveCursors()
    },
    
    async deleteRow(row) {
        const table = Table[row.table]
        if (table in Tables) {
            console.log('deleteRow', row.table, row.key, row.id)
            const tx = this.transaction(table, 'readwrite')
            if (!tx) return
            await tx.store.delete(row.key)
            await tx.done
        } else {
            console.error('Unknown table', row.table, table)
        }
    },
    saveCursors() {
        localStorage.setItem(this.cursorsKey, JSON.stringify(this.cursors))
    },

    // Get last modified row
    async getLastModified(table) {
        const lastCursor = await this.transaction(table)
            .objectStore(table)
            .index('modifiedDate')
            .openCursor(null, 'prev')
        return lastCursor?.value.modifiedDate
    },

    async getLastId(table) {
        const lastCursor = await this.transaction(table)
            .objectStore(table)
            .openCursor(null, 'prev') // by default openCursor() returns results in ascending key order
        return lastCursor?.value.id
    },

    async markNotificationsAsRead() {
        const lastReadNotificationId = this.info.latestNotifications[0]?.id
        if (lastReadNotificationId) {
            const api = await this._client.api(new UpdatePreferences({ lastReadNotificationId }))
            if (api.succeeded) {
                await this.loadMyInfo()
            }
            return api
        }
    },

    async markAchievementsAsRead() {
        const lastReadAchievementId = this.info.latestAchievements[0]?.id
        if (lastReadAchievementId) {
            const api = await this._client.api(new UpdatePreferences({ lastReadAchievementId }))
            if (api.succeeded) {
                await this.loadMyInfo()
            }
            return api
        }
    },

    async loadMyInfo() {
        const api = await this._client.api(new MyInfo())
        if (api.succeeded) {
            this.info = api.response
        }
        return api
    },

    async goto(href, cb) {
        if (href) {
            if (cb) cb()
            if (this.staticRender == null) {
                this.staticRender = !document.getElementById('app')
            }
            if (!this.staticRender && this.router && href.indexOf('://') === -1) {
                this.router.push(href)
            } else {
                location.href = href
            }
        }
    },

    async loadMyArtifactReactions() {
        // Get last ArtifactReaction
        let afterId = await this.getLastId(Tables.ArtifactReaction)
        const orderBy = 'id'

        console.log('loadMyArtifactReactions', afterId)

        // Query for any new MyArtifactReactions
        const request = afterId
            ? new MyArtifactReactions({ afterId, take, orderBy })
            : new MyArtifactReactions({ take, orderBy })

        let lastId = afterId
        let i = 0
        while (true) {
            const api = await this._client.api(request)
            if (api.error) {
                console.error('Error loading MyArtifactReactions', api.error)
                break
            }
            if (api.response.results) {
                // save to IndexedDB
                const tx = this.transaction(Tables.ArtifactReaction, 'readwrite')
                await Promise.all(api.response.results.map(x => tx.store.put(x)))
                await tx.done
            }
            if (api.response.results.length < take) break
            afterId = await this.getLastId(Tables.ArtifactReaction)
            if (afterId === lastId) {
                console.log('loadMyArtifactReactions: no more reactions')
                break
            }
            console.log('loadMyArtifactReactions', i++, afterId, request.afterId, afterId === request.afterId)
            lastId = request.afterId
            request.afterId = afterId
        }
        
        const allReactions = await this.getAll(Tables.ArtifactReaction)
        const reactionsMap = {}
        for (const reaction of allReactions) {
            reactionsMap[reaction.a] ??= []
            reactionsMap[reaction.a].push(String.fromCodePoint(reaction.r))
        }
        this.artifactReactions = reactionsMap
    },

    hasArtifactReaction(artifactId, reaction) {
        return this.artifactReactions[artifactId]?.includes(reaction)
    },

    async loadMyWorkflowVersionReactions() {
        // Get last ArtifactReaction
        let afterId = await this.getLastId(Tables.WorkflowVersionReaction)
        const orderBy = 'id'

        console.log('loadMyWorkflowVersionReactions', afterId)

        // Query for any new MyArtifactReactions
        const request = afterId
            ? new MyWorkflowVersionReactions({ afterId, take, orderBy })
            : new MyWorkflowVersionReactions({ take, orderBy })

        let lastId = afterId
        let i = 0
        while (true) {
            const api = await this._client.api(request)
            if (api.error) {
                console.error('Error loading MyWorkflowVersionReactions', api.error)
                break
            }
            if (api.response.results) {
                // save to IndexedDB
                const tx = this.transaction(Tables.WorkflowVersionReaction, 'readwrite')
                await Promise.all(api.response.results.map(x => tx.store.put(x)))
                await tx.done
            }
            if (api.response.results.length < take) break
            afterId = await this.getLastId(Tables.WorkflowVersionReaction)
            if (afterId === lastId) {
                console.log('MyWorkflowVersionReactions: no more reactions')
                break
            }
            console.log('MyWorkflowVersionReactions', i++, afterId, request.afterId, afterId === request.afterId)
            lastId = request.afterId
            request.afterId = afterId
        }

        const allReactions = await this.getAll(Tables.WorkflowVersionReaction)
        const reactionsMap = {}
        for (const reaction of allReactions) {
            reactionsMap[reaction.v] ??= []
            reactionsMap[reaction.v].push(String.fromCodePoint(reaction.r))
        }
        this.workflowVersionReactions = reactionsMap
        
        await this.loadWorkflowsAndVersions()
    },
    hasWorkflowVersionReaction(versionId, reaction) {
        return this.workflowVersionReactions[versionId]?.includes(reaction)
    },

    redirectToSignIn() {
        location.href = '/Account/Login?returnUrl=' + encodeURIComponent(location.href)
        return Errors.NotAuthenticated
    },
    
    redirectedAnonUser() {
        if (!this.user) {
            this.redirectToSignIn()
            return true
        }
        return false
    },
    
    async toggleArtifactReaction(artifactId, reactionChar) {
        if (this.redirectedAnonUser()) return
        
        const hasReaction = this.hasArtifactReaction(artifactId, reactionChar)
        const reaction = reactionChar.codePointAt(0)
        const request = hasReaction
            ? new DeleteArtifactReaction({ artifactId, reaction })
            : new CreateArtifactReaction({ artifactId, reaction })
        const api = await this._client.api(request)
        if (api.succeeded) {
            if (hasReaction) {
                this.artifactReactions[artifactId] = this.artifactReactions[artifactId].filter(x => x !== reaction)
                const allReactions = await this.getAll(Tables.ArtifactReaction)
                const findReaction = allReactions.find(x => x.a === artifactId && x.r === reaction)
                if (findReaction) {
                    const tx = this.transaction(Tables.ArtifactReaction, 'readwrite')
                    await tx.store.delete(findReaction.id)
                    await tx.done
                }
            }
            await this.loadMyArtifactReactions()
        }
        return api
    },

    async toggleWorkflowVersionReaction(versionId, reactionChar) {
        if (this.redirectedAnonUser()) return

        const hasReaction = this.hasWorkflowVersionReaction(versionId, reactionChar)
        console.log('toggleWorkflowVersionReaction', versionId, reactionChar, hasReaction)
        const reaction = reactionChar.codePointAt(0)
        const request = hasReaction
            ? new DeleteWorkflowVersionReaction({ versionId, reaction })
            : new CreateWorkflowVersionReaction({ versionId, reaction })
        const api = await this._client.api(request)
        if (api.succeeded) {
            if (hasReaction) {
                this.workflowVersionReactions[versionId] = this.workflowVersionReactions[versionId].filter(x => x !== reaction)
                const allReactions = await this.getAll(Tables.WorkflowVersionReaction)
                const findReaction = allReactions.find(x => x.v === versionId && x.r === reaction)
                if (findReaction) {
                    const tx = this.transaction(Tables.WorkflowVersionReaction, 'readwrite')
                    await tx.store.delete(findReaction.id)
                    await tx.done
                }
            }
            await this.loadMyWorkflowVersionReactions()
        }
        return api
    },
    
    async findArtifact(artifactId) {
        return await this.get(Tables.Artifact, artifactId)
    },
    
    async getArtifact(artifactId) {
        const api = await this._client.api(new QueryArtifacts({ id: artifactId }))
        return api.response?.results?.[0]
    },

    async loadMyGenerations() {
        if (!this.user) return
        let afterModifiedDate = await this.getLastModified(Tables.WorkflowGeneration)
        const orderBy = 'modifiedDate' 
        
        console.log('loadMyGenerations', afterModifiedDate)

        // Query for any new or modified workflows
        const request = afterModifiedDate
            ? new MyWorkflowGenerations({ afterModifiedDate, orderBy, take })
            : new MyWorkflowGenerations({ orderBy, take })

        let lastModifiedDate = afterModifiedDate
        let i = 0
        while (true) {
            const api = await this._client.api(request)
            if (api.error) {
                console.error('Error loading my generations', api.error)
                break
            }
            if (api.response.results) {
                // save to IndexedDB
                const tx = this.transaction(Tables.WorkflowGeneration, 'readwrite')
                await Promise.all(api.response.results.map(x => tx.store.put(x)))
                await tx.done
            }
            if (api.response.results.length < take) break
            afterModifiedDate = await this.getLastModified(Tables.WorkflowGeneration)
            if (afterModifiedDate === lastModifiedDate) {
                console.log('loadMyGenerations: no modified generations')
                break
            }
            console.log('loadMyGenerations', i++, afterModifiedDate, request.afterModifiedDate,
                afterModifiedDate === request.afterModifiedDate)
            lastModifiedDate = request.afterModifiedDate
            request.afterModifiedDate = afterModifiedDate
        }
        this.workflowGenerationCount = await this.db(Tables.WorkflowGeneration).count(Tables.WorkflowGeneration)

        // Populate aggregate data from all generations
        this.usedSeeds = []
        this.threadUnpublishedCount = {}
        for (const gen of await this.getAll(Tables.WorkflowGeneration)) {
            if (!gen.error && gen.result && !gen.publishedDate) {
                this.threadUnpublishedCount[gen.threadId] = (this.threadUnpublishedCount[gen.threadId] ?? 0) + 1
            }
            if (gen.args?.seed) {
                this.usedSeeds.push(gen.args.seed)
            }
            if (gen.args?.noise_seed) {
                this.usedSeeds.push(gen.args.noise_seed)
            }
        }
        await this.loadThreadGenerations()
    },
    
    async waitForMyWorkflowGenerations({ afterModifiedDate, threadId }) {
        afterModifiedDate ??= await store.getLastModified(Tables.WorkflowGeneration)
        const request = new WaitForMyWorkflowGenerations({ afterModifiedDate, threadId })
        const api = await this._client.api(request)
        const updatedGenerations = api.response?.results
        if (updatedGenerations?.length) {
            console.log(`myWorkflowGenerations: results=${Object.keys(updatedGenerations.map(x => `${x.id}: ${x.statusUpdate}`)).join(',')}`)
            // save to IndexedDB
            await this.addGenerations(api.response.results)
        }
        await this.loadMyGenerations()
        return api
    },

    async loadThreadGenerations() {
        const results = this.selectedThread
            ? Array.from(await this.getThreadGenerations(this.selectedThread.id))
            : []
        this.threadGenerations = sortByCreatedDesc(results)
        console.log('selectThread', this.selectedThread, this.threadGenerations.length, 'generations')
    },
    
    async selectThread(threadId) {
        if (!threadId) {
            console.log('selectThread: clear')
            this.selectedThread = null
            this.threadGenerations = []
            return
        }
        const id = Number(threadId)
        this.selectedThread = await this.getThread(id)
        console.log('selectThread', id, this.selectedThread)
        await this.loadThreadGenerations()
        return this.selectedThread
    },
    
    async getThreadGenerations(threadId) {
        const index = this.transaction(Tables.WorkflowGeneration).store.index('threadId')
        return await index.getAll(threadId)
    },

    async loadThreads() {
        const afterModifiedDate = await this.getLastModified(Tables.Thread)

        // Query for any new or modified threads
        const request = afterModifiedDate
            ? new MyThreads({ afterModifiedDate })
            : new MyThreads()

        const api = await this._client.api(request)
        if (api.response?.results) {
            // save to IndexedDB
            const tx = this.transaction(Tables.Thread, 'readwrite')
            await Promise.all(api.response.results.map(x => tx.store.put(x)))
            await tx.done
        }
        this.threads = sortByCreatedDesc(await this.getThreads())
        this.threadCount = this.threads.length
    },

    async getThreads() {
        return Array.from(await this.getAll(Tables.Thread))
    },
    async getThread(threadId) {
        return await this.get(Tables.Thread, Number(threadId))
    },
    async createThread(thread) {
        const api = await this._client.api(new CreateThread(thread))
        const newThread = api.response
        if (newThread) {
            const tx = this.transaction(Tables.Thread, 'readwrite')
            await tx.store.put(newThread)
            await tx.done
            await this.loadThreads()
        }
        return api
    },
    async updateThread(request) {
        const api = await this._client.api(new UpdateThread(request))
        const updatedThread = api.response
        if (updatedThread) {
            const tx = this.transaction(Tables.Thread, 'readwrite')
            await tx.store.put(updatedThread)
            await tx.done
            await this.loadThreads()
        }
        return api
    },
    async deleteThread(threadId) {
        console.log('deleteThread', threadId)
        const id = Number(threadId)
        const api = await this._client.apiVoid(new DeleteThread({ id }))
        const tx = this.transaction(Tables.Thread, 'readwrite')
        await tx.store.delete(id)
        await tx.done
        await this.loadThreads()
        return api
    },

    async getWorkflows() {
        return await this.getAll(Tables.Workflow)
    },
    async getWorkflow(workflowId) {
        return await this.get(Tables.Workflow, Number(workflowId))
    },
    async getWorkflowVersions() {
        return await this.getAll(Tables.WorkflowVersion)
    },
    async getWorkflowGenerations() {
        return await this.getAll(Tables.WorkflowGeneration)
    },
    async getAssets() {
        return await this.getAll(Tables.Asset)
    },
    async findWorkflowGeneration(generationId) {
        const gen = await this.get(Tables.WorkflowGeneration, generationId)
        if (gen) return gen
        const api = await this._client.api(new GetWorkflowGeneration({
            id: generationId,
        }))
        return api.response?.result
    },
    async getWorkflowGeneration(generationId,cached=false) {
        const api = await this._client.api(new GetWorkflowGeneration({
            id: generationId,
        }))
        return api
    },
    async addGeneration(generation) {
        const tx = this.transaction(Tables.WorkflowGeneration, 'readwrite')
        await tx.store.put(generation)
        await tx.done
    },
    async addGenerations(generations) {
        const tx = this.transaction(Tables.WorkflowGeneration, 'readwrite')
        await Promise.all(generations.map(x => tx.store.put(x)))
        await tx.done
    },
    async deleteGenerationFromDb(id) {
        const tx = this.transaction(Tables.WorkflowGeneration, 'readwrite')
        await tx.store.delete(id)
        await tx.done
    },

    async deleteWorkflowGeneration(generationId) {
        const id = generationId
        const api = this.isAdmin
            ? await this._client.api(new HardDeleteWorkflowGeneration({ id }))
            : await this._client.api(new DeleteMyWorkflowGeneration({ id }))
        if (api.succeeded) {
            await this.deleteGenerationFromDb(id)
            await Promise.all([
                this.loadMyGenerations(),
                this.processDeletedRows(),
            ])
        }
        return api
    },

    async removeGenerationAssets(generationId) {
        const tx = this.transaction(Tables.Artifact, 'readwrite')
        // Delete all Artifacts with this generationId using the generationId index
        const index = tx.store.index('generationId')
        let cursor = await index.openCursor(generationId)
        while (cursor) {
            await cursor.delete()
            cursor = await cursor.continue()
        }
        await tx.done
    },
    
    async getWorkflowVersion(versionId) {
        let ret = await this.get(Tables.WorkflowVersion, Number(versionId))
        if (ret) return ret
        const api = await this._client.api(new GetWorkflowVersion({ versionId }))
        ret = api.response?.result
        if (ret) {
            await this.put(Tables.WorkflowVersion, ret)
        }
        return ret
    },
    async getWorkflowVersionByWorkflowId(workflowId) {
        let ret = await this.get(Tables.WorkflowVersion, Number(workflowId))
        if (ret) return ret
        const api = await this._client.api(new GetWorkflowVersion({ workflowId }))
        ret = api.response?.result
        if (ret) {
            await this.put(Tables.WorkflowVersion, ret)
        }
        return ret
    },

    async updateGenerationAsset(generation, artifact, args) {
        //Object.assign(asset, args)
        const request = new UpdateGenerationAsset({
            generationId: generation.id,
            assetUrl: artifact.url,
            ...args,
        })
        const asset = generation.result.assets.find(x => x.url === artifact.url)
        Object.assign(asset, args)
        const api = this._client.api(request)
        if (api.succeeded) {
            await this.loadMyGenerations()
        }
        return api
    },

    async pinPosterImage(generation, assetUrl) {
        const api = await this._client.api(new PinWorkflowGenerationArtifact({
            generationId: generation.id,
            assetUrl,
        }))
        if (api.succeeded) {
            await this.loadMyGenerations()
        }
        return api
    },
    
    async pinWorkflowPoster(versionId, posterImage) {
        if (!this.isAdmin) return Errors.NotAdmin
        const api = await this._client.api(new PinToWorkflowVersion({ versionId, posterImage }))
        if (api.succeeded) {
            await this.loadWorkflowsAndVersions()
        }
        return api
    },
    
    isArtifactFeatured(artifact) {
        // If no featured users, all artifacts are featured
        if (!this.appConfig?.featuredUserIds?.length) {
            return true
        }
        return this.appConfig.featuredUserIds.includes(artifact.publishedBy)
    },

    async featureArtifact(artifact) {
        if (!this.isAdmin) return Errors.NotAdmin
        const artifactId = artifact.id
        const api = await this._client.api(new FeatureArtifact({ artifactId }))
        if (api.succeeded) {
            artifact.publishedBy = api.response.publishedBy
            await this.saveArtifacts([api.response])
            console.log('featureArtifact', artifactId, artifact.publishedBy, 
                this.appConfig?.featuredUserIds, this.isArtifactFeatured(artifact))
        }
        return api
    },

    isArtifactUnFeatured(artifact) {
        return this.appConfig?.systemUserId === artifact.publishedBy
    },

    async unFeatureArtifact(artifact) {
        if (!this.isAdmin) return Errors.NotAdmin
        const artifactId = artifact.id
        const api = await this._client.api(new UnFeatureArtifact({ artifactId }))
        if (api.succeeded) {
            artifact.publishedBy = api.response.publishedBy
            await this.saveArtifacts([api.response])
        }
        return api
    },

    async deleteWorkflowGenerationArtifact(generation, asset) {
        const api = await this._client.api(new DeleteWorkflowGenerationArtifact({
            generationId: generation.id,
            assetUrl: asset.url,
        }))
        if (api.response) {
            if (api.response.deletedDate) {
                // Remove the generation from the db
                await this.deleteGenerationFromDb(generation.id)
            }
            // Reload the generations
            await this.loadMyGenerations()
        }
        return api
    },

    async publishGeneration(generation) {
        const api = await this._client.api(new PublishGeneration({
            id: generation.id,
        }))
        // Update User Info
        this.loadMyInfo()
        // Reload the generations
        await this.loadMyGenerations()
        return api
    },

    async moveGeneration(generationId, threadId) {
        const api = await this._client.api(new MoveGeneration({
            generationId,
            threadId,
        }))
        if (api.succeeded) {
            // Reload the generations to reflect the change
            await this.loadMyGenerations()
        }
        return api
    },

    get isOver18() { return this.prefs.isOver18 },
    set isOver18(value) {
        this.prefs.isOver18 = value
        this.savePrefs()
    },
    savePrefs() {
        localStorage.setItem(this.prefsKey, JSON.stringify(this.prefs))
    },
    setPrefs(prefs) {
        Object.assign(this.prefs, prefs)
        this.savePrefs()
    },
    saveWorkflowArgs(args) {
        store.selectedWorkflowArgs = args
        if (args) {
            localStorage.setItem(this.workflowArgsKey, JSON.stringify(args))
        } else {
            localStorage.removeItem(this.workflowArgsKey)
        }
    },

    // Load ratings from localStorage or use defaults
    loadSelectedRatings() {
        try {
            const stored = localStorage.getItem(this.ratingsKey)
            return stored ? JSON.parse(stored) : DefaultRatings
        } catch (e) {
            return DefaultRatings
        }
    },
    saveSelectedRatings() {
        localStorage.setItem(this.ratingsKey, JSON.stringify(this.selectedRatings))
        const ratings = this.selectedRatings.map(x => Rating[x]).filter(x => !!x)
        this._client.api(new UpdatePreferences({ ratings }))
    },
    
    async saveArtifacts(artifacts) {
        const tx = this.transaction(Tables.Artifact, 'readwrite')
        await Promise.all(artifacts.map(x => tx.store.put(x)))
        await tx.done
    },
    
    async loadBestArtifacts(artifacts, count) {
        // cache artifacts with the most reactions until Tables.Artifact >= count
        let dbCount = await this.db(Tables.Artifact).count(Tables.Artifact)
        let skip = 0
        console.log('loadBestArtifacts', dbCount, count)
        while (dbCount < count) {
            const api = await this._client.api(new QueryArtifacts({
                skip,
                take: count - dbCount,
                orderBy: '-reactionsCount',
                ratings: ['PG', 'PG13'],
            }))
            if (api.error) return
            await this.saveArtifacts(api.response.results)
            skip += api.response.results.length
            dbCount = await this.db(Tables.Artifact).count(Tables.Artifact)
            console.log('loadBestArtifacts', dbCount, count)
        }
    },
    
    async removeArtifact(artifactId) {
        const tx = this.transaction(Tables.Artifact, 'readwrite')
        await tx.store.delete(artifactId)
        await tx.done
    },
    
    async removeDevice(id) {
        return this._client.api(new RemoveDevice({ id }))
    },
    
    async getFeaturedPortraitArtifacts(take) {
        // Get Random Artifacts from IndexedDb
        const results = []
        const tx = this.transaction(Tables.Artifact)
        for await (const cursor of tx.store) {
            const img = cursor.value
            if (!store.selectedRatings.includes(img.rating)) continue
            if (this.appConfig?.featuredUserIds?.length) {
                if (!this.appConfig.featuredUserIds.includes(img.publishedBy)) continue
            }
            if (img.height > img.width) {
                results.push(img)
            }
            if (results.length >= Math.max(take * 10, 100)) break
        }
        results.sort(() => Math.random() - 0.5)
        return results.slice(0, take)
    },

    toArtifacts(assets, generation, minSize = null) {
        return assets?.map(x => this.toArtifact(x, generation, minSize)) ?? []
    },

    toArtifact(asset, generation, minSize = null) {
        const size = this.getSize(minSize)
        const width = Math.max(Number(asset.width) || Number(generation.args?.width) || 1024, 512)
        const height = Math.max(Number(asset.height) || Number(generation.args?.height) || 1024, 512)
        const preview = {
            width: size === 'Small'
                ? 118
                : size === 'Medium'
                    ? 288
                    : width,
            height: size === 'Small'
                ? 207
                : size === 'Medium'
                    ? 504
                    : height,
        }
        preview.url = this.getVariantPath(asset, preview.width, preview.height)
        return {
            width,
            height,
            url: asset.url,
            preview,
            errorUrl: this.getArtifactImageErrorUrl(asset.id, asset.url, minSize),
            rating: asset.rating,
            cls: asset.url === generation.posterImage
                ? generation.publishedDate
                    ? 'my-0.5 border border-yellow-300/50'
                    : 'my-0.5 border border-green-300/50'
                : 'my-0.5 border border-transparent',
        }
    },

    /** @param {Artifact} artifact
     *  @param {number} minSize
     *  @param {number} maxSize */
    getVariantPath(artifact, minSize, maxSize) {
        const path = rightPart(artifact.filePath || artifact.url, "/artifacts")
        if (artifact.height > artifact.width)
            return combinePaths(`/variants/height=${maxSize}`, path)
        if (artifact.width > artifact.height)
            return combinePaths(`/variants/width=${maxSize}`, path)
        return combinePaths(`/variants/width=${minSize}`, path)
    },
    /** @param {number?} minSize */
    getSize(minSize=null) {
        const size = minSize == null
            ? 'Medium'
            : minSize < 288
                ? 'Small'
                : minSize > 504
                    ? 'Large'
                    : 'Medium'
        return size
    },
    get assetsBaseUrl() { return this.appConfig?.assetsBaseUrl || this.AssetsBasePath },
    getPublicUrl(artifact, minSize = null) {
        return this.getFilePath(this.assetsBaseUrl, artifact, minSize)
    },
    getFilePath(cdnPath, artifact, minSize=null) {
        const size = this.getSize(minSize)
        const variantPath = size === 'Small'
            ? this.getVariantPath(artifact, 118, 207)
            : size === 'Medium'
                ? this.getVariantPath(artifact, 288, 504)
                : null

        if (!variantPath)
            return combinePaths(cdnPath, artifact.filePath)
        return combinePaths(cdnPath, variantPath)
    },
    resolveBorderColor(artifact, selected) {
        return selected
            ? 'border-yellow-300'
            : 'border-transparent'
    },
    getBackgroundStyle(artifact) {
        if (artifact.color) return `background-color:${artifact.color}`
        return this.resolveBorderColor(artifact, artifact.selected)
    },
    /** @param {number?} artifactId
     *  @param {string} [lastImageSrc]
     *  @param {number?} minSize */
    getArtifactImageErrorUrl(artifactId, lastImageSrc, minSize = null) {
        if (artifactId) {
            console.error('Failed to load image', artifactId, lastImageSrc)
            store.removeArtifact(artifactId)
        }
        return this.placeholderImageDataUri()
    },
    /** @param {string} fill */
    solidImageDataUri(fill) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%23${(fill || "#000").substring(1)}' d='M2 2h60v60H2z'/%3E%3C/svg%3E`
    },
    /** Generate a placeholder image with an icon instead of solid black */
    placeholderImageDataUri() {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23364153'/%3E%3Cg transform='translate(200,150)'%3E%3Crect x='-50' y='-40' width='100' height='80' fill='none' stroke='%23d1d5db' stroke-width='2' rx='4'/%3E%3Ccircle cx='-25' cy='-15' r='8' fill='%23d1d5db'/%3E%3Cpath d='M-35 10 L-15 -10 L5 10 L25 -5 L25 25 L-35 25 Z' fill='%23d1d5db'/%3E%3C/g%3E%3Ctext x='200' y='220' text-anchor='middle' fill='%239ca3af' font-family='Arial, sans-serif' font-size='14'%3EImage not available%3C/text%3E%3C/svg%3E`
    },

    assetUrl(url) {
        if (!url) return url
        const baseUrl = this.appConfig?.assetsBaseUrl
        return !url.includes('://') && baseUrl
            ? combinePaths(baseUrl, url)
            : url
    },
    fallbackAssetUrl(url) {
        if (!url) return url
        const baseUrl = this.appConfig?.fallbackAssetsBaseUrl
        return !url.includes('://')
            ? baseUrl && baseUrl !== this.appConfig?.assetsBaseUrl
                ? combinePaths(baseUrl, url)
                : this.placeholderImageDataUri()
            : url
    },
    imgOnError(url) {
        return `this.src=${JSON.stringify(this.fallbackAssetUrl(url))}`
    },
    
    // Ratings
    isRatingViewable(artifact) {
        if (!artifact) return false
        const rating = getRatingDisplay(artifact)
        const useRating = rating === 'PG-13' ? 'PG13' : rating
        const isViewable = !rating || this.selectedRatings.includes(useRating)
        return isViewable
    },
    
    urlToName(url) {
        name = lastRightPart(url, '/')
        if (name.endsWith('.git')) {
            name = name.slice(0, -4)
        }
        name = name.replace(/[-_]/g, ' ').replace(/comfyui/gi, 'ComfyUI')
        return name.split(' ').filter(x => x).map(x => x[0].toUpperCase() + x.slice(1)).join(' ')
    },

    populateAllDevices() {
        const allDevices = [...this.myDevices]
        allDevices.push(...this.poolDevices.filter(x => !this.myDevices.find(y => y.id === x.id)))
        allDevices.forEach(device => this.populateDevice(device))
        //this.allDevices = allDevices.map(device => device)
    },
    
    populateDevice(device) {
        if (!device) alert(device)
        device.updated = (device.updated ?? 0) + 1
        device.modelsSet = this.getDeviceModelsSet(device)
        device.installedCustomNodes = (device.installedNodes ?? [])
            .filter(url => url !== 'https://github.com/ServiceStack/comfy-agent')
            .map(url => Object.assign({
                url,
                name: this.urlToName(url),
                nodes: [],
            }, this.customNodesMap[url]))
    },
    
    // Devices
    async loadPoolDevices(args={}) {
        const api = await this._client.api(new DevicePool(args))
        if (api.succeeded) {
            this.poolDevices = api.response.results
            this.populateAllDevices()
        }
        return api
    },
    async loadMyDevices(args={}) {
        const api = await this._client.api(new MyDevices(args))
        if (api.succeeded) {
            this.myDevices = api.response.results
            this.populateAllDevices()
        }
        return api
    },

    isCompatible(workflowVersion, device) { 
        return this.compatibleErrors(workflowVersion, device) == null 
    },
    compatibleErrors(workflowVersion, device) {
        const missingNodes = []
        const missingAssets = []
        // Verify device has all required nodes
        for (const node of workflowVersion.nodes) {
            if (!device.nodes.includes(node)) {
                missingNodes.push(node)
            }
        }
        
        const modelsSet = device.modelsSet ?? (device.modelsSet = this.getDeviceModelsSet(device)) 
        const assets = device.assets ?? (device.assets = Array.from(modelsSet ?? []).sort())
        
        // console.log('device', device.modelsSet)
        // console.log(device.models)
        
        for (const asset of workflowVersion.assets) {
            if (!assets.includes(asset)) {
                missingAssets.push(asset)
            }
        }
        return missingNodes.length || missingAssets.length 
            ? { missingNodes, missingAssets }
            : null
    },
    allCompatibleDevices(workflowVersion) {
        return this.allDevices.filter(x => this.isCompatible(workflowVersion, x))
    },
    compatibleDevices(workflowVersion, devices) {
        return devices.filter(x => this.isCompatible(workflowVersion, x))
    },
    deviceLabel(device) {
        return device.shortId + ' - ' + (device.gpus?.[0]?.name || '') + (device.lastIp ? (' @ ' + device.lastIp) : '')
    },
    
    variantWorkflowsForArtifact(artifact) {
        return artifact && artifact.type === 'Image' && !getHDClass(artifact.width, artifact.height) 
            ? this.workflowVersions.filter(x => x.info?.type === 'ImageToImage')
            : []
    },
    
    canManageDevice(device) {
        return device?.userId && (store.isAdmin || device.userId === store.userId)
    },

    getDeviceModelsSet(device) {
        const models = device.models || {}
        const modelSet = new Set()
        // combine model key with model files
        Object.keys(models).forEach(key => {
            models[key].forEach(model => {
                const modelPath = `${key}/${model}`
                if (!device.hiddenModels?.includes(modelPath)) {
                    modelSet.add(modelPath)
                }
            })
        })
        return modelSet
    },

    async agentCommand(deviceId, command, args) {
        console.log('store.agentCommand', deviceId, command, args)
        this.events.publish('status', `${command}ing...`)
        const api = await this._client.api(new AgentCommand({
            deviceId,
            command,
        }))
        if (api.response) {
            this.events.publish('status', api.response?.result || `${command} queued...`)
        } else {
            this.events.publish('status', `Failed to ${command}: ${api.error?.message || 'Unknown error'}`)
        }
    },

    async loadCachedJsonUrl(url, opt=null) {
        console.log('loadCachedJsonUrl', url)
        const r = await fetch(url, { 
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache' 
            } 
        })
        opt = opt || {}
        const value = await r.json()
        this.put(Tables.Cache, {
            id: url,
            type: opt.type || lastRightPart(url, '/'),
            value,
            expires: opt.expires ?? Date.now() + 1000 * 60 * 60 * 24, // 1 day
        })
        return value
    },
    
    async getCachedJsonUrl(url, opt) {
        const entry = await this.get(Tables.Cache, url)
        if (entry?.value) {
            if (!entry.expires || entry.expires < Date.now() || location.origin === 'https://localhost:5001') {
                this.loadCachedJsonUrl(url, opt)
            }
            return entry.value
        }
        return await this.loadCachedJsonUrl(url, opt)
    },

    async loadCustomNodes() {
        this.customNodes = await this.getCustomNodes()
        this.customNodesMap = this.customNodes.reduce((acc, node) => {
            acc[node.url] = node
            return acc
        }, {})
    },
    
    async getCustomNodes() {
        return await this.getCachedJsonUrl(`/data/custom-nodes.json`)
    },
}

let store = reactive(o)
export default store
