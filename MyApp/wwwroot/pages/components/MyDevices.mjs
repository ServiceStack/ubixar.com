import { ref, onMounted, onUnmounted, inject, unref } from "vue"
import { useClient, useAuth, useUtils } from "@servicestack/vue"
import { Inspect } from "@servicestack/client"
import { useRouter, useRoute } from "vue-router"
import { MyDevices, AgentInfo } from "../../mjs/dtos.mjs"
import ShellCommand from "./ShellCommand.mjs"
import DeviceInfo from "./DeviceInfo.mjs"

export class UserApiKeyResponse {
    /** @param {{result?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    result;
    /** @type {ResponseStatus} */
    responseStatus;
}
export class CreateUserApiKey {
    /** @param {{name?:string,scopes?:string[],features?:string[],restrictTo?:string[],expiryDate?:string,notes?:string,refId?:number,refIdStr?:string,meta?:{ [index: string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    name;
    /** @type {string[]} */
    scopes;
    /** @type {string[]} */
    features;
    /** @type {string[]} */
    restrictTo;
    /** @type {?string} */
    expiryDate;
    /** @type {string} */
    notes;
    /** @type {?number} */
    refId;
    /** @type {string} */
    refIdStr;
    /** @type {{ [index: string]: string; }} */
    meta;
    getTypeName() { return 'CreateUserApiKey' }
    getMethod() { return 'POST' }
    createResponse() { return new UserApiKeyResponse() }
}

const CopyIcon = {
    template:`
      <div @click="copy(text)">
          <div class="cursor-pointer select-none p-1 rounded-md border block border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900">
            <svg v-if="copied" class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-500" viewBox="0 0 24 24"><g fill="none"><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>
          </div>
      </div>
    `,
    props:['text'],
    setup(props) {
        const { copyText } = useUtils()
        const copied = ref(false)

        function copy(text) {
            copied.value = true
            copyText(text)
            setTimeout(() => copied.value = false, 3000)
        }
        return { copied, copy, }
    }
}

export default {
    components: {
        ShellCommand,
        CopyIcon,
        DeviceInfo,
    },
    template:`
    <div class="p-6">
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">My Devices</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and monitor your connected ComfyUI devices
            </p>
        </div>

        <!-- Devices Grid -->
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DeviceInfo v-for="device in store.myDevices" :device="device" @deleted="store.myDevices = store.myDevices.filter(x => x.id != device.id)" />
        </div>


      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 v-if="store.myDevices.length" class="my-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Add a new Device</h2>
        <div v-else>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No devices found</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get unlimited generations by using your own NVIDIA GPU
          </p>
        </div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          To connect your own ComfyUI instance
          <a href="https://github.com/ServiceStack/comfy-agent" class="text-blue-500 dark:text-blue-400 hover:underline" target="_blank">install comfy-agent</a>:
        </p>
        <div class="mt-4 mx-auto max-w-xl flex flex-col gap-2">
          <ShellCommand>cd custom_nodes</ShellCommand>
          <ShellCommand>git clone https://github.com/ServiceStack/comfy-agent</ShellCommand>
          <ShellCommand>pip install -r ./comfy-agent/requirements.txt</ShellCommand>
        </div>
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Your instance can be configured in the <em>ComfyAgentNode</em> in <b>comfy_agent</b> category:
        </p>
        <div class="my-8">
          <img src="/img/agent/configure.webp" alt="" class="rounded-lg shadow-lg">
        </div>
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          The only required property is <em>apikey</em> which can be created below:
        </p>
        <div v-if="!apiKey">
          <PrimaryButton class="mt-4" @click="createApiKey">Create API Key</PrimaryButton>
        </div>
        <ModalDialog v-else size-class="w-96" @done="apiKey=''">
          <div class="bg-white dark:bg-black px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="">
              <div class="mt-3 text-center sm:mt-0 sm:mx-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">New API Key</h3>
                <div class="pb-4">
                  <div class="space-y-6 pt-6 pb-5">
                    <div class="flex">
                      <TextInput id="apikey" type="text" v-model="apiKey" label="" @focus="$event.target.select()" readonly
                                 help="Make sure to copy your new API Key now as it wont be available later" />
                      <CopyIcon :text="apiKey" class="mt-1 ml-1" />
                    </div>
                  </div>
                  <div>
                    <PrimaryButton @click="apiKey=''" class="w-full">Close</PrimaryButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalDialog>

        <div class="mt-12">
          <h3 class="mt-4 mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Download Models</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            You'll need to add your tokens to auto download protected models from Hugging Face, Civit AI or GitHub.
          </p>
          <h3 class="mt-4 mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Access Large Language Models</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            You can access your Ollama models by configuring <b>ollama_url</b> with the
            URL to your ollama server accessible from your ComfyUI instance.
            E.g. <b>http://localhost:11434</b> when running ollama on the same host, or 
            when running ComfyUI in Docker you should use <b>http://host.docker.internal:11434</b>
          </p>
        </div>
      </div>
      
    </div>
    `,
    setup() {
        const client = useClient()
        const { user } = useAuth()
        const store = inject('store')
        const apiKey = ref('')
        const loading = ref(false)
        let updateTimer = null

        async function update() {
            const startedAt = Date.now()
            loading.value = true
            try {
                const lastUpdate = store.myDevices.length 
                    ? store.myDevices.map(x => x.lastUpdate).sort().pop() 
                    : null
                const request = new MyDevices()
                if (lastUpdate) {
                    request.afterModifiedDate = lastUpdate
                }
                const api = await store.loadMyDevices(request)
                if (api.succeeded) {
                    console.log('MyDevices GPUs', Inspect.printDump(store.myDevices.map(x => x.gpus)),
                        store.myDevices.map(x => x.queueCount))
                }
            } catch (error) {
                console.error('Failed to load devices:', error)
            } finally {
                loading.value = false
            }
            clearTimeout(updateTimer)
            const timeRemaining = 5000 - (Date.now() - startedAt)
            updateTimer = setTimeout(update, Math.max(timeRemaining, 1000))
        }
        
        onMounted(async () => {
            await update()
        })
        onUnmounted(() => clearTimeout(updateTimer))
        
        async function createApiKey() {
            console.log('createApiKey')
            const request = ref(new CreateUserApiKey({
                name: `${user.value.userName} API Key`
            }))
            const api = await client.api(request.value)
            if (api.succeeded) {
                apiKey.value = api.response.result
            }
        }

        return {
            store,
            loading,
            apiKey,
            createApiKey,
        }
    }
}