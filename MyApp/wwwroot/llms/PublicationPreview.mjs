import RecordedAnswers from './RecordedAnswers.mjs'
import { formatDate, count } from './recipeFormat.mjs'
export default {
    components: { RecordedAnswers },
    props: {
        document: Object,
        execution: Object,
        title: { type: String, default: 'Recorded example result' },
        showRecipe: { type: Boolean, default: true },
    },
    data() {
        return { tab: 'preview' }
    },
    methods: {
        formatDate,
        count,
        display(value) {
            return typeof value === 'string'
                ? value
                : JSON.stringify(value, null, 2)
        },
        label(key) {
            return (
                this.document.inputSchema.properties?.[key]?.title ||
                key.replace(/_/g, ' ')
            )
        },
    },
    template: `<section v-if="document" class="recipe-preview">
      <div class="recipe-preview-heading"><h2>{{title}}</h2><nav class="recipe-preview-tabs" aria-label="Publication preview"><button v-for="item in ['preview','json']" :key="item" type="button" :aria-pressed="tab===item" @click="tab=item">{{item==='preview'?'Preview':'JSON'}}</button></nav></div>
      <div v-if="tab==='preview'">
        <div v-if="showRecipe" class="recipe-preview-intro"><h3>{{document.name}}</h3><p>{{document.description}}</p><p class="recipe-muted">{{count(document.inputSchema.properties,'field')}} · {{count(document.questions,'question')}}</p></div>
        <template v-if="execution">
          <p class="recipe-run-meta">{{execution.model}} · {{formatDate(execution.completedAt,true)}}</p>
          <div class="recipe-results"><RecordedAnswers :recipe="document" :execution="execution"/></div>
          <section class="recipe-inputs"><h3>Recorded input</h3><dl><div v-for="(value,key) in execution.input" :key="key"><dt>{{label(key)}}</dt><dd>{{display(value)}}</dd></div></dl></section>
          <details class="recipe-details"><summary>Recorded prompt / state</summary><pre>{{display(execution.prompt)}}</pre></details>
        </template>
        <details class="recipe-details"><summary>Recipe fields and questions</summary><pre>{{JSON.stringify(document,null,2)}}</pre></details>
      </div>
      <pre v-else>{{JSON.stringify({document,execution},null,2)}}</pre>
    </section>`,
}
