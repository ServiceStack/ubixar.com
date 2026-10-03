import { ref, onMounted } from 'vue'
export const RecipeCard = {
    props: { item: Object, mine: Boolean },
    emits: ['remove'],
    template: `<article class="recipe-card"><h3><a :href="'/d/'+item.externalRef">{{item.name}}</a></h3><p>{{item.description}}</p><p>{{item.author.displayName || item.author.userName}} · {{item.questionCount}} questions</p><p>{{item.tags.join(' · ')}}</p><p>{{item.updatedAt}}</p><button @click="copy">Copy link</button><button v-if="mine" @click="$emit('remove',item)">Stop sharing</button><span v-if="copied">Copied</span></article>`,
    setup(props) {
        const copied = ref(false)
        async function copy() {
            await navigator.clipboard.writeText(props.item.publishedUrl)
            copied.value = true
        }
        return { copy, copied }
    },
}
export default {
    components: { RecipeCard },
    template: `<section><form class="recipe-filters" @submit.prevent="load(false)"><input v-model="q" placeholder="Search recipes" aria-label="Search recipes"/><input v-model="tag" placeholder="Tag" aria-label="Recipe tag"/><input v-model="user" placeholder="Author" aria-label="Recipe author"/><select v-model="order" aria-label="Recipe ordering"><option value="newest">Newest</option><option value="name">Name</option></select><button>Search</button><button type="button" @click="mine=!mine;load(false)">{{mine?'All recipes':'My recipes'}}</button></form><p v-if="error" role="alert">{{error}}</p><div class="recipe-grid"><RecipeCard v-for="item in items" :key="item.externalRef" :item="item" :mine="mine" @remove="remove"/></div><p v-if="!busy&&!items.length&&!error">No recipes found.</p><button v-if="more" :disabled="busy" @click="load(true)">Load more</button><p v-if="busy">Loading…</p></section>`,
    setup() {
        const items = ref([]),
            q = ref(''),
            tag = ref(''),
            user = ref(''),
            order = ref('newest'),
            mine = ref(false),
            error = ref(''),
            more = ref(false),
            busy = ref(false)
        let session = 0
        async function load(append = false) {
            const token = ++session
            busy.value = true
            error.value = ''
            if (!append) items.value = []
            try {
                const response = await fetch(
                    '/publish/decisions' +
                        (mine.value ? '/mine' : '') +
                        '?' +
                        new URLSearchParams({
                            q: q.value,
                            tag: tag.value,
                            user: user.value,
                            orderBy: order.value,
                            skip: append ? items.value.length : 0,
                            take: 20,
                        }),
                    { cache: 'no-cache' },
                )
                if (!response.ok)
                    throw Error(
                        response.status === 401
                            ? 'Sign in to manage your recipes.'
                            : 'Could not load recipes.',
                    )
                const data = await response.json()
                if (token === session) {
                    items.value = append ? [...items.value, ...data.items] : data.items
                    more.value = data.hasMore
                }
            } catch (e) {
                if (token === session) {
                    error.value = e.message
                    if (!append) items.value = []
                }
            } finally {
                if (token === session) busy.value = false
            }
        }
        async function remove(item) {
            if (!confirm('Stop sharing ' + item.name + '? Imported copies remain usable.')) return
            try {
                const res = await fetch(
                    '/publish/decisions/mine/' +
                        encodeURIComponent(item.externalRef) +
                        '?revision=' +
                        item.revision,
                    {
                        method: 'DELETE',
                        headers: { 'X-Recipe-Management': '1', Accept: 'application/json' },
                    },
                )
                if (!res.ok)
                    throw Error(
                        res.status === 409
                            ? 'This recipe changed. Refresh and review before removing it.'
                            : 'Could not stop sharing.',
                    )
                await load(false)
            } catch (e) {
                error.value = e.message
            }
        }
        onMounted(() => load(false))
        return {
            items,
            q,
            tag,
            user,
            order,
            mine,
            error,
            more,
            busy,
            load,
            remove,
        }
    },
}
