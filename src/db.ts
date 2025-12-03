import { Pool } from "pg";
import { DATABASE_URL } from "./config";

export const pool = new Pool({
    connectionString: DATABASE_URL
});

// Simple helper
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const res = await pool.query(text, params);
    return res.rows as T[];
}
