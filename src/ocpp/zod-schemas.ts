import { z } from "zod";

export const BootNotificationReqSchema = z.object({
    chargePointModel: z.string(),
    chargePointVendor: z.string(),
    chargePointSerialNumber: z.string().optional(),
    chargeBoxSerialNumber: z.string().optional(),
    firmwareVersion: z.string().optional(),
    iccid: z.string().optional(),
    imsi: z.string().optional(),
    meterType: z.string().optional(),
    meterSerialNumber: z.string().optional()
});

export const BootNotificationResSchema = z.object({
    status: z.enum(["Accepted", "Pending", "Rejected"]),
    currentTime: z.string(),
    interval: z.number()
});

export const HeartbeatReqSchema = z.object({});
export const HeartbeatResSchema = z.object({
    currentTime: z.string()
});

export const StatusNotificationReqSchema = z.object({
    connectorId: z.number().int(),
    errorCode: z.string(),
    status: z.string(),
    timestamp: z.string().optional(),
    info: z.string().optional(),
    vendorId: z.string().optional(),
    vendorErrorCode: z.string().optional()
});

export const StatusNotificationResSchema = z.object({});

export const StartTransactionReqSchema = z.object({
    connectorId: z.number().int(),
    idTag: z.string(), // RFID / user tag
    meterStart: z.number(),
    timestamp: z.string(),
    reservationId: z.number().optional()
});

export const StartTransactionResSchema = z.object({
    transactionId: z.coerce.number(),
    idTagInfo: z.object({
        status: z.enum(["Accepted", "Blocked", "Expired", "Invalid", "ConcurrentTx"])
    })
});

export const StopTransactionReqSchema = z.object({
    transactionId:z.coerce.number(),
    idTag: z.string().optional(),
    meterStop: z.number(),
    timestamp: z.string(),
    reason: z.string().optional()
});

export const StopTransactionResSchema = z.object({
    idTagInfo: z
        .object({
            status: z.enum(["Accepted", "Blocked", "Expired", "Invalid", "ConcurrentTx"])
        })
        .optional()
});

export const MeterValuesReqSchema = z.object({
    connectorId: z.number().int(),
    transactionId: z.coerce.number(),
    meterValue: z.array(
        z.object({
            timestamp: z.string(),
            sampledValue: z.array(
                z.object({
                    value: z.string(), // numeric string
                    measurand: z.string().optional(),
                    unit: z.string().optional(),
                    context: z.string().optional()
                })
            )
        })
    )
});

export const MeterValuesResSchema = z.object({});

// Authorize
export const AuthorizeReqSchema = z.object({
    idTag: z.string()
});

export const AuthorizeResSchema = z.object({
    idTagInfo: z.object({
        status: z.enum([
            "Accepted",
            "Blocked",
            "Expired",
            "Invalid",
            "ConcurrentTx"
        ])
    })
});