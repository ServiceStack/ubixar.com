import { Marked } from "./marked.min.mjs"

const marked = (() => {
    const ret = new Marked()
    //ret.use({ extensions: [divExtension()] })
    return ret
})()

export function renderMarkdown(body) {
    const rawHtml = marked.parse(body, { async:false })
    return rawHtml
}
