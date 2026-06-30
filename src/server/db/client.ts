import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { getTursoEnv } from "../env";
import * as schema from "./schema";

const { url, authToken } = getTursoEnv();

export const db = drizzle(createClient({ url, authToken }), { schema });
