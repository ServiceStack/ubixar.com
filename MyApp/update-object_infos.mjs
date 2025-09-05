#!/usr/bin/env node

import fs from 'fs'

const replaceTokensStartingWith = [
    "hf_tC",
    "f84",
    "ak-b",
]
const saveTo = [
    './wwwroot/data/object_info.gateway.json',
    '../MyApp.Tests/files/object_info.json',
]

async function main() {
    let objectInfoJson = await (await fetch('http://localhost:8188/api/object_info')).text()

    // Use regex to replace string tokens
    for (const pattern of replaceTokensStartingWith) {
        objectInfoJson = objectInfoJson.replace(
            new RegExp(`"${pattern}[^"]*"`, "g"),
            '"***"'
        )
    }

    for (const path of saveTo) {
        console.log(`Saving to ${path}`)
        fs.writeFileSync(path, objectInfoJson)
    }
}

main()