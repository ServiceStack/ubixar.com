export default {
    template:`<div class="flex flex-wrap md:flex-nowrap w-full">
    <div class="flex flex-col flex-grow pr-4 overflow-y-auto md:h-screen md:pl-1" style="">
        <div>
            <div id="top" ref="refTop"></div>
            <div class="text-base px-3 m-auto lg:px-1 pt-3">
                <slot name="main"></slot>

                <div id="bottom" ref="refBottom"></div>
            </div>
        </div>
    </div>
    <div class="w-full sm:w-72 md:w-92 h-screen md:border-l h-full md:py-2 md:px-2 bg-white">
        <slot name="sidebar"></slot>
    </div>
</div>`,
    setup(props, { expose }) {
        const refTop = ref()
        const refBottom = ref()

        expose({ refTop, refBottom })

        return { refTop, refBottom }
    }
}