import {z} from "zod";
import {MeterValuesReqSchema, MeterValueSchema, SampledValueSchema} from "../utils/zod-schemas";
import {query} from "../config/DatabaseConfig";

export async function saveMeterValue(chargePointId: string, data: z.infer<typeof MeterValuesReqSchema>, meterValue: z.infer<typeof MeterValueSchema>, sampleValue: z.infer<typeof SampledValueSchema>): Promise<void> {

    await query(
        `INSERT INTO tbl_meter_values_th
         (charge_point_id, connector_id, transaction_id, ts, measurand, value, unit, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            chargePointId,
            data.connectorId,
            data.transactionId ?? null,
            meterValue.timestamp,
            sampleValue.measurand ?? "Energy.Active.Import.Register",
            Number(sampleValue.value),
            sampleValue.unit ?? "Wh",
            sampleValue.context ?? null
        ]
    );
}
