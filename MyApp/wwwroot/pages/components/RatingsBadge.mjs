import { inject } from "vue"
import { getRatingDisplay, getRatingColorClass, getRatingDescription } from "../lib/utils.mjs"

export default {
    template:`
    <span v-if="getRatingDisplay(artifact)" 
          class="inline-flex items-center rounded-md font-bold ring-1 ring-inset transition-all duration-200 cursor-default"
          :class="(size==='lg' ? 'px-6 py-3 text-lg ' : size==='xs' ? 'px-1 py-0.5 text-xs ' : 'px-2 py-1 text-xs ') + getRatingColorClass(getRatingDisplay(artifact))"
          :title="getRatingDescription(getRatingDisplay(artifact))">
        {{ getRatingDisplay(artifact) }}
    </span>
    `,
    props: {
        artifact:Object,
        size:String,
    },
    setup() {
        const store = inject('store')
        return {
            store,
            getRatingDisplay,
            getRatingColorClass,
            getRatingDescription,
        }
    }
}
