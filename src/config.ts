import dotenv from "dotenv";
dotenv.config();

export const OCPP_PORT = parseInt(process.env.OCPP_PORT || "8080", 10);
export const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3000", 10);
export const DATABASE_URL = process.env.DATABASE_URL || "postgres://evcs:evcs_pass@localhost:5432/evcs";
