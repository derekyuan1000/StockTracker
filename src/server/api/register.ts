import { registerRoutes } from "./router";
import { portfolioRoutes } from "./routes/portfolio";
import { holdingsRoutes } from "./routes/holdings";
import { transactionsRoutes } from "./routes/transactions";
import { cashRoutes } from "./routes/cash";
import { marketRoutes } from "./routes/market";
import { researchRoutes } from "./routes/research";
import { settingsRoutes } from "./routes/settings";
import { publicRoutes } from "./routes/public";
import { devicesRoutes } from "./routes/devices";
import { internalRoutes } from "./routes/internal";
import { analysisRoutes } from "./routes/analysis";
import { alertsRoutes } from "./routes/alerts";
import { insightsRoutes } from "./routes/insights";

registerRoutes([
  ...portfolioRoutes,
  ...holdingsRoutes,
  ...transactionsRoutes,
  ...cashRoutes,
  ...marketRoutes,
  ...researchRoutes,
  ...settingsRoutes,
  ...publicRoutes,
  ...devicesRoutes,
  ...internalRoutes,
  ...analysisRoutes,
  ...alertsRoutes,
  ...insightsRoutes,
]);
