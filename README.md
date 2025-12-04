# EV OCPP 1.6j Charging Backend

## Features
- Full OCPP 1.6 CALL/CALLRESULT system
- BootNotification, Authorize, Heartbeat
- StartTransaction, StopTransaction
- MeterValues stored in TimescaleDB hypertable
- Billing engine (PricePerKWh)
- WebSocket Connection Registry
- HTTP API for configuration
- Zod-based message validation
- Docker-ready deployment

## Architecture
(diagram provided)

## Database Schema
(tables explanation)

## How to Run
docker-compose up -d
npm install
npm start

## Testing with .http
(api.http examples)

## Log Format
(JSON structured logs)

## TODO Roadmap
(...)
