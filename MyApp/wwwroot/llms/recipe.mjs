import { ref, onMounted } from 'vue'
import PublicationPreview from './PublicationPreview.mjs'
import RecordedAnswers from './RecordedAnswers.mjs'
import { formatDate, count } from './recipeFormat.mjs'
const App = {
    components: { PublicationPreview, RecordedAnswers },
    template: `<main class="recipe-public"><div class="recipe-public-inner">
      <a class="recipe-back" href="/m#recipes">← Browse recipes</a>
      <p v-if="error" class="recipe-notice recipe-error" role="alert">{{error}}</p>
      <template v-if="recipe">
        <header class="recipe-public-header">
          <p class="recipe-eyebrow">Shared decision recipe</p>
          <h1>{{recipe.name}}</h1><p class="recipe-description">{{recipe.description}}</p>
          <p v-if="recipe.content" class="recipe-muted">Content: {{recipe.content}}</p><div class="recipe-tags" v-if="recipe.tags?.length"><a v-for="tag in recipe.tags" :key="tag" :href="'/m?tag='+encodeURIComponent(tag)+'#recipes'">{{tag}}</a></div>
          <div class="recipe-meta"><span>{{recipe.author.displayName || recipe.author.userName}}</span><span>{{recipe.filename}}</span><span>Revision {{recipe.revision}}</span><span>{{count(recipe.fieldCount,'field')}} · {{count(recipe.questionCount,'question')}}</span></div>
          <div class="recipe-meta"><span>Published {{formatDate(recipe.publishedAt)}}</span><span v-if="recipe.updatedAt!==recipe.publishedAt">Updated {{formatDate(recipe.updatedAt)}}</span></div>
          <div class="recipe-actions"><button type="button" class="recipe-primary" @click="instructions=!instructions" :aria-expanded="instructions" aria-controls="recipe-import-instructions">Import into Jev</button><button type="button" @click="copy">{{copied?'Copied':'Copy link'}}</button><a class="recipe-button" :href="recipe.downloadUrl" download>Download JSON</a></div>
          <span class="recipe-sr-only" role="status">{{copied?'Link copied':''}}</span>
          <section v-if="instructions" id="recipe-import-instructions" class="recipe-import"><h2>Import into Jev</h2><p>Open Decision Studio → Import recipe → From JSON. Paste this link and review the recipe before importing. You can also download the JSON and import it from a file.</p><div class="recipe-actions"><input readonly :value="link" aria-label="Recipe share link" @focus="$event.target.select()"/><button type="button" @click="copy">Copy link</button></div></section>
        </header>
        <PublicationPreview :document="recipe.document" :execution="recipe.execution" :show-recipe="false"/>
        <details v-if="recipe.document.examples?.length" class="recipe-details recipe-additional"><summary>Usage examples · {{recipe.document.examples.length}}</summary>
          <article v-for="example in recipe.document.examples" :key="example.id" class="recipe-usage-example">
            <h3>{{example.label}}</h3><p v-if="example.notes" class="recipe-muted">{{example.notes}}</p>
            <section class="recipe-inputs"><h4>Input</h4><dl><div v-for="(value,key) in example.input" :key="key"><dt>{{recipe.document.inputSchema.properties[key]?.title || key}}</dt><dd>{{typeof value==='string'?value:JSON.stringify(value,null,2)}}</dd></div></dl></section>
            <template v-if="example.execution"><h4>Recorded result</h4><p class="recipe-run-meta">{{example.execution.model}} · {{formatDate(example.execution.completedAt,true)}}</p><div class="recipe-results"><RecordedAnswers :recipe="recipe.document" :execution="example.execution"/></div></template>
            <details v-if="Object.keys(example.expected||{}).length" class="recipe-details"><summary>Expected answers</summary><pre>{{JSON.stringify(example.expected,null,2)}}</pre></details>
          </article>
        </details>
      </template>
      <p v-else-if="!error" class="recipe-notice" role="status">Loading recorded recipe…</p>
    </div></main>`,
    setup() {
        const recipe = ref(null),
            error = ref(''),
            copied = ref(false),
            instructions = ref(false),
            link = location.origin + location.pathname
        onMounted(async () => {
            try {
                const ref = location.pathname.split('/')[2]
                const response = await fetch(
                    '/publish/decision/' + encodeURIComponent(ref),
                    {
                        cache: 'no-cache',
                    },
                )
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
        return {
            recipe,
            error,
            copied,
            instructions,
            link,
            copy,
            formatDate,
            count,
        }
    },
}
