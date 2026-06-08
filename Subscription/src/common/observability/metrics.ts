type LabelValues = Record<string, string | number | boolean | null | undefined>;

type TimingAggregate = {
  count: number;
  sum: number;
  min: number;
  max: number;
  last: number;
};

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const timings = new Map<string, TimingAggregate>();
const defaultCounterNames = [
  'billing_payment_success_total',
  'billing_payment_failure_total',
  'billing_saga_compensation_total',
  'billing_renewal_success_total',
  'billing_renewal_failure_total',
  'webhook_processed_total',
  'webhook_duplicate_total',
  'webhook_processing_failure_total',
  'usage_reconciliation_drift_total',
  'usage_reconciliation_corrected_total',
  'subscription_upgrade_total',
  'subscription_downgrade_total',
];

const defaultGaugeNames = ['billing_queue_backlog', 'webhook_queue_backlog'];

function labelKey(labels?: LabelValues) {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }

  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function metricKey(name: string, labels?: LabelValues) {
  const key = labelKey(labels);
  return key ? `${name}{${key}}` : name;
}

function splitMetricKey(key: string) {
  const braceIndex = key.indexOf('{');
  if (braceIndex === -1) {
    return {
      name: key,
      labels: '',
    };
  }

  return {
    name: key.slice(0, braceIndex),
    labels: key.slice(braceIndex),
  };
}

function renderSampleLine(key: string, value: number) {
  return `${key} ${Number.isFinite(value) ? value : 0}`;
}

export function renderPrometheusMetrics() {
  const lines: string[] = [];

  const counterNames = new Set([...defaultCounterNames, ...Array.from(counters.keys()).map((key) => splitMetricKey(key).name)]);
  for (const name of Array.from(counterNames).sort()) {
    lines.push(`# TYPE ${name} counter`);
    const samples = Array.from(counters.entries())
      .filter(([key]) => splitMetricKey(key).name === name)
      .sort(([left], [right]) => left.localeCompare(right));
    if (samples.length === 0) {
      lines.push(renderSampleLine(name, 0));
      continue;
    }
    for (const [key, value] of samples) {
      lines.push(renderSampleLine(key, value));
    }
  }

  const gaugeNames = new Set([...defaultGaugeNames, ...Array.from(gauges.keys()).map((key) => splitMetricKey(key).name)]);
  for (const name of Array.from(gaugeNames).sort()) {
    lines.push(`# TYPE ${name} gauge`);
    const samples = Array.from(gauges.entries())
      .filter(([key]) => splitMetricKey(key).name === name)
      .sort(([left], [right]) => left.localeCompare(right));
    if (samples.length === 0) {
      lines.push(renderSampleLine(name, 0));
      continue;
    }
    for (const [key, value] of samples) {
      lines.push(renderSampleLine(key, value));
    }
  }

  return `${lines.join('\n')}\n`;
}

export const metrics = {
  increment(name: string, labels?: LabelValues, value = 1) {
    const key = metricKey(name, labels);
    counters.set(key, (counters.get(key) ?? 0) + value);
  },
  gauge(name: string, labels: LabelValues | undefined, value: number) {
    const key = metricKey(name, labels);
    gauges.set(key, value);
  },
  observe(name: string, labels: LabelValues | undefined, value: number) {
    const key = metricKey(name, labels);
    const current = timings.get(key) ?? { count: 0, sum: 0, min: value, max: value, last: value };
    current.count += 1;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.last = value;
    timings.set(key, current);
  },
  snapshot() {
    const timingSnapshot = Object.fromEntries(
      Array.from(timings.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          avg: value.count > 0 ? value.sum / value.count : 0,
        },
      ]),
    );

    return {
      counters: Object.fromEntries(counters.entries()),
      gauges: Object.fromEntries(gauges.entries()),
      timings: timingSnapshot,
    };
  },
};
