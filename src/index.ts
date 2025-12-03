import http from "http";
import WebSocket, {WebSocketServer} from "ws";
import express from "express";
import {registerOcppConnection} from "./controller/router";
import {OCPP_PORT} from "./config/ParameterConfig";

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

// WebSocket server for OCPP (WS/WSS is controlled by reverse proxy / TLS termination)
const wss = new WebSocketServer({server: httpServer});

httpServer.listen(OCPP_PORT, () => {
    console.log(`OCPP WebSocket + HTTP API listening on port ${OCPP_PORT}`);
});

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