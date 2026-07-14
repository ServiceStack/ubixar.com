import { createApp, reactive } from 'vue'
import ServiceStackVue, { useFormatters } from "@servicestack/vue"
import { JsonServiceClient } from "@servicestack/client"
import IconsModule from './modules/icons.mjs'
import KatexModule from './katex/index.mjs'
import { utilsFunctions, utilsFormatters, storageObject, isHtml, sanitizeHtml } from './utils.mjs'
import { marked, markedFallback } from './markdown.mjs'

const base = ''
const headers = { 'Accept': 'application/json' }
const prefsKey = 'llms.prefs'

export const o = {
    version: '3.0.49',
    base,
    prefsKey,
    welcome: 'Welcome to llms.py',
    shared: {
        "vars": {
            "--tw-prose-body": "#374151",
            "--tw-prose-headings": "#111827",
            "--tw-prose-lead": "#4b5563",
            "--tw-prose-links": "#111827",
            "--tw-prose-bold": "#111827",
            "--tw-prose-counters": "#6b7280",
            "--tw-prose-bullets": "#d1d5db",
            "--tw-prose-hr": "#e5e7eb",
            "--tw-prose-quotes": "#111827",
            "--tw-prose-quote-borders": "#e5e7eb",
            "--tw-prose-captions": "#6b7280",
            "--tw-prose-code": "#111827",
            "--tw-prose-pre-code": "#e5e7eb",
            "--tw-prose-pre-bg": "#282c34",
            "--tw-prose-th-borders": "#d1d5db",
            "--tw-prose-td-borders": "#e5e7eb",
            "--tw-prose-invert-body": "#d1d5db",
            "--tw-prose-invert-headings": "#fff",
            "--tw-prose-invert-lead": "#9ca3af",
            "--tw-prose-invert-links": "#fff",
            "--tw-prose-invert-bold": "#fff",
            "--tw-prose-invert-counters": "#9ca3af",
            "--tw-prose-invert-bullets": "#4b5563",
            "--tw-prose-invert-hr": "#374151",
            "--tw-prose-invert-quotes": "#f3f4f6",
            "--tw-prose-invert-quote-borders": "#374151",
            "--tw-prose-invert-captions": "#9ca3af",
            "--tw-prose-invert-code": "#fff",
            "--tw-prose-invert-pre-code": "#d1d5db",
            "--tw-prose-invert-pre-bg": "rgb(0 0 0 / 50%)",
            "--tw-prose-invert-th-borders": "#4b5563",
            "--tw-prose-invert-td-borders": "#374151"
        },
        "styles": {
            "app": "bg-[image:var(--background-image)] bg-cover",
            "appInner": "",
            "tagButtonLarge": "rounded-xl shadow-sm",
            "tagButtonSmall": "rounded-full shadow-sm",
            "tagLabel": "bg-[var(--tw-prose-code-bg)]/50 text-[var(--tw-prose-code)]/90 border border-[var(--tw-prose-code-border)]/70",
            "tagLabelHover": "hover:bg-[var(--tw-prose-code-bg)] hover:text-[var(--tw-prose-code)] hover:border-[var(--tw-prose-code-border)]",
            "messageUser": "bg-[var(--user-bg)] text-[var(--user-text)] border border-[var(--user-border)]",
            "messageAssistant": "bg-[var(--assistant-bg)] text-[var(--assistant-text)] border border-[var(--assistant-border)]"
        }
    },

    createTheme(theme = {}) {
        const colorScheme = theme.vars?.colorScheme
            || ((localStorage.getItem('color-scheme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
        const isDark = colorScheme === 'dark'
        const defaultTheme = isDark ? this.dark : this.light

        const vars = Object.assign({
            colorScheme,
            "--background-image": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%2300000000'/%3E%3C/svg%3E%0A")`,
        }, this.shared.vars, defaultTheme.vars, theme.vars)
        const styles = Object.assign({}, this.shared.styles, defaultTheme.styles, theme.styles)

        let preview = theme.preview
        if (!preview) {
            preview = {}
            Object.keys(defaultTheme.preview).forEach(key => {
                preview[key] = styles[key] || defaultTheme.preview[key]
            })
        }

        const ret = {
            preview,
            vars,
            styles,
        }

        console.log('createTheme', ret)
        return ret
    },

    async init(ctx) {
    }
}
let ai = reactive(o)

export class AppContext {
    constructor({ client, app, state, routes, ai, fmt, utils, marked, markedFallback }) {
        const self = this
        this.client = client
        this.app = app
        this.routes = routes
        this.ai = ai
        this.ai.dark = state.themes.dark
        this.ai.light = state.themes.light
        this.fmt = fmt
        this.utils = utils
        this._components = {}
        this.marked = marked
        this.markedFallback = markedFallback

        const theme = ai.createTheme()
        this.state = reactive({
            cacheBreaker: new Date().getTime(),
            theme,
            styles: theme.styles,
            profile: localStorage.getItem('llms.profile') || 'default',
            ...state,
        })
        this.modalComponents = {}
        this.extensions = []
        this.markedFilters = []
        this.chatRequestFilters = []
        this.chatResponseFilters = []
        this.chatErrorFilters = []
        this.createThreadFilters = []
        this.updateThreadFilters = []
        this.threadHeaderComponents = {}
        this.threadFooterComponents = {}
        this.userMenuItemComponents = {}
        this.top = {}
        this.left = {}
        this.leftTop = {}
        this.layout = reactive(storageObject(`llms.layout`))

        const oldPrefsKey = ai.prefsKey
        const prefsKey = ai.prefsKey + '.' + this.state.profile
        if (localStorage.getItem(oldPrefsKey)) {
            if (!localStorage.getItem(prefsKey)) {
                const oldPrefs = storageObject(oldPrefsKey)
                storageObject(prefsKey, oldPrefs)
            }
            localStorage.removeItem(oldPrefsKey)
        }
        this.prefs = reactive(storageObject(prefsKey))

        this._onRouterBeforeEach = []
        this._onClass = []

        if (!Array.isArray(this.layout.hide)) {
            this.layout.hide = []
        }
        Object.assign(app.config.globalProperties, {
            $ctx: this,
            $prefs: this.prefs,
            $state: this.state,
            $layout: this.layout,
            $ai: ai,
            $fmt: fmt,
            $utils: utils,
            get $styles() { return self.state.styles },
        })
        Object.keys(app.config.globalProperties).forEach(key => {
            globalThis[key] = app.config.globalProperties[key]
        })
        this.setTheme(this.getTheme(this.selectedTheme))
    }
    async init() {
        Object.assign(this.state, await this.ai.init(this))
        Object.assign(this.fmt, {
            markdown: this.renderMarkdown.bind(this),
            content: this.renderContent.bind(this),
        })
    }
    setGlobals(globals) {
        Object.entries(globals).forEach(([name, global]) => {
            const globalName = '$' + name
            globalThis[globalName] = this.app.config.globalProperties[globalName] = global
            this[name] = global
        })
    }
    getPrefsKey() {
        return this.ai.prefsKey + '.' + this.state.profile
    }
    getPrefs() {
        return this.prefs
    }
    setPrefs(o) {
        console.log('setPrefs', o)
        storageObject(this.getPrefsKey(), Object.assign(this.prefs, o))
    }
    getColorScheme() {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
    getDarkMode() {
        return document.documentElement.classList.contains('dark')
    }
    setColorScheme(darkMode) {
        let html = document.documentElement
        html.classList.toggle('dark', darkMode)
        html.style.setProperty('color-scheme', darkMode ? 'dark' : null)
        localStorage.setItem('color-scheme', darkMode ? 'dark' : 'light')
    }

    components(components) {
        if (components) {
            Object.keys(components).forEach(name => {
                this._components[name] = components[name]
            })
        }
        return this._components
    }

    renderMarkdown(content) {
        if (Array.isArray(content)) {
            content = content.filter(c => c.type === 'text').map(c => c.text).join('\n')
        }
        if (content && content.startsWith('---')) {
            const headerEnd = content.indexOf('---', 3)
            const header = content.substring(3, headerEnd).trim()
            content = '<div class="frontmatter">' + header + '</div>\n' + content.substring(headerEnd + 3)
        }
        let html = content || ''
        try {
            html = this.marked.parse(content || '')
        } catch (e) {
            console.log('Failed to parse markdown, using fallback', e)
            try {
                html = this.markedFallback.parse(content || '')
            } catch (e2) {
                console.log('Failed to parse markdown, using raw content', e2)
                html = content || ''
            }
        }
        return sanitizeHtml(html)
    }

    renderContent(content) {
        // Check for HTML tags to detect HTML content
        if (isHtml(content)) {
            // If this is HTML content, return it in an iframe so it doesn't break the page
            return `<iframe src="data:text/html;charset=utf-8,${encodeURIComponent(content)}"></iframe>`
        }
        return this.renderMarkdown(content)
    }

    resolveThemes(themes) {
        const ret = {}
        for (const [id, theme] of Object.entries(themes)) {
            ret[id] = this.createTheme(theme)
        }
        return ret
    }

    createTheme(theme) {
        return this.ai.createTheme(theme)
    }

    changeTheme(theme) {
        console.log('changeTheme.1', theme, theme?.vars?.colorScheme)

        const fullTheme = this.createTheme(theme)
        Object.assign(this.state.theme, fullTheme)
        Object.assign(this.state.styles, fullTheme.styles)

        console.log('changeTheme.2', this.state.theme.vars, this.state.styles.bgBody)

        Object.entries(fullTheme.vars).forEach(([key, value]) => {
            if (key === 'colorScheme') {
                this.setColorScheme(value === 'dark')
            } else if (key.startsWith("--")) {
                document.documentElement.style.setProperty(key, value)
            }
        })

        document.body.className = this.state.styles.bgBody || ''
    }

    get selectedTheme() {
        return this.getPrefs().theme || (this.getDarkMode() ? 'dark' : 'light')
    }

    getTheme(theme) {
        return this.state.themes[theme]
            || this.state.themes[this.getColorScheme()]
            || this.ai.light
    }

    selectTheme(theme) {
        this.setPrefs({
            theme
        })
        this.setTheme(this.getTheme(theme))
    }

    setTheme(theme) {
        if (!theme) return
        this.changeTheme(theme)
    }
}

const BuiltInModules = {
    IconsModule,
    KatexModule,
}
const Components = {}

export async function createContext(App, args, state) {
    const app = createApp(App)

    app.use(ServiceStackVue)
    Object.keys(Components).forEach(name => {
        app.component(name, Components[name])
    })

    const fmt = Object.assign({}, useFormatters(), utilsFormatters())
    const utils = Object.assign({}, utilsFunctions())
    const routes = []
    const client = new JsonServiceClient()
    app.provide('client', client)

    const ctx = new AppContext({ client, app, state, routes, ai, fmt, utils, marked, markedFallback })
    app.provide('ctx', ctx)
    Object.entries(args).forEach(([key, val]) => {
        app.provide(key, val)
    })
    await ctx.init()

    const installedModules = []

    // Install built-in modules sequentially
    Object.entries(BuiltInModules).forEach(([name, module]) => {
        try {
            module.install(ctx)
            installedModules.push({ extension: { id: name }, module: { default: module } })
            console.log(`Installed built-in: ${name}`)
        } catch (e) {
            console.error(`Failed to install built-in ${name}:`, e)
        }
    })

    // Register all components with Vue
    Object.entries(ctx._components).forEach(([name, component]) => {
        app.component(name, component)
    })

    return ctx
}

globalThis.createContext = createContext
