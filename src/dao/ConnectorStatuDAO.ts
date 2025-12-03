import {query} from "../config/DatabaseConfig";
import {z} from "zod";
import {StatusNotificationReqSchema} from "../utils/zod-schemas";

export async function saveConnectorStatus(chargePointId: string, data: z.infer<typeof StatusNotificationReqSchema>): Promise<void> {

    await query(
        `INSERT INTO tbl_connector_status_th (charge_point_id, connector_id, status, error_code, ts)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))`,
        [
            chargePointId,
            data.connectorId,
            data.status,
            data.errorCode,
            data.timestamp ?? null
        ]
    );
}

