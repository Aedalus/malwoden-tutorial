#!/usr/bin/env bash
set -ue

SRC_DIR="chapter-1"
dirs=$(find -maxdepth 1 -name "chapter-*" -type d)

for dir in $dirs; do
    if [ "$dir" == "./${SRC_DIR}" ]; then
        echo "Skipping source dir"
    else
        echo "Copying into $dir"
        rsync $SRC_DIR/package.json $dir/package.json
        rsync $SRC_DIR/package-lock.json $dir/package-lock.json
        rsync -r $SRC_DIR/src/assets $dir/src --delete
    fi
done
