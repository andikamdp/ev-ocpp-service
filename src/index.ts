import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import { OCPP_PORT, HTTP_PORT } from "./config";
import { registerOcppConnection } from "./ocpp/router";
import { query } from "./db";



const app = express();
app.use(express.json());

/**
 * HTTP API – Station TAB configuration keys
 * These correspond to your STATION TAB (Authorization, HeartbeatInterval, etc.)
 * You can call them from your existing webapp.
 */

// Get config for CP
app.get("/api/charge-points/:id/config", async (req, res) => {
    const cpId = req.params.id;
    const rows = await query(
        "SELECT key, value, read_only FROM ocpp_configuration WHERE charge_point_id = $1",
        [cpId]
    );
    res.json(rows);
});

// Upsert a single config key
app.put("/api/charge-points/:id/config", async (req, res, next) => {
    try {
        const cpId = req.params.id;
        const { key, value, readOnly } = req.body as {
            key: string;
            value: string;
            readOnly?: boolean;
        };

        if (!key || value === undefined) {
            return res.status(400).json({ error: "key and value are required" });
        }

        // 1) Ensure charge point exists so FK doesn't fail
        await query(
            `INSERT INTO charge_points (id, ocpp_version, model, vendor)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
            [cpId, "1.6", "UnknownModel", "UnknownVendor"]
        );

        // 2) Upsert configuration key
        await query(
            `INSERT INTO ocpp_configuration (charge_point_id, key, value, read_only)
       VALUES ($1, $2, $3, COALESCE($4, FALSE))
       ON CONFLICT (charge_point_id, key)
       DO UPDATE SET value = EXCLUDED.value,
                     read_only = EXCLUDED.read_only,
                     updated_at = now()`,
            [cpId, key, value, readOnly ?? false]
        );

        res.json({ success: true });
    } catch (err) {
        next(err); // let Express handle it
    }
});

/**
 * Also optional endpoints for reading aggregates from TimescaleDB
 */
app.get("/api/charge-points/:id/energy-15m", async (req, res) => {
    const cpId = req.params.id;
    const rows = await query(
        `SELECT * FROM mv_energy_15m
      WHERE charge_point_id = $1
      ORDER BY bucket DESC
      LIMIT 96`,
        [cpId]
    );
    res.json(rows);
});

const httpServer = http.createServer(app);

// WebSocket server for OCPP (WS/WSS is controlled by reverse proxy / TLS termination)
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    // Example: /v1/ocpp/G1M8tVMvRwHePFtW0AT?ocppVersion=1.6&rfidTag=TEST_TAG_1
    const parts = url.pathname.split("/").filter(Boolean); // ["v1", "ocpp", "G1M8tVMvRwHePFtW0AT"]

    if (parts.length !== 3 || parts[0] !== "v1" || parts[1] !== "ocpp") {
        console.error("Invalid OCPP WS path:", url.pathname);
        ws.close(1008, "Invalid OCPP path");
        return;
    }

    const chargePointId = parts[2]; // G1M8tVMvRwHePFtW0AT

    const ocppVersion = url.searchParams.get("ocppVersion") || "1.6";
    const rfidTag = url.searchParams.get("rfidTag") || undefined;

    console.log(
        `Incoming OCPP connection: cpId=${chargePointId}, ocppVersion=${ocppVersion}, rfidTag=${rfidTag}`
    );

    // If you want to store ocppVersion / rfidTag somewhere, you can pass them to registerOcppConnection
    registerOcppConnection(ws, chargePointId);
});

httpServer.listen(OCPP_PORT, () => {
    console.log(`OCPP WebSocket + HTTP API listening on port ${OCPP_PORT}`);
});
