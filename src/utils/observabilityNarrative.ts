/**
 * Plain-language status line for the observability overview, so the first thing
 * on the page answers "is my product OK?" instead of showing bare metrics.
 */

export type NarrativeTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface NarrativeInput {
  total: number;
  failures: number;
  /** Percent, 0 to 100. */
  errorRatePercent: number;
  /** The operation with the most failures in the period, if any failed. */
  topFailing?: { operation: string; failures: number };
  unhealthyChecks: number;
  totalChecks: number;
  /** e.g. "24 hours". */
  rangeLabel: string;
}

export interface Narrative {
  tone: NarrativeTone;
  title: string;
  detail: string;
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

export function describeStatus(input: NarrativeInput): Narrative {
  const { total, failures, errorRatePercent, topFailing, unhealthyChecks, totalChecks, rangeLabel } = input;

  const checks =
    unhealthyChecks > 0
      ? `${unhealthyChecks} of ${plural(totalChecks, 'health check is', 'health checks are')} unavailable.`
      : totalChecks === 1
        ? 'The health check is available.'
        : totalChecks > 1
          ? `All ${totalChecks.toLocaleString()} health checks are available.`
          : '';

  if (total === 0) {
    return {
      tone: unhealthyChecks > 0 ? 'warn' : 'neutral',
      title: unhealthyChecks > 0 ? 'No activity, but a health check is failing' : 'No activity yet',
      detail: [`Nothing was recorded in the last ${rangeLabel}.`, checks].filter(Boolean).join(' '),
    };
  }

  if (failures === 0) {
    return {
      tone: unhealthyChecks > 0 ? 'warn' : 'good',
      title: unhealthyChecks > 0 ? 'Operations are fine, but a health check is failing' : 'Running cleanly',
      detail: [`${plural(total, 'operation', 'operations')} in the last ${rangeLabel}, none failed.`, checks].filter(Boolean).join(' '),
    };
  }

  const rate = errorRatePercent >= 10 ? Math.round(errorRatePercent) : Number(errorRatePercent.toFixed(1));
  return {
    tone: errorRatePercent >= 10 ? 'bad' : 'warn',
    title: `${failures.toLocaleString()} of ${plural(total, 'operation', 'operations')} failed (${rate}%)`,
    detail: [
      `In the last ${rangeLabel}.`,
      topFailing ? `Most failures: ${topFailing.operation} (${topFailing.failures.toLocaleString()}).` : '',
      checks,
    ]
      .filter(Boolean)
      .join(' '),
  };
}
