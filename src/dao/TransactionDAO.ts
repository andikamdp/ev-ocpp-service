import {query} from "../config/DatabaseConfig";
import {z} from "zod";
import {
    StartTransactionReqSchema,
    StopTransactionReqSchema
} from "../utils/zod-schemas";

export async function saveTransaction(chargePointId: string, data: z.infer<typeof StartTransactionReqSchema>): Promise<{
    id: number;
}[]> {

    return await query<{ id: number }>(
        `INSERT INTO tbl_transactions_tr (charge_point_id, connector_id, id_tag, meter_start, start_ts, status)
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
}

export async function updateTransaction(data: z.infer<typeof StopTransactionReqSchema>): Promise<{ id: number; }[]> {

    return await query(
        `UPDATE tbl_transactions_tr
         SET meter_stop = $1,
             stop_ts    = $2,
             status     = 'Completed'
         WHERE id = $3`,
        [data.meterStop, data.timestamp, data.transactionId]
    );
}

