import { ref, onMounted, inject } from "vue"
import { useConfig } from "@servicestack/vue"
import { humanifyNumber } from "../lib/utils.mjs"
import VisibilityIcon from "./VisibilityIcon.mjs"
import AchievementsButton from "./AchievementsButton.mjs"
import NotificationsButton from "./NotificationsButton.mjs"

const AntiforgeryToken = {
    template:`
        <input type="hidden" name="__RequestVerificationToken" :value="store.csrfToken" />
    `,
    setup() {
        const store = inject('store')
        return {
            store,
        }
    }
}

export default {
    components: {
        AntiforgeryToken,
        VisibilityIcon,
        AchievementsButton,
        NotificationsButton,
    },
    template:`
<header class="pr-3 bg-slate-50 dark:bg-slate-900">
    <div class="flex flex-wrap items-center">
        <div class="absolute z-10 top-2 left-2 sm:static flex-shrink flex-grow-0">
            <div class="cursor-pointer">
                <RouterLink :to="{ path:'/' }" class="navbar-brand flex items-center">
                    <img class="inline-block dark:hidden w-6 h-6 sm:ml-2 sm:w-8 sm:h-8" :src="store.appConfig.appIcon.replace('currentColor','%23000')" alt="Logo">
                    <img class="hidden dark:inline-block w-6 h-6 sm:ml-2 sm:w-8 sm:h-8" :src="store.appConfig.appIcon.replace('currentColor','%23fff')" alt="Logo">
                    <span class="hidden ml-2 sm:block text-2xl font-semibold">{{store.appConfig.appName}}</span>
                </RouterLink>
            </div>
        </div>
        <div class="flex flex-grow flex-shrink flex-nowrap justify-end items-center">
            <nav class="relative flex flex-grow leading-6 font-semibold text-slate-700 dark:text-slate-200">
                <ul class="flex flex-wrap items-center justify-end w-full m-0">
                    <li class="relative flex flex-wrap just-fu-start m-0">
                        <RouterLink :to="{ path:'/images' }" class="p-4 flex items-center justify-start mw-full hover:text-sky-500 dark:hover:text-sky-400" :class="$route.path.startsWith('/images') ? 'text-blue-700 dark:text-blue-300' : ''">
                            Images
                        </RouterLink>
                    </li>
                    <li class="relative flex flex-wrap just-fu-start m-0">
                        <RouterLink :to="{ path:'/audio' }" class="p-4 flex items-center justify-start mw-full hover:text-sky-500 dark:hover:text-sky-400" :class="$route.path.startsWith('/audio') ? 'text-blue-700 dark:text-blue-300' : ''">
                          Audio
                        </RouterLink>
                    </li>
                    <li class="relative flex flex-wrap just-fu-start m-0">
                        <RouterLink :to="{ path:'/generate' }" class="p-4 flex items-center justify-start mw-full hover:text-sky-500 dark:hover:text-sky-400" :class="$route.path.startsWith('/generate') ? 'text-blue-700 dark:text-blue-300' : ''">
                            Generate
                        </RouterLink>
                    </li>
                    <li class="relative flex flex-wrap just-fu-start m-0">
                        <a href="/blog" class="p-4 flex items-center justify-start mw-full hover:text-sky-500 dark:hover:text-sky-400" :class="$route.path.startsWith('/blog') ? 'text-blue-700 dark:text-blue-300' : ''">
                            Blog
                        </a>
                    </li>
                    <template v-if="user">
                        <li>
                            <div class="mx-3 relative" :title="'@' + user.userName + ' karma: '  + (store.info?.karma ?? 0)">
                                <div>
                                    <a href="/Account/Manage"
                                        class="max-w-xs rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 lg:p-2 lg:rounded-md lg:hover:bg-gray-50 dark:lg:hover:bg-gray-800 dark:ring-offset-black" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                                        <img class="h-8 w-8 rounded-full" :src="user.profileUrl" alt="">
                                        <span id="karma" class="hidden ml-3 text-yellow-700 dark:text-yellow-300 text-sm font-medium lg:block">
                                            <span class="sr-only">Open user menu for </span>
                                            {{humanifyNumber(store.info?.karma ?? 0)}}
                                        </span>
                                    </a>
                                </div>
                            </div>
                        </li>
                        <li class="mr-2 static sm:relative flex flex-wrap just-fu-start m-0" :title="'Vue Achievements'">
                            <AchievementsButton class="select-none group relative hover:bg-gray-100 dark:hover:bg-gray-800 p-4 cursor-pointer">
                              <svg class="w-6 h-6 cursor-pointer text-green-400 group-hover:text-gray-500 dark:group-hover:text-sky-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8 3h8v8h6v10H2V9h6zm2 16h4V5h-4zm6 0h4v-6h-4zm-8 0v-8H4v8z"/></svg>
                            </AchievementsButton>
                        </li>
                        <li class="static sm:relative flex flex-wrap just-fu-start m-0">
                            <NotificationsButton class="select-none group relative hover:bg-gray-100 dark:hover:bg-gray-800 p-4 cursor-pointer">
                              <svg class="w-6 h-6 text-green-400 group-hover:text-gray-500 dark:group-hover:text-sky-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14v-3h-3q-.75.95-1.787 1.475T12 18q-1.175 0-2.212-.525T8 16H5zm7-3q.95 0 1.725-.55T14.8 14H19V5H5v9h4.2q.3.9 1.075 1.45T12 16m-7 3h14z"/></svg>
                            </NotificationsButton>
                        </li>
                    </template>
                    <template v-else>
                        <li class="relative flex flex-wrap just-fu-start m-0">
                            <a href="/Account/Login" class="m-2 mr-4">
                                <SecondaryButton>
                                    Sign In
                                </SecondaryButton>
                            </a>
                        </li>
                    </template>
                    <li class="relative flex flex-wrap just-fu-start mx-4 w-8">
                        <div title="Ratings Visibility">
                            <VisibilityIcon />
                        </div>
                    </li>
                    <li class="relative flex flex-wrap just-fu-start m-0">
                        <DarkModeToggle />
                    </li>
                </ul>
            </nav>
        </div>
    </div>
</header>
    `,
    // Header.mjs can't access providers with inject
    props: {
        store: Object,
        events: Object,
        user: Object,
    },
    setup(props) {
        
        const config = useConfig()
        config.inputValue = (type,value) => typeof value == 'number'
            ? value 
            : value
        
        const refForm = ref()
        async function preSignOut() {
            console.log('preSignOut')
            await props.store.clearUserDb()
        }
        
        onMounted(() => {
            console.log('Header.onMounted')
        })
        
        return {
            refForm,
            preSignOut,
        }
    }
}
