#!/usr/bin/env bash

# command to display the list of node types from object_info.json
cat object_info.gateway.json | jq -r '.[] | .name' | sort > nodes.gateway.txt