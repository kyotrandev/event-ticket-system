#!/usr/bin/env bash
set -e

/opt/wait-for-it.sh postgres:5432
npm run migration:run
npm run seed:run:relational
export NODE_OPTIONS="--max-old-space-size=256"
npm run start:prod
