#!/usr/bin/env bash

set -e

git submodule init && git submodule update

# setup tramonline
(cd ./trampoline && yarn install)

# setup frontend
(cd ./frontend && yarn install)
