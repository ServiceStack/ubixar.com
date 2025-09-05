#!/usr/bin/env bash

# Replaces 'AssetDownloader' nodes with 'RequiresAsset' nodes in all workflows in ./workflows

set -e
shopt -s globstar

# iterate over all files in ./workflows
for file in ./workflows/**/*.json; do
  # replace AssetDownloader with RequiresAsset
  sed -i 's/"type": "AssetDownloader"/"type": "RequiresAsset"/g' "$file"
done