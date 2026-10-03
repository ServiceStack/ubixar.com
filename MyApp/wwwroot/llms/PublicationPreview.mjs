import RecordedAnswers from './RecordedAnswers.mjs'
export default {
    components: { RecordedAnswers },
    props: {
        document: Object,
        execution: Object,
        title: { type: String, default: 'Recorded example result' },
    },
    data() {
        return { tab: 'preview' }
    },
    template: `<section v-if="document"><nav class="jev-actions" aria-label="Publication preview"><button type="button" class="jev-button" :aria-pressed="tab==='preview'" @click="tab='preview'">Preview</button><button type="button" class="jev-button" :aria-pressed="tab==='json'" @click="tab='json'">JSON</button></nav><div v-if="tab==='preview'"><h3>{{document.name}}</h3><p>{{document.description}}</p><p class="jev-help">{{Object.keys(document.inputSchema.properties||{}).length}} fields · {{Object.keys(document.questions).length}} questions · {{document.tags?.join(' · ')}}</p><template v-if="execution"><h4>{{title}}</h4><p class="jev-help">{{execution.model}} · {{execution.completedAt}}</p><details open class="jev-criteria"><summary>Recorded input</summary><pre>{{JSON.stringify(execution.input,null,2)}}</pre></details><details open class="jev-criteria"><summary>Recorded prompt / state</summary><pre>{{typeof execution.prompt==='string'?execution.prompt:JSON.stringify(execution.prompt,null,2)}}</pre></details><RecordedAnswers :recipe="document" :execution="execution"/></template><details class="jev-criteria"><summary>Recipe fields and questions</summary><pre>{{JSON.stringify(document,null,2)}}</pre></details></div><pre v-else>{{JSON.stringify({document,execution},null,2)}}</pre></section>`,
}
