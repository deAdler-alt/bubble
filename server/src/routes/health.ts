import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "../types.js";

export const healthRoute: FastifyPluginAsync<{ startedAt: Date }> = async (
  app,
  opts,
) => {
  app.get("/api/health", async () => {
    const res: HealthResponse = {
      status: "ok",
      uptimeMs: Date.now() - opts.startedAt.getTime(),
      startedAt: opts.startedAt.toISOString(),
    };
    return res;
  });
};
