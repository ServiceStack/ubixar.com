import { inject } from "vue"
import { reactionCounts } from "../lib/utils.mjs"

export default {
    template:`
    <div v-if="artifact" class="text-sm flex items-center justify-between w-full">
        <button v-for="(count,emoji) of reactionCounts(artifact.reactions)" type="button" @click.prevent.stop="toggleArtifactReaction(artifact, emoji)"
                :title="'React with ' + emoji"
                class="px-1 py-0.5 lg:px-2 rounded border" :class="[ store.hasArtifactReaction(artifact.id, emoji) ? 'shadow-sm bg-gray-200 dark:bg-gray-700' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700' ]">
            <div>
                <span class="flex gap-1">
                    <div :class="{ 'text-red-500': emoji == '❤' }">{{emoji}}</div> {{count}}
                </span>
            </div>
        </button>
        <button type="button">
            <div class="lg:px-1 p-0.5 shadow-sm rounded border bg-gray-200 dark:bg-gray-700">
                <span class="flex gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    <svg class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g fill="none"><path fill="currentColor" d="M11.5 13.8h-1.063c-1.53 0-2.294 0-2.583-.497s.088-1.162.844-2.491l2.367-4.167c.375-.66.563-.99.749-.94c.186.049.186.428.186 1.187V9.7c0 .236 0 .354.073.427s.191.073.427.073h1.063c1.53 0 2.294 0 2.583.497s-.088 1.162-.844 2.491l-2.367 4.167c-.375.66-.563.99-.749.94C12 18.247 12 17.868 12 17.109V14.3c0-.236 0-.354-.073-.427s-.191-.073-.427-.073"></path><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle></g>
                    </svg>
                    <div>{{artifact.credits ?? 0}}</div>
                </span>
            </div>
        </button>
    </div>
    `,
    emits: ['changed'],
    props: {
        artifact:Object,
    },
    setup(props, { emit }) {
        const store = inject('store')

        async function toggleArtifactReaction(artifact, reaction) {
            await store.toggleArtifactReaction(artifact.id, reaction)
            const latestArtifact = await store.getArtifact(artifact.id)
            if (latestArtifact) {
                emit('changed', latestArtifact)
            }
        }

        return {
            store,
            toggleArtifactReaction,
            reactionCounts,
        }
    }
}
