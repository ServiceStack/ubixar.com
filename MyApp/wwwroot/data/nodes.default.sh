#!/usr/bin/env bash

# command to display the list of node types from object_info.json
cat object_info.default.json | jq -r '.[] | .name' | sort > nodes.default.txt