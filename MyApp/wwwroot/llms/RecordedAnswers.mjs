// Shared read-only result presentation used by Jev and the public viewer.
export default {
    props: { recipe: Object, execution: Object },
    setup() {
        return {
            label: (value) =>
                String(value)
                    .replace(/_/g, ' ')
                    .replace(/^./, (c) => c.toUpperCase()),
            percent: (value) =>
                new Intl.NumberFormat(undefined, {
                    style: 'percent',
                    maximumFractionDigits: 1,
                }).format(value),
            score: (value) => Number(value).toFixed(2),
            display: (value) => (typeof value === 'string' ? value : JSON.stringify(value)),
        }
    },
    template: `<article v-for="(answer,key) in execution.answers" :key="key" class="jev-answer">
          <div class="jev-section-heading"><h4>{{recipe.presentation?.questions?.[key]?.label || label(key)}}</h4><span class="jev-help">{{answer.type==='choice'?'Choose one':answer.type==='score'?'Ordered scale':'Yes / no'}}</span></div>
          <template v-if="answer.type==='noul'"><div class="jev-answer-value">{{percent(answer.noul)}}<span class="jev-help"> probability of yes</span></div>
            <div v-for="row in [{key:'Yes',value:answer.noul},{key:'No',value:1-answer.noul}]" :key="row.key" class="jev-probability"><div class="jev-row"><span>{{row.key}}</span><span>{{percent(row.value)}}</span></div><div class="jev-track"><div :style="{width:(row.value*100)+'%'}"/></div></div>
          </template>
          <template v-else>
            <div class="jev-answer-value">{{answer.type==='choice' ? (recipe.presentation?.questions?.[key]?.optionLabels?.[answer.choice] || label(answer.choice)) : score(answer.score)}}<span v-if="answer.type==='score'" class="jev-help"> / {{recipe.questions[key].criteria.length-1}}</span></div>
            <div v-if="answer.type==='score'" class="jev-score-meter" :aria-label="'Score '+score(answer.score)+' on a scale from 0 to '+(recipe.questions[key].criteria.length-1)"><div class="jev-score-line"><span :style="{left:(answer.score/(recipe.questions[key].criteria.length-1)*100)+'%'}"/></div><div class="jev-score-ends"><span>{{display(recipe.questions[key].criteria[0])}}</span><span>{{display(recipe.questions[key].criteria.at(-1))}}</span></div></div>
            <div v-for="(value,option) in answer.probabilities" :key="option" class="jev-probability"><div class="jev-row"><span>{{answer.type==='score' ? display(recipe.questions[key].criteria[Number(option)]) : recipe.presentation?.questions?.[key]?.optionLabels?.[option] || label(option)}}</span><span>{{percent(value)}}</span></div><div class="jev-track"><div :style="{width:(value*100)+'%'}"/></div></div>
            <details class="jev-confidence"><summary>{{answer.confidence==null?'Confidence unavailable':'Confidence '+answer.confidence.toFixed(2)}}</summary><p>Confidence describes how concentrated the probabilities are across the alternatives. It is not measured accuracy.</p></details>
          </template>
          <details class="jev-criteria"><summary>Question &amp; criteria</summary><p>{{display(recipe.questions[key].instructions)}}</p><pre>{{JSON.stringify(recipe.questions[key].criteria,null,2)}}</pre></details>
        </article>`,
}
