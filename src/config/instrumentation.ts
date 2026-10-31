import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from './logger';

// -------------------------------------------------------------
// 1. Prometheus Client Metrics Setup (The Golden Signals)
// -------------------------------------------------------------

// Collect standard Node.js runtime metrics (Heap, Event Loop Lag, CPU, Handles)
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({
    prefix: 'nodejs_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2],
  });
}

// Histogram for route-level latency percentiles (P50, P75, P90, P95, P99)
export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for latency percentiles',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets tuned for API response times from 5ms up to 10 seconds
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

// Counter for total throughput and error distribution
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total count of HTTP requests processed by route and status code',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * Express middleware to observe every request and calculate metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    
    // Normalize route to avoid high cardinality (e.g. /api/submissions/:id instead of raw UUID)
    const route = req.baseUrl || req.route?.path || req.path || 'unmatched';
    const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';

    // Skip tracking metric calls on /metrics and /health to keep dashboards clean
    if (req.path === '/metrics' || req.path === '/health' || req.path === '/api/health') {
      return;
    }

    httpRequestDurationHistogram.observe(
      { method: req.method, route, status_code: statusCode },
      durationSeconds
    );

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });
  });

  next();
};

/**
 * Registry exporter for the Prometheus /metrics scrape endpoint
 */
export const getPrometheusMetrics = async (): Promise<string> => {
  return client.register.metrics();
};

// -------------------------------------------------------------
// 2. OpenTelemetry Node SDK (Distributed Tracing to AWS X-Ray)
// -------------------------------------------------------------
let sdk: NodeSDK | null = null;

export const initOpenTelemetry = () => {
  // Only activate full OTLP exporters outside of isolated test suites
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

  try {
    const traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
    });

    const metricExporter = new OTLPMetricExporter({
      url: otlpEndpoint,
    });

    sdk = new NodeSDK({
      serviceName: 'paatam-backend',
      traceExporter,
      metricReaders: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 15000, // Export metrics every 15s
        }),
      ],
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable filesystem instrumentation to avoid cluttering X-Ray waterfalls with local file reads
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
        }),
      ],
    });

    sdk.start();
    logger.info({ endpoint: otlpEndpoint }, 'OpenTelemetry SDK initialized successfully');
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize OpenTelemetry SDK (continuing in standalone mode)');
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  if (sdk) {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry SDK shut down cleanly'))
      .catch((error) => logger.error({ error }, 'Error shutting down OpenTelemetry SDK'));
  }
});
