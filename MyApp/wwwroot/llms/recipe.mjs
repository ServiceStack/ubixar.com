import { ref, onMounted } from 'vue'
import PublicationPreview from './PublicationPreview.mjs'
const App = {
    components: { PublicationPreview },
    template: `<main class="recipe-public" :class="$styles.app"><div class="recipe-public-inner"><p><a href="/m#recipes">Browse recipes</a></p><p v-if="error" role="alert">{{error}}</p><template v-if="recipe"><header><h1>{{recipe.name}}</h1><p>{{recipe.description}}</p><p>{{recipe.author.displayName || recipe.author.userName}} · {{recipe.filename}} · Revision {{recipe.revision}}</p><p>Published {{recipe.publishedAt}} · Updated {{recipe.updatedAt}}</p></header><div class="recipe-actions"><button @click="instructions=true">Import into Jev</button><button @click="copy">Copy link</button><a :href="recipe.downloadUrl" download>Download JSON</a></div><p v-if="copied" role="status">Link copied</p><section v-if="instructions"><h2>Import into Jev</h2><p>Open Decision Studio → Import recipe → From link. Paste this link and review the recipe before importing. You can also download the JSON and import it from a file.</p><input readonly :value="link" aria-label="Recipe share link"/><button @click="copy">Copy link</button></section><PublicationPreview :document="recipe.document" :execution="recipe.execution"/><details><summary>Input fields and questions</summary><pre>{{JSON.stringify({inputSchema:recipe.document.inputSchema,questions:recipe.document.questions,presentation:recipe.document.presentation},null,2)}}</pre></details><details v-if="recipe.document.examples?.length"><summary>Additional examples</summary><pre>{{JSON.stringify(recipe.document.examples,null,2)}}</pre></details></template><p v-else-if="!error">Loading recorded recipe…</p></div></main>`,
    setup() {
        const recipe = ref(null),
            error = ref(''),
            copied = ref(false),
            instructions = ref(false),
            link = location.origin + location.pathname
        onMounted(async () => {
            try {
                const ref = location.pathname.split('/')[2]
                const response = await fetch('/publish/decision/' + encodeURIComponent(ref), {
                    cache: 'no-cache',
                })
                if (!response.ok)
                    throw Error(
                        response.status === 404
                            ? 'This recipe is no longer shared.'
                            : 'Could not load this recipe.',
                    )
                recipe.value = await response.json()
            } catch (e) {
                error.value = e.message
            }
        })
        async function copy() {
            try {
                await navigator.clipboard.writeText(link)
                copied.value = true
            } catch {
                error.value = 'Select the link and copy it manually.'
            }
        }
        return { recipe, error, copied, instructions, link, copy }
    },
}
