import { loadDecisionTags } from './decisionTags.mjs'
import { ref, onMounted } from 'vue'
import { formatDate, count } from './recipeFormat.mjs'
export const RecipeCard = {
    props: { item: Object, mine: Boolean },
    emits: ['remove'],
    template: `<article class="recipe-card">
      <div class="recipe-card-body"><div class="recipe-card-top"><span class="recipe-eyebrow">Decision recipe</span><div class="recipe-card-controls"><a v-if="item.publisherStarred" :href="'/d/'+item.externalRef" class="recipe-favourite" title="Publisher favourite" aria-label="Publisher favourite">★</a><button v-if="mine" type="button" class="recipe-danger" @click="$emit('remove',item)">Stop sharing</button></div></div>
      <h3><a class="recipe-card-link" :href="'/d/'+item.externalRef">{{item.name}}</a></h3><p class="recipe-card-description">{{item.description}}</p>
      <div class="recipe-tags"><a v-if="item.content" :href="'/m?tag='+encodeURIComponent(item.content)+'#recipes'" :aria-label="'Content: '+item.content">{{item.content}}</a><a v-for="tag in item.tags" :key="tag" :href="'/m?tag='+encodeURIComponent(tag)+'#recipes'">{{tag}}</a></div>
      <p class="recipe-card-meta">{{item.author.displayName || item.author.userName}} · {{count(item.questionCount,'question')}}</p>
      <p class="recipe-card-meta">{{item.publisherRunCount||0}} recorded publisher runs · Updated {{formatDate(item.updatedAt)}}</p></div>
    </article>`,
    setup() {
        return { formatDate, count }
    },
}
export default {
    components: { RecipeCard },
    template: `<section class="recipe-gallery" aria-label="Decision recipes">
      <div class="recipe-gallery-intro"><div><p class="recipe-eyebrow">Decision Studio</p><h2>{{mine?'My shared recipes':'Discover decision recipes'}}</h2><p>Browse recorded examples, review their results, and import a recipe into Jev.</p></div><button type="button" :aria-pressed="mine" @click="mine=!mine;load(false)">{{mine?'All recipes':'My recipes'}}</button></div>
      <form class="recipe-filters" @submit.prevent="load(false)">
        <label class="recipe-search">Search<input v-model="q" placeholder="Name or description" aria-label="Search recipes"/></label>
        <label>Tag<input v-model="tag" list="decision-gallery-tags" placeholder="Any tag" aria-label="Recipe tag"/></label><datalist id="decision-gallery-tags"><option v-for="item in tags" :key="item.name" :value="item.name"></option></datalist>
        <label>Author<input v-model="user" placeholder="Any author" aria-label="Recipe author"/></label>
        <label>Sort by<select v-model="order" aria-label="Recipe ordering"><option value="recommended">Recommended</option><option value="most-run">Most run by publisher</option><option value="newest">Newest</option><option value="name">Name</option></select></label><button type="submit" class="recipe-primary" :disabled="busy">Search</button>
      </form>
      <div v-if="error" class="recipe-notice recipe-error" role="alert"><div><h3>Unable to load recipes</h3><p>{{error}}</p></div><a v-if="needsSignIn" class="recipe-button" href="/Account/Login?ReturnUrl=%2Fm%23recipes">Sign in</a><button v-else type="button" @click="load(false)">Try again</button></div>
      <div class="recipe-grid" :aria-busy="busy"><RecipeCard v-for="item in items" :key="item.externalRef" :item="item" :mine="mine" @remove="remove"/></div>
      <div v-if="!busy&&!items.length&&!error" class="recipe-empty"><h3>No recipes found.</h3><p>{{mine?'Published recipes will appear here.':'Try a different search, tag or author.'}}</p></div>
      <div class="recipe-gallery-footer"><button v-if="more" type="button" :disabled="busy" @click="load(true)">Load more</button><p v-if="busy" role="status">Loading recipes…</p></div>
    </section>`,
    setup() {
        const items = ref([]),
            q = ref(''),
            tag = ref(
                location.hash === '#recipes'
                    ? new URLSearchParams(location.search).get('tag') || ''
                    : '',
            ),
            user = ref(''),
            order = ref('recommended'),
            mine = ref(false),
            error = ref(''),
            more = ref(false),
            busy = ref(false),
            needsSignIn = ref(false)
        const tags = ref([])
        let session = 0
        async function load(append = false) {
            const token = ++session,
                owned = mine.value
            busy.value = true
            error.value = ''
            needsSignIn.value = false
            if (!append) items.value = []
            try {
                const response = await fetch(
                    '/publish/decisions' +
                        (owned ? '/mine' : '') +
                        '?' +
                        new URLSearchParams({
                            q: q.value,
                            tag: tag.value,
                            user: user.value,
                            orderBy: order.value,
                            skip: append ? items.value.length : 0,
                            take: 20,
                        }),
                    {
                        cache: 'no-cache',
                        headers: { Accept: 'application/json' },
                        redirect: owned ? 'manual' : 'error',
                    },
                )
                if (
                    owned &&
                    (response.type === 'opaqueredirect' ||
                        response.status === 401 ||
                        response.status === 403)
                ) {
                    if (token === session) needsSignIn.value = true
                    throw Error('Sign in to manage your recipes.')
                }
                if (!response.ok)
                    throw Error(
                        response.status === 401
                            ? 'Sign in to manage your recipes.'
                            : 'Could not load recipes.',
                    )
                const data = await response.json()
                if (token === session) {
                    items.value = append
                        ? [...items.value, ...data.items]
                        : data.items
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
            if (
                !confirm(
                    'Stop sharing ' +
                        item.name +
                        '? Imported copies remain usable.',
                )
            )
                return
            try {
                const res = await fetch(
                    '/publish/decisions/mine/' +
                        encodeURIComponent(item.externalRef) +
                        '?revision=' +
                        item.revision,
                    {
                        method: 'DELETE',
                        headers: {
                            'X-Recipe-Management': '1',
                            Accept: 'application/json',
                        },
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
        onMounted(() => {
            load(false)
            loadDecisionTags(async () => {
                const response = await fetch('/publish/decisions/tags')
                if (!response.ok) throw Error('Could not load tags')
                return response.json()
            }, location.origin).then((catalog) => {
                tags.value = catalog.tags
            })
        })
        return {
            tags,
            items,
            q,
            tag,
            user,
            order,
            mine,
            error,
            needsSignIn,
            more,
            busy,
            load,
            remove,
        }
    },
}
