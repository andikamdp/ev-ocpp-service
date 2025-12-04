import WebSocket from "ws";
import {MessageTypeId} from "../utils/types";
import type {OcppAction, OcppCall, OcppCallResult, OcppCallError} from "../utils/types";
import {
    handleBootNotification,
    handleHeartbeat,
    handleStatusNotification,
    handleStartTransaction,
    handleStopTransaction,
    handleMeterValues, handleAuthorize,

} from "../service/handlers";

type HandlerFn = (requestId: string, cpId: string, payload: unknown) => Promise<any>;

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
        console.info("incomming request request-id:%s | chargePointId:%s | request-type-id:%s | payload:%s ", msg[1], chargePointId, msg[2], JSON.stringify(msg[3]));
        const messageTypeId = Number(msg[0]) as MessageTypeId;

        switch (messageTypeId) {
            case MessageTypeId.CALL:
                await handleCall(ws, msg[1], chargePointId, msg as OcppCall);
                break;
            case MessageTypeId.CALLRESULT:
            case MessageTypeId.CALLERROR:
                // For now we’re acting purely as central system; usually we’d log responses
                console.info("Received response from CP request-id:%s ", msg[1]);
                break;
            default:
                console.error("Unsupported MessageTypeId request-id:%s ", msg[1]);
        }
    });
}

async function handleCall(ws: WebSocket, requestId: string, chargePointId: string, call: OcppCall) {
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
        const resPayload = await handler(requestId, chargePointId, payload);
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
        console.error("Error handling call:", {
            error: err?.message,
            stack: err?.stack
        });

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
