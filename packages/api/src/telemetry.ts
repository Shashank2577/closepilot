import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { logger } from './logger.js';

/**
 * Initialize OpenTelemetry for the API service
 */
export function initTelemetry() {
  const enabled = process.env.OTEL_ENABLED === 'true';

  if (!enabled) {
    logger.debug(undefined, 'telemetry disabled');
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'closepilot-api';
  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  logger.info({ serviceName, exporterEndpoint }, 'initializing telemetry');

  const traceExporter = new OTLPTraceExporter({
    url: exporterEndpoint,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Only instrument what we need to reduce overhead
        '@opentelemetry/instrumentation-http': {},
        '@opentelemetry/instrumentation-pg': {},
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info(undefined, 'telemetry SDK shut down successfully'))
      .catch((error: Error) => logger.error({ error: error.message }, 'error shutting down telemetry SDK'))
      .finally(() => process.exit(0));
  });
}
