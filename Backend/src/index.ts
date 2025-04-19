import app from "./app.ts";
import { PORT } from "./utils/config.ts";
import logger from "./utils/logger.ts";

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
