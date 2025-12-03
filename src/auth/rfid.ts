import { query } from "../db";

export async function isIdTagAuthorized(idTag: string): Promise<boolean> {
    const rows = await query<{ is_authorized: boolean }>(
        "SELECT is_authorized FROM rfid_tags WHERE id_tag = $1",
        [idTag]
    );

    if (rows.length === 0 || !rows[0]) {
        return false;
    }

    return rows[0].is_authorized;
}
