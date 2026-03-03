import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", ".env") });

import express from "express";
import cors from "cors";
import traceRoutes from "./routes/trace.ts";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());
app.use(traceRoutes);

app.listen(port, () => {
  console.log(`APIM proxy server running on http://localhost:${port}`);
});
