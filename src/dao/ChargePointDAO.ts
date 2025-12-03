import {query} from "../config/DatabaseConfig";
import {z} from "zod";
import {BootNotificationReqSchema} from "../utils/zod-schemas";

export async function saveChargePoints(chargePointId: string, data: z.infer<typeof BootNotificationReqSchema>): Promise<void> {

    await query(
        `INSERT INTO tbl_charge_points_tm (id, ocpp_version, model, vendor, last_boot)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (id) DO UPDATE
             SET model     = EXCLUDED.model,
                 vendor    = EXCLUDED.vendor,
                 last_boot = now()`,
        [chargePointId, "1.6", data.chargePointModel, data.chargePointVendor]
    );
}

