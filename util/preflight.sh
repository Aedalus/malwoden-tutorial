#!/usr/bin/env bash
set -ue

dirs=$(find -maxdepth 1 -name "chapter-*" -type d)

for dir in $dirs; do
    echo "Preflight for $dir"
    cd $dir
    npm install
    npm run lint
    npm run fmt
    npm run build

    cd - 
done
