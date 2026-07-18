import {inject, ref, watch} from "vue"
import { Rating, UpdatePreferences } from "../../mjs/dtos.mjs"
import {Authenticate} from "../dtos.mjs";

export function formatRating(rating) {
    return rating?.replace('PG13', 'PG-13')
}

export const RatingsDialog = {
    template:`
    <!-- Ratings Picker Modal -->
    <ModalDialog @done="$emit('done')" size-class="w-full max-w-md">
        <div class="bg-white dark:bg-gray-800 px-6 py-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Filter by Ratings</h3>
                <button type="button" @click="$emit('done')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="space-y-4">
                <!-- All ratings on one line -->
                <div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button"
                            v-for="rating in ['PG', 'PG13', 'M', 'R', 'X', 'XXX']"
                            :key="rating"
                            @click="toggleRating(rating)"
                            :disabled="!$ctx.prefs.isOver18 && ['R', 'X', 'XXX'].includes(rating)"
                            :class="[
                                'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                                !$ctx.prefs.isOver18 && ['R', 'X', 'XXX'].includes(rating)
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                    : $ctx.state.selectedRatings.includes(rating)
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            ]"
                        >
                            {{ formatRating(rating) }}
                        </button>
                    </div>
                </div>

                <!-- Adult content checkbox -->
                <div class="pt-3">
                    <div class="flex items-center">
                        <input
                            id="over18"
                            v-model="$ctx.prefs.isOver18"
                            type="checkbox"
                            class="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                        >
                        <label for="over18" class="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                            I'm over 18 years old
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </ModalDialog>
    `,
    emits:['done','changed'],
    setup(props, { emit }) {
        const ctx = inject('ctx')

        async function saveSelectedRatings() {
            await ctx.saveSelectedRatings()
            emit('changed')
        } 
        
        // Watch for over18 changes to remove adult ratings when unchecked
        watch(() => ctx.prefs.isOver18, (newValue) => {
            ctx.savePrefs()
            if (!newValue) {
                // Remove any adult ratings when unchecking over 18
                ctx.state.selectedRatings = ctx.state.selectedRatings.filter(rating => !['R', 'X', 'XXX'].includes(rating))
                // Auto-save to localStorage
                saveSelectedRatings()
            }
        })

        // Ratings picker functions
        function toggleRating(rating) {
            // Don't allow toggling adult ratings if not over 18
            if (!ctx.prefs.isOver18 && ['R', 'X', 'XXX'].includes(rating)) {
                return
            }

            const index = ctx.state.selectedRatings.indexOf(rating)
            if (index > -1) {
                ctx.state.selectedRatings.splice(index, 1)
            } else {
                ctx.state.selectedRatings.push(rating)
            }

            // Auto-save to localStorage
            saveSelectedRatings()
        }

        return {
            toggleRating,
            formatRating,
        }
    }
}

export const VisibilityIcon = {
    components: {
        RatingsDialog,
    },
    template:`
        <span class="inline-flex items-center">
            <button type="button" class="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                    @click="openDialog" :title="($ctx.state.user ? '' : 'SignIn to ') + 'Toggle Ratings Visibility'">
                <svg class="size-6 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22L21 20.73L3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7"/></svg>
                <slot></slot>
            </button>
            <RatingsDialog v-if="showDialog" @done="showDialog=false" @changed="$emit('changed')" />
        </span>
    `,
    emits: ['changed'],
    setup() {
        const ctx = inject('ctx')
        const showDialog = ref(false)
        
        function openDialog() {
            if (!ctx.state.user) {
                // location.href = '/Account/Login?ReturnUrl=' + encodeURIComponent(location.href)
                ctx.showSignIn()
            } else {
                showDialog.value = true
            }
        }

        return {
            showDialog,
            openDialog,
        }
    }
}

export const SignInModal = {
    template: `
    <div class="min-h-full -mt-12 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-50">
                Sign In
            </h2>
        </div>
        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <ErrorSummary v-if="errorSummary" class="mb-3" :status="errorSummary" />
            <div class="bg-white dark:bg-black py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <form @submit.prevent="submit">
                    <div class="flex flex-1 flex-col justify-between">
                        <div class="space-y-6">
                            <fieldset class="grid grid-cols-12 gap-6">
                                <div class="w-full col-span-12">
                                  <TextInput id="userName" name="userName" label="User Name" v-model="request.userName" />
                                </div>
                                <div class="w-full col-span-12">
                                  <TextInput id="password" name="password" label="Password" type="password" v-model="request.password" />
                                </div>
                            </fieldset>
                        </div>
                    </div>
                    <div class="mt-8">
                        <PrimaryButton class="w-full">Sign In</PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    </div>     
    `,
    setup(props, { emit }) {
        const ctx = inject('ctx')
        const request = ref(new Authenticate({ provider:'credentials' }))
        const errorSummary = ref()
        async function submit() {
            const api = await ctx.client.api(request.value)
            if (api.response) {
                location.reload()
            } else {
                errorSummary.value = api.error || {
                    errorCode: "Unauthorized",
                    message: 'Invalid User Name or Password'
                }
            }
        }

        return {
            request,
            submit,
            errorSummary,
        }
    }
}