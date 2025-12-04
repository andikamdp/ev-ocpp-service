import fs from "fs";
import path from "path";

function loadProperties(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
        console.warn(`Config file not found: ${filePath}`);
        return {};
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n && !n.startsWith("#"));

    const config: Record<string, string> = {};
    for (const line of lines) {
        const [key, value] = line.split("=");
        if (key && value) config[key.trim()] = value.trim();
    }

    return config;
}

export function loadConfig(env: string = "dev") {
    const basePath = path.resolve(__dirname, "..", "configfile", "base.properties");
    const envPath = path.resolve(__dirname, "..", "configfile", `${env}.properties`);

    const baseConfig = loadProperties(basePath);
    const envConfig = loadProperties(envPath);

    const finalConfig = { ...baseConfig, ...envConfig };

    // Export into process.env
    Object.entries(finalConfig).forEach(([k, v]) => {
        process.env[k] = v;
    });

    console.info(`Loaded config: ${env}`, finalConfig);

    return finalConfig;
}
