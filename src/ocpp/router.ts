import WebSocket from "ws";
import {MessageTypeId} from "./types";
import type {OcppAction, OcppCall, OcppCallResult, OcppCallError} from "./types";
import {
    handleBootNotification,
    handleHeartbeat,
    handleStatusNotification,
    handleStartTransaction,
    handleStopTransaction,
    handleMeterValues, handleAuthorize,

} from "./handlers";

type HandlerFn = (cpId: string, payload: unknown) => Promise<any>;

const handlers: Record<OcppAction, HandlerFn> = {
    BootNotification: handleBootNotification,
    Heartbeat: handleHeartbeat,
    StatusNotification: handleStatusNotification,
    StartTransaction: handleStartTransaction,
    StopTransaction: handleStopTransaction,
    MeterValues: handleMeterValues,
    Authorize: handleAuthorize
};

export function registerOcppConnection(ws: WebSocket, chargePointId: string) {
    ws.on("message", async (raw) => {
        let msg: any;

        try {
            msg = JSON.parse(raw.toString());
        } catch (err) {
            console.error("Invalid JSON:", err);
            return;
        }

        if (!Array.isArray(msg) || msg.length < 3) {
            console.error("Invalid OCPP frame:", msg);
            return;
        }

        const messageTypeId = Number(msg[0]) as MessageTypeId;

        switch (messageTypeId) {
            case MessageTypeId.CALL:
                await handleCall(ws, chargePointId, msg as OcppCall);
                break;
            case MessageTypeId.CALLRESULT:
            case MessageTypeId.CALLERROR:
                // For now we’re acting purely as central system; usually we’d log responses
                console.log("Received response from CP", chargePointId, msg);
                break;
            default:
                console.error("Unsupported MessageTypeId", messageTypeId);
        }
    });
}

async function handleCall(ws: WebSocket, chargePointId: string, call: OcppCall) {
    const [, uniqueId, action, payload] = call;
    const actionName = action as OcppAction;
    const handler = handlers[actionName];

    if (!handler) {
        const err: OcppCallError = [
            MessageTypeId.CALLERROR,
            uniqueId,
            "NotImplemented",
            `Action ${actionName} not supported`,
            {}
        ];
        ws.send(JSON.stringify(err));
        return;
    }

    try {
        const resPayload = await handler(chargePointId, payload);
        const response: OcppCallResult = [MessageTypeId.CALLRESULT, uniqueId, resPayload];
        ws.send(JSON.stringify(response));
    } catch (err: any) {
        let msg = "Unknown error";

        if (err instanceof Error) {
            msg = err.message;
        } else {
            try {
                msg = JSON.stringify(err);
            } catch {
                msg = String(err);
            }
        }
        // Don't let console.error try to inspect weird objects
        console.error("Error handling call:", msg);

        const errorResponse: OcppCallError = [
            MessageTypeId.CALLERROR,
            uniqueId,
            "InternalError",
            msg,
            {}
        ];
        ws.send(JSON.stringify(errorResponse));
    }
}
