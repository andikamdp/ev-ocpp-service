import {
    AuthorizeReqSchema,
    AuthorizeResSchema,
    BootNotificationReqSchema,
    BootNotificationResSchema,
    HeartbeatReqSchema,
    HeartbeatResSchema,
    MeterValuesReqSchema,
    StartTransactionReqSchema,
    StartTransactionResSchema,
    StatusNotificationReqSchema,
    StopTransactionReqSchema,
    StopTransactionResSchema
} from "../utils/zod-schemas";
import {isIdTagAuthorized} from "../dao/RfIdDAO";
import {saveChargePoints} from "../dao/ChargePointDAO";
import {saveConnectorStatus} from "../dao/ConnectorStatuDAO";
import {saveTransaction, updateTransaction} from "../dao/TransactionDAO";
import {saveMeterValue} from "../dao/MeterValueDAO";

export async function handleBootNotification(
    requestId: string,
    chargePointId: string,
    payload: unknown
) {
    console.info("boot notification request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = BootNotificationReqSchema.parse(payload);

    await saveChargePoints(chargePointId, data);

    return BootNotificationResSchema.parse({
        status: "Accepted",
        currentTime: new Date().toISOString(),
        interval: 60
    });
}

export async function handleHeartbeat(
    requestId: string,
    chargePointId: string,
    payload: unknown
) {
    console.info("heartbeat request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    HeartbeatReqSchema.parse(payload);
    return HeartbeatResSchema.parse({
        currentTime: new Date().toISOString()
    });
}

export async function handleStatusNotification(
    requestId: string,
    chargePointId: string,
    payload: unknown
): Promise<void> {
    console.info("status notification request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = StatusNotificationReqSchema.parse(payload);

    await saveConnectorStatus(chargePointId, data);

}

export async function handleStartTransaction(
    requestId: string,
    chargePointId: string,
    payload: unknown
) {
    console.info("start transaction request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = StartTransactionReqSchema.parse(payload);

    const authorized = await isIdTagAuthorized(data.idTag);
    if (!authorized) {
        return StartTransactionResSchema.parse({
            transactionId: 0,
            idTagInfo: {status: "Blocked"}
        });
    }

    const [row] = await saveTransaction(chargePointId, data);
    const transactionId = row?.id ?? 0; // fallback if row is undefined

    return StartTransactionResSchema.parse({
        transactionId,
        idTagInfo: {status: transactionId ? "Accepted" : "Blocked"}
    });
}

export async function handleStopTransaction(
    requestId: string,
    chargePointId: string,
    payload: unknown
) {
    console.info("stop transaction request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = StopTransactionReqSchema.parse(payload);

    await updateTransaction(data);

    return StopTransactionResSchema.parse({
        idTagInfo: {status: "Accepted"}
    });
}

export async function handleMeterValues(
    requestId: string,
    chargePointId: string,
    payload: unknown
): Promise<void> {
    console.info("meter value request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = MeterValuesReqSchema.parse(payload);

    for (const mv of data.meterValue) {
        for (const sv of mv.sampledValue) {
            await saveMeterValue(chargePointId, data, mv, sv);
        }
    }
}

export async function handleAuthorize(
    requestId: string,
    chargePointId: string,
    payload: unknown
) {
    console.info("authorize request-id:%s | chargePointId:%s ", requestId[1], chargePointId);

    const data = AuthorizeReqSchema.parse(payload);

    // optional: you can log unknown tags here
    const authorized = await isIdTagAuthorized(data.idTag);

    const status = authorized ? "Accepted" : "Blocked";

    const res = AuthorizeResSchema.parse({
        idTagInfo: {status}
    });

    return res;
}
