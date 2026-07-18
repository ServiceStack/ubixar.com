import { inject, ref, onMounted, onUnmounted } from "vue";

export const UserAvatar = {
    template: `
        <div v-if="$ctx.state.user" class="relative">
            <button type="button" @click.stop="open = !open"
                :title="$ctx.state.user?.displayName || $ctx.state.user?.userName"
                class="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
                <img class="size-6 rounded-full" :src="$ctx.state.user.profileUrl" />
            </button>

            <!-- Backdrop closes the menu -->
            <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>

            <!-- Dropdown menu -->
            <div v-if="open"
                class="absolute right-0 mt-2 w-48 rounded-xl border shadow-2xl overflow-hidden text-sm z-50"
                :class="$styles.card">
                <div class="px-3 py-2 border-b" :class="$styles.chromeBorder">
                    <p class="font-semibold truncate" :class="$styles.heading">
                        {{ $ctx.state.user?.displayName || $ctx.state.user?.userName }}
                    </p>
                    <p v-if="$ctx.state.user?.userName" class="text-xs truncate" :class="$styles.muted">
                        {{ $ctx.state.user.userName }}
                    </p>
                </div>
                <button type="button" @click="signOut"
                    class="w-full flex items-center gap-2 px-3 py-2 text-left font-medium hover:bg-gray-200/60 dark:hover:bg-gray-700/40"
                    :class="$styles.heading">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const open = ref(false)

        function signOut() {
            open.value = false
            window.location.href = '/auth/logout?ReturnUrl=' + encodeURIComponent(window.location.href)
        }

        function onKey(e) { if (e.key === 'Escape') open.value = false }
        onMounted(() => window.addEventListener('keydown', onKey))
        onUnmounted(() => window.removeEventListener('keydown', onKey))

        return {
            ctx,
            open,
            signOut,
        }
    }
}
