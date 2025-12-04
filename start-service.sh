#!/usr/bin/env bash

ENV=${1:-dev}

echo "Starting EV OCPP backend with environment: $ENV"

export APP_ENV=$ENV

npm run dev
