import { Mastra } from "@mastra/core/mastra";
import type { MetricEvent } from "@mastra/core/observability";
import { Memory } from "@mastra/memory";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { OtelExporter } from "@mastra/otel-exporter";
import { PostgresStore } from "@mastra/pg";
import {
  HISTORY_TURN_LIMIT,
  MASTRA_SCHEMA,
  MASTRA_SERVICE_NAME,
  MASTRA_STORE_ID,
  SPAN_FLUSH_MS,
} from "./constants.ts";

export type AgentRuntime = {
  readonly mastra: Mastra;
  readonly memory: Memory;
  readonly flush: () => Promise<void>;
};

class SpanStorageExporter extends MastraStorageExporter {
  override onMetricEvent(_event: MetricEvent): Promise<void> {
    return Promise.resolve();
  }
}

const exporters = (otelEndpoint: string | undefined) =>
  otelEndpoint === undefined
    ? [new SpanStorageExporter({ maxBatchWaitMs: SPAN_FLUSH_MS })]
    : [
        new SpanStorageExporter({ maxBatchWaitMs: SPAN_FLUSH_MS }),
        new OtelExporter({
          provider: { custom: { endpoint: otelEndpoint, protocol: "http/json" } },
          signals: { logs: false },
        }),
      ];

export const createAgentRuntime = (
  databaseUrl: string,
  otelEndpoint?: string,
): AgentRuntime => {
  const storage = new PostgresStore({
    id: MASTRA_STORE_ID,
    connectionString: databaseUrl,
    schemaName: MASTRA_SCHEMA,
  });

  const memory = new Memory({ storage, options: { lastMessages: HISTORY_TURN_LIMIT } });

  const observability = new Observability({
    configs: {
      default: {
        serviceName: MASTRA_SERVICE_NAME,
        logging: { enabled: false },
        exporters: exporters(otelEndpoint),
      },
    },
  });

  const mastra = new Mastra({ storage, memory: { builder: memory }, observability });

  const flush = async (): Promise<void> => {
    await mastra.observability.getDefaultInstance()?.flush();
  };

  return { mastra, memory, flush };
};
