import { createApp, reactive, ref, computed, nextTick, defineAsyncComponent, onMounted, onUnmounted } from "vue"
import {
    JsonServiceClient,
    EventBus,
    $1,
    $$,
    lastLeftPart,
    omit,
    lastRightPart,
    leftPart,
    rightPart, toDate
} from "@servicestack/client"
import ServiceStackVue, { useAuth, useConfig } from "@servicestack/vue"
import Header from "../pages/components/Header.mjs"
import store from "../pages/lib/store.mjs"
import { humanifyNumber, pluralize, formatDate, formatRating, isUserName } from "../pages/lib/utils.mjs"
import { createWebHistory, createRouter } from "vue-router"

const { setConfig }  = useConfig()
setConfig({
    filterInputClass: (cls, type) => cls
        .replaceAll('bg-gray-900', 'bg-gray-800')
})

const routes = [
    { path: '/', component: () => import('../pages/Home.mjs') },
    { path: '/generate/:tab?/:id?', component: () => import('../pages/Generate.mjs') },
    { path: '/images/:path?', component: () => import('../pages/Images.mjs') },
    { path: '/gallery/:path?', component: () => import('../pages/Images.mjs') },
    { path: '/generations/:id?', component: () => import('../pages/Generation.mjs') },
    { path: '/audio/:path?', component: () => import('../pages/Audio.mjs') },
    { path: '/test/:path?', component: () => import('../pages/Test.mjs') },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

const globalFunctions = {
    omit,
    leftPart,
    rightPart,
    lastLeftPart,
    lastRightPart,
    pluralize,
    humanifyNumber,
    formatRating,
    formatDate,
    isUserName,
}

let client = null, Apps = [], events = new EventBus(), bus = events
let AppData = {
    init:false
}
export { client, store, Apps, events, bus }

// const Header = defineAsyncComponent(() =>
//     import('../pages/components/Header.mjs')
// )
export const App = {
    components: {
        Header,
    },
    template: `
<div>
    <Header :store="store" :events="events" :user="user" />
    <div>
        <main role="main">
            <RouterView />
        </main>
    </div>
</div>
`,
    setup(props) {
        const { user } = useAuth()
        return {
            store,
            user,
            events,
        }
    }
}

/** Shared Global Components */
const Components = {
    App,
}
const CustomElements = [
    'lite-youtube',
]

const alreadyMounted = el => el.__vue_app__ 

const mockArgs = { attrs:{}, slots:{}, emit:() => {}, expose: () => {} }
function hasTemplate(el,component) {
    return !!(el.firstElementChild
        || component.template
        || (component.setup && typeof component.setup({}, mockArgs) == 'function'))
}

/** Mount Vue3 Component
 * @param sel {string|Element} - Element or Selector where component should be mounted
 * @param component 
 * @param [props] {any} */
export function mount(sel, component, props) {
    console.log('mount', sel, component, props)
    if (!AppData.init) {
        init(globalThis)
    }
    const el = $1(sel)
    if (alreadyMounted(el)) return

    if (!hasTemplate(el, component)) {
        // Fallback for enhanced navigation clearing HTML DOM template of Vue App, requiring a force reload
        // Avoid by disabling enhanced navigation to page, e.g. by adding data-enhance-nav="false" to element
        console.warn('Vue Compontent template is missing, force reloading...', el, component)
        blazorRefresh()
        return
    }

    const app = createApp(component, props)
    app.provide('client', client)
    app.provide('store', store)
    app.provide('server', globalThis.Server)
    app.provide('routes', routes)
    app.provide('events', events)
    Object.keys(Components).forEach(name => {
        app.component(name, Components[name])
    })
    app.use(router)
    app.use(ServiceStackVue)
    //app.component('RouterLink', ServiceStackVue.component('RouterLink'))
    app.directive('hash', (el, binding) => {
        /** @param {Event} e */
        el.onclick = (e) => {
            e.preventDefault()
            location.hash = binding.value
        }
    })
    if (component.install) {
        component.install(app)
    }
    if (client && !app._context.provides.client) {
        app.provide('client', client)
    }
    app.config.errorHandler = error => { 
        console.log(error) 
    }
    app.config.compilerOptions.isCustomElement = 
        tag => CustomElements.includes(tag) || tag.startsWith('el-')
    
    Object.keys(globalFunctions).forEach(name => {
        app.config.globalProperties[name] = globalFunctions[name]
    })
    
    app.mount(el)
    Apps.push(app)
    return app
}

export function forceMount(sel, component, props) {
    const el = $1(sel)
    if (!el) return
    unmount(el)
    return mount(sel, component, props)
}

async function mountApp(el, props) {
    let appPath = el.getAttribute('data-component')
    if (!appPath.startsWith('/') && !appPath.startsWith('.')) {
        appPath = `../${appPath}`
    }

    const module = await import(appPath)
    unmount(el)
    mount(el, module.default, props)
}

export async function configure() {
    client ??= new JsonServiceClient()
    await store.init(client, events, router)
    window.store = store

    function handleKeydown(event) {
        switch (event.key) {
            case "Escape":
                console.log('Escape')
                events.publish('closeWindow')
                break
        }
    }
    document.addEventListener("keydown", handleKeydown)
    
    return { 
        client,
        store,
    }
}

export async function remount() {
    if (!AppData.init) {
        await configure()
        init({ force: true })
    } else {
        mountAll({ force: true })
    }
}

//Default Vue App that gets created with [data-component] is empty, e.g. Blog Posts without Vue components
const DefaultApp = {
    setup() {
        function nav(url) {
            window.open(url)
        }
        return { nav }
    }
}

function blazorRefresh() {
    if (globalThis.Blazor)
        globalThis.Blazor.navigateTo(location.pathname.substring(1), true)
    else
        globalThis.location.reload()
}

export function mountAll(opt) {
    $$('[data-component]').forEach(el => {

        if (opt && opt.force) {
            unmount(el)
        } else {
            if (alreadyMounted(el)) return
        }

        let componentName = el.getAttribute('data-component')
        let propsStr = el.getAttribute('data-props')
        let props = propsStr && new Function(`return (${propsStr})`)() || {}

        if (!componentName) {
            mount(el, DefaultApp, props)
            return
        }

        if (componentName.includes('.')) {
            mountApp(el, props)
            return
        }

        let component = Components[componentName] || ServiceStackVue.component(componentName)
        if (!component) {
            console.error(`Component ${componentName} does not exist`)
            return
        }

        mount(el, component, props)
    })
    $$('[data-module]').forEach(async el => {
        let modulePath = el.getAttribute('data-module')
        if (!modulePath) return
        if (!modulePath.startsWith('/') && !modulePath.startsWith('.')) {
            modulePath = `../${modulePath}`
        }
        try {
            const module = await import(modulePath)
            if (typeof module.default?.load == 'function') {
                module.default.load()
            }
        } catch(e) {
            console.error(`Couldn't load module ${el.getAttribute('data-module')}`, e)
        }
    })
    $$('[v-href]').forEach(el => {
        el.onclick = e => {
            e.preventDefault()
            let href = el.getAttribute('v-href')
            if (href.startsWith('/')) {
                router.push(href)
            } else {
                location.href = href
            }
        }
    })
}

/** @param {any} [exports] */
export function init(opt) {
    if (AppData.init) return
    AppData = reactive(AppData)
    AppData.init = true
    mountAll(opt)

    if (opt && opt.exports) {
        opt.exports.client = client
        opt.exports.Apps = Apps
    }
}

function unmount(el) {
    if (!el) return

    try {
        if (el.__vue_app__) {
            el.__vue_app__.unmount(el)
        }
    } catch (e) {
        console.log('force unmount', el.id)
        el._vnode = el.__vue_app__ = undefined
    }
}


/* used in :::sh and :::nuget CopyContainerRenderer */
globalThis.copyText = function (e) {
    e.classList.add('copying')
    let $el = document.createElement("textarea")
    let text = (e.querySelector('code') || e.querySelector('p')).innerHTML
    try {
        navigator?.clipboard.writeText(text)
    } catch (e) {
        console.log('copyText', e)
        $el.innerHTML = text
        document.body.appendChild($el)
        $el.select()
        document.execCommand("copy")
        document.body.removeChild($el)
    }
    setTimeout(() => e.classList.remove('copying'), 3000)
}


/*
const svg = {
    clipboard: `<svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none"><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>`,
    check: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
}

function copyBlock(btn) {
    // console.log('copyBlock',btn)
    const label = btn.previousElementSibling
    const code = btn.parentElement.nextElementSibling
    label.classList.remove('hidden')
    label.innerHTML = 'copied'
    btn.classList.add('border-gray-600', 'bg-gray-700')
    btn.classList.remove('border-gray-700')
    btn.innerHTML = svg.check
    navigator.clipboard.writeText(code.innerText)
    setTimeout(() => {
        label.classList.add('hidden')
        label.innerHTML = ''
        btn.innerHTML = svg.clipboard
        btn.classList.remove('border-gray-600', 'bg-gray-700')
        btn.classList.add('border-gray-700')
    }, 2000)
}

export function addCopyButtonToCodeBlocks() {
    // console.log('addCopyButtonToCodeBlocks')
    $$('.prose pre>code').forEach(code => {
        let pre = code.parentElement;
        if (pre.classList.contains('group')) return
        pre.classList.add('relative', 'group')

        const div = createElement('div', {attrs: {className: 'opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex absolute right-2 -mt-1 select-none'}})
        const label = createElement('div', {attrs: {className: 'hidden font-sans p-1 px-2 mr-1 rounded-md border border-gray-600 bg-gray-700 text-gray-400'}})
        const btn = createElement('button', {
            attrs: {
                className: 'p-1 rounded-md border block text-gray-500 hover:text-gray-400 border-gray-700 hover:border-gray-600',
                onclick: 'copyBlock(this)'
            }
        })
        btn.innerHTML = svg.clipboard
        div.appendChild(label)
        div.appendChild(btn)
        pre.insertBefore(div, code)
    })
}
*/

document.addEventListener('DOMContentLoaded', () =>
    Blazor.addEventListener('enhancedload', () => {
        remount()
        globalThis.hljs?.highlightAll()
        // if (router.currentRoute.value?.path !== location.pathname) {
        //     router.replace({ path: location.pathname })
        // }
    }))
