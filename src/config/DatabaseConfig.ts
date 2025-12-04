import { Pool } from "pg";

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Fail fast if env missing
for (const [key, value] of Object.entries({ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME })) {
    if (!value) {
        throw new Error(`Missing env var: ${key}`);
    }
}

const encodedUser = encodeURIComponent(DB_USER!);
const encodedPass = encodeURIComponent(DB_PASSWORD!);

export const pool = new Pool({
    connectionString: `postgres://${encodedUser}:${encodedPass}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
    max: 10,
    idleTimeoutMillis: 30000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    console.debug("query:", DB_USER, text, params);
    // ⚠️ avoid logging password in real apps; okay during debug, then remove.
    console.log("DB ENV DEBUG:", {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        db: DB_NAME,
    });

    const res = await pool.query(text, params);
    return res.rows as T[];
}
