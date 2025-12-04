export function log(level: "info" | "warn" | "error", message: string, data?: any) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        message,
        ...(data ? { data } : {})
    };
    console.log(JSON.stringify(entry));
}

export const logger = {
    info: (msg: string, data?: any) => log("info", msg, data),
    warn: (msg: string, data?: any) => log("warn", msg, data),
    error: (msg: string, data?: any) => log("error", msg, data)
};