process.loadEnvFile();

import z from "zod";
import { ERR } from "../utils/customLogs";

const envSchema = z.object({
  ENV: z.enum(["Dev", "Prod", "Sandbox", "Test"]),
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.log(ERR, JSON.stringify(error.format()));
  process.exit(1);
}

export const config = {
  env: data.ENV,
};
