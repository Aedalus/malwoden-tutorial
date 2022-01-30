#!/usr/bin/env bash
set -ue

dirs=$(find -maxdepth 1 -name "chapter-*" -type d)

for dir in $dirs; do
    echo "fmt for $dir"
    cd $dir
    npm run fmt-fix

    cd -
done
