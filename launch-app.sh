#!/bin/bash
cd "$(dirname "$0")"
./node_modules/.bin/electron app-electron/dist/main.js
