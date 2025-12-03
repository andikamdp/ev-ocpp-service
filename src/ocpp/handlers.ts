import { query } from "../db";
import { z } from "zod";
import {
    BootNotificationReqSchema,
    BootNotificationResSchema,
    HeartbeatReqSchema,
    HeartbeatResSchema,
    StatusNotificationReqSchema,
    StartTransactionReqSchema,
    StartTransactionResSchema,
    StopTransactionReqSchema,
    StopTransactionResSchema,
    MeterValuesReqSchema,
    AuthorizeReqSchema,      // 👈 add this
    AuthorizeResSchema
} from "./zod-schemas";
import { isIdTagAuthorized } from "../auth/rfid";

export async function handleBootNotification(
    chargePointId: string,
    payload: unknown
) {
    const data = BootNotificationReqSchema.parse(payload);

    await query(
        `INSERT INTO charge_points (id, ocpp_version, model, vendor, last_boot)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE
       SET model = EXCLUDED.model,
           vendor = EXCLUDED.vendor,
           last_boot = now()`,
        [chargePointId, "1.6", data.chargePointModel, data.chargePointVendor]
    );

    const res = BootNotificationResSchema.parse({
        status: "Accepted",
        currentTime: new Date().toISOString(),
        interval: 60
    });

    return res;
}

export async function handleHeartbeat(
    chargePointId: string,
    payload: unknown
) {
    HeartbeatReqSchema.parse(payload); // no fields
    return HeartbeatResSchema.parse({
        currentTime: new Date().toISOString()
    });
}

export async function handleStatusNotification(
    chargePointId: string,
    payload: unknown
) {
    const data = StatusNotificationReqSchema.parse(payload);

    await query(
        `INSERT INTO connector_status (charge_point_id, connector_id, status, error_code, ts)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))`,
        [
            chargePointId,
            data.connectorId,
            data.status,
            data.errorCode,
            data.timestamp ?? null
        ]
    );

    return {};
}

export async function handleStartTransaction(
    chargePointId: string,
    payload: unknown
) {
    const data = StartTransactionReqSchema.parse(payload);

    const authorized = await isIdTagAuthorized(data.idTag);
    console.log("start authorize");
    if (!authorized) {
        console.log("not authorize");
        return StartTransactionResSchema.parse({
            transactionId: 0,
            idTagInfo: { status: "Blocked" }
        });
    }
    console.log("is authorize");
    const [row] = await query<{ id: number }>(
        `INSERT INTO transactions (charge_point_id, connector_id, id_tag, meter_start, start_ts, status)
   VALUES ($1, $2, $3, $4, $5, 'Active')
   RETURNING id`,
        [
            chargePointId,
            data.connectorId,
            data.idTag,
            data.meterStart,
            data.timestamp
        ]
    );

    const transactionId = row?.id ?? 0; // fallback if row is undefined
    console.log("start transactionId");
    console.log(transactionId);
    return StartTransactionResSchema.parse({
        transactionId,
        idTagInfo: { status: transactionId ? "Accepted" : "Blocked" }
    });
}

export async function handleStopTransaction(
    chargePointId: string,
    payload: unknown
) {
    const data = StopTransactionReqSchema.parse(payload);

    await query(
        `UPDATE transactions
     SET meter_stop = $1, stop_ts = $2, status = 'Completed'
     WHERE id = $3`,
        [data.meterStop, data.timestamp, data.transactionId]
    );

    return StopTransactionResSchema.parse({
        idTagInfo: { status: "Accepted" }
    });
}

export async function handleMeterValues(
    chargePointId: string,
    payload: unknown
) {
    const data = MeterValuesReqSchema.parse(payload);

    for (const mv of data.meterValue) {
        for (const sv of mv.sampledValue) {
            await query(
                `INSERT INTO meter_values
         (charge_point_id, connector_id, transaction_id, ts, measurand, value, unit, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    chargePointId,
                    data.connectorId,
                    data.transactionId ?? null,
                    mv.timestamp,
                    sv.measurand ?? "Energy.Active.Import.Register",
                    Number(sv.value),
                    sv.unit ?? "Wh",
                    sv.context ?? null
                ]
            );
        }
    }

    return {};
}

export async function handleAuthorize(
    chargePointId: string,
    payload: unknown
) {
    console.log(`[Authorize] from CP=${chargePointId}`, payload);

    const data = AuthorizeReqSchema.parse(payload);

    // optional: you can log unknown tags here
    const authorized = await isIdTagAuthorized(data.idTag);

    const status = authorized ? "Accepted" : "Blocked";

    const res = AuthorizeResSchema.parse({
        idTagInfo: { status }
    });

    console.log(`[Authorize] result for idTag=${data.idTag}: ${status}`);

    return res;
}
