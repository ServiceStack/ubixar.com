#!/usr/bin/env bash

# Converts all workflows in ./workflows to API prompts in ./api-prompts
# by running the to-api-prompt.ts script.
# Usage: ../../to-api-prompt.ts ./object_info.gateway.json "./workflows/Text to Image/SDXL/Jib Mix Realistic v16.v1.json" > "./api-prompts/Text to Image/SDXL/Jib Mix Realistic v16.v1.json"

set -e
shopt -s globstar

# iterate over all files in ./workflows
for file in ./workflows/**/*.json; do
    # get the relative path from the workflows directory
    rel_path="${file#./workflows/}"
    # get the directory of the relative path
    dir=$(dirname "$rel_path")
    # get the base name of the file
    base=$(basename "$file")
    
    # create the output directory if it doesn't exist
    mkdir -p "./api-prompts/$dir"
    
    # run the to-api-prompt.ts script and redirect output to the output file
    ../../to-api-prompt.ts ./object_info.gateway.json "$file" > "./api-prompts/$dir/$base"
done