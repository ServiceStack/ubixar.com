import { ref, inject, onMounted, onUnmounted } from "vue"
import ArtifactMenu from "./ArtifactMenu.mjs"

export default {
    components: {
        ArtifactMenu,
    },
    template: `
        <ArtifactMenu :menu="menu" @close="menu.show = false" />
    `,
    setup() {
        const store = inject('store')
        const events = inject('events')
        const menu = ref({
            show: false,
            x: 0,
            y: 0,
            image: null
        })

        function handleKeydown(event) {
            switch (event.key) {
                case "Escape":
                    if (menu.value.show) {
                        closeMenu()
                    }
                    break
            }
        }
        function closeMenu() {
            menu.value.show = false
        }

        let sub = null
        onMounted(async () => {
            sub = events.subscribe('showArtifactMenu', ({ event, artifactId }) => {
                console.log('showArtifactMenu', event, artifactId)
                store.findArtifact(artifactId).then(artifact => {
                    menu.value = {
                        show: true,
                        x: event.clientX,
                        y: event.clientY,
                        artifact,
                    }
                })
            })
            document.addEventListener("keydown", handleKeydown)
        })

        onUnmounted(() => {
            sub?.unsubscribe()
            document.removeEventListener("keydown", handleKeydown)
        })
        
        return {
            menu,
        }
    }
}