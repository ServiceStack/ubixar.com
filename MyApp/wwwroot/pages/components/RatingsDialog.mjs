import { ref, watch, inject } from "vue"
import { formatRating } from "../lib/utils.mjs"

export default {
    template:`
    <!-- Ratings Picker Modal -->
    <ModalDialog @done="$emit('done')" size-class="w-full max-w-md">
        <div class="bg-white dark:bg-gray-800 px-6 py-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Filter by Ratings</h3>
                <button @click="$emit('done')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                        <button
                            v-for="rating in ['PG', 'PG13', 'M', 'R', 'X', 'XXX']"
                            :key="rating"
                            @click="toggleRating(rating)"
                            :disabled="!store.isOver18 && ['R', 'X', 'XXX'].includes(rating)"
                            :class="[
                                'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                                !store.isOver18 && ['R', 'X', 'XXX'].includes(rating)
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                    : store.selectedRatings.includes(rating)
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
                            v-model="store.isOver18"
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
    emits:['done'],
    setup(props, { emit }) {
        const store = inject('store')

        // Watch for over18 changes to remove adult ratings when unchecked
        watch(() => store.isOver18, (newValue) => {
            if (!newValue) {
                // Remove any adult ratings when unchecking over 18
                store.selectedRatings = store.selectedRatings.filter(rating => !['R', 'X', 'XXX'].includes(rating))
                // Auto-save to localStorage
                store.saveSelectedRatings()
            }
        })

        // Ratings picker functions
        function toggleRating(rating) {
            // Don't allow toggling adult ratings if not over 18
            if (!store.isOver18 && ['R', 'X', 'XXX'].includes(rating)) {
                return
            }

            const index = store.selectedRatings.indexOf(rating)
            if (index > -1) {
                store.selectedRatings.splice(index, 1)
            } else {
                store.selectedRatings.push(rating)
            }

            // Auto-save to localStorage
            store.saveSelectedRatings()
        }

        return {
            store,
            toggleRating,
            formatRating,            
        }
    }
}