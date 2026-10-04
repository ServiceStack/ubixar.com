import { ref } from 'vue'
export default {
    props: { recipe: Object },
    setup(props) {
        const busy = ref(false), error = ref(''), signIn = ref(false)
        async function toggle() {
            if (busy.value) return
            busy.value = true
            error.value = ''
            signIn.value = false
            try {
                const response = await fetch('/publish/decision/' + encodeURIComponent(props.recipe.externalRef) + '/star', {
                    method: 'PUT', redirect: 'manual',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Recipe-Star': '1' },
                    body: JSON.stringify({ starred: !props.recipe.starred }),
                })
                if (response.type === 'opaqueredirect' || response.status === 401) { signIn.value = true; return }
                if (!response.ok) throw Error('Could not update your star. Try again.')
                const state = await response.json()
                props.recipe.starCount = state.starCount
                props.recipe.starred = state.starred
            } catch (e) { error.value = e.message }
            finally { busy.value = false }
        }
        return { busy, error, signIn, toggle, returnUrl: '/Account/Login?ReturnUrl=' + encodeURIComponent(location.pathname + location.search + location.hash) }
    },
    template: `<span class="recipe-star-control"><button type="button" class="recipe-star" :disabled="busy" :aria-pressed="!!recipe.starred" :title="recipe.starred?'Remove your star':'Star this recipe'" :aria-label="recipe.starred?'Remove your star':'Star this recipe'" @click.stop="toggle"><svg viewBox="0 0 24 24" width="16" height="16" :fill="recipe.starred?'currentColor':'none'" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linejoin="round" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3"/></svg><span>{{recipe.starCount||0}}</span></button><a v-if="signIn" :href="returnUrl">Sign in to star</a><span v-if="error" class="recipe-star-error" role="alert">{{error}}</span></span>`,
}
