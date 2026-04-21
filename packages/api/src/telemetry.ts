import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { logger } from './logger.js';

export function initTelemetry() {
  const enabled = process.env.OTEL_ENABLED === 'true';

  if (!enabled) {
    logger.debug('telemetry disabled');
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'closepilot-api';
  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  const traceExporter = new OTLPTraceExporter({
    url: exporterEndpoint,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
         // Optionally configure HTTP instrumentation
      },
      '@opentelemetry/instrumentation-pg': {
         // Optionally configure PG instrumentation
      }
    })],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('Telemetry SDK shut down successfully'))
      .catch((error: any) => logger.error('Error shutting down Telemetry SDK', { error: error.message || error }))
      .finally(() => process.exit(0));
  });
}

initTelemetry();
