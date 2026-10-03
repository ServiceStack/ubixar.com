const memory = new Map()
const pending = new Map()
const DAY = 24 * 60 * 60 * 1000
export function validCatalog(value) {
    return (
        value &&
        Number.isInteger(value.version) &&
        value.version > 0 &&
        Array.isArray(value.tags) &&
        value.tags.length <= 100 &&
        value.tags.every(
            (tag) =>
                tag &&
                /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.name) &&
                tag.name.length <= 40 &&
                typeof tag.label === 'string' &&
                tag.label.length <= 80 &&
                ['content', 'tag', 'context', 'task'].includes(tag.group),
        ) &&
        new Set(value.tags.map((tag) => tag.name)).size === value.tags.length
    )
}
// Public suggestions only. Credentials and recipe data never enter this cache.
export async function loadDecisionTags(api, scope = 'default', options = {}) {
    const key = 'jev:decision-tags:v2:' + scope
    let legacyCache = false
    const now = options.now ?? Date.now()
    let storage = options.storage
    if (storage === undefined)
        try {
            storage = globalThis.localStorage
        } catch {}
    let cached = memory.get(key)
    if (!cached)
        try {
            cached = JSON.parse(storage?.getItem(key) || 'null')
            if (!cached) {
                cached = JSON.parse(
                    storage?.getItem('jev:decision-tags:v1:' + scope) || 'null',
                )
                legacyCache = !!cached
            }
        } catch {}
    if (
        !cached ||
        !validCatalog(cached.catalog) ||
        !Number.isFinite(cached.savedAt) ||
        cached.savedAt > now
    )
        cached = null
    if (cached && !legacyCache && now - cached.savedAt < DAY)
        return cached.catalog
    if (pending.has(key)) return pending.get(key)
    const request = (async () => {
        try {
            const catalog = await api('/tags')
            if (!validCatalog(catalog)) throw Error('Invalid tag catalogue')
            const entry = { savedAt: now, catalog }
            memory.set(key, entry)
            try {
                storage?.setItem(key, JSON.stringify(entry))
            } catch {}
            return catalog
        } catch {
            return cached?.catalog || { version: 1, tags: [] }
        }
    })()
    pending.set(key, request)
    try {
        return await request
    } finally {
        pending.delete(key)
    }
}
export function normalizeTags(text) {
    return [
        ...new Set(
            text
                .split(',')
                .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '-'))
                .filter(Boolean),
        ),
    ]
}

export const tagGroup = (tag) =>
    ['context', 'content'].includes(tag.group) ? 'content' : 'tag'

// Older recipes mixed content types and task tags in one list. Keep the original
// document untouched until metadata is edited, then write the separate fields.
export function recipeMetadata(recipe, catalog = []) {
    if (typeof recipe.content === 'string')
        return { content: recipe.content, tags: recipe.tags || [] }
    const contentNames = new Set(
        catalog
            .filter((tag) => tagGroup(tag) === 'content')
            .map((tag) => tag.name),
    )
    return {
        content: (recipe.tags || []).find((tag) => contentNames.has(tag)) || '',
        tags: (recipe.tags || []).filter((tag) => !contentNames.has(tag)),
    }
}
