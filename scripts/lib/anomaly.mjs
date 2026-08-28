function comparePartialDateToAsOf(partial, asOf) {
  if (!partial || !partial.value || partial.parse_state !== 'PARSED') return 0;
  const asOfDay = String(asOf).slice(0, 10);
  const asOfMonth = asOfDay.slice(0, 7);
  const asOfYear = asOfDay.slice(0, 4);
  if (partial.precision === 'day') return partial.value > asOfDay ? 1 : 0;
  if (partial.precision === 'month') return partial.value > asOfMonth ? 1 : 0;
  if (partial.precision === 'year') return partial.value > asOfYear ? 1 : 0;
  return 0;
}

export function deriveMetrics(observations) {
  const current = observations.filter(item => item.source_status_claim?.claim_type === 'CURRENT_POLITICAL_PRISONER');
  const missingPrison = current.filter(item => !item.prison?.facility).length;
  return {
    total: observations.length,
    current_political_prisoner_claims: current.length,
    current_missing_prison: missingPrison,
    current_missing_prison_rate: current.length ? missingPrison / current.length : 0
  };
}

export function detectObservationAnomalies(observations, { asOf = new Date().toISOString(), expectedCount = null } = {}) {
  const anomalies = [];
  const seenIdentity = new Map();

  for (const observation of observations) {
    if (!observation.reported_name) {
      anomalies.push({ severity: 'HIGH', code: 'MISSING_REPORTED_NAME', row_number: observation.row_number });
    }
    for (const [field, partial] of [
      ['birth_date', observation.birth_date],
      ['detention_date', observation.detention_date],
      ['verdict_date', observation.verdict_date]
    ]) {
      if (partial?.parse_state === 'UNPARSED') {
        anomalies.push({ severity: 'MEDIUM', code: 'UNPARSED_DATE', field, row_number: observation.row_number, raw: partial.raw });
      }
      if (field !== 'birth_date' && comparePartialDateToAsOf(partial, asOf) > 0) {
        anomalies.push({ severity: 'HIGH', code: 'FUTURE_EVENT_DATE', field, row_number: observation.row_number, value: partial.value });
      }
    }

    const key = observation.source_identity_key;
    if (key) {
      if (seenIdentity.has(key)) {
        anomalies.push({
          severity: 'HIGH',
          code: 'DUPLICATE_SOURCE_IDENTITY',
          row_number: observation.row_number,
          first_row_number: seenIdentity.get(key)
        });
      } else {
        seenIdentity.set(key, observation.row_number);
      }
    }
  }

  if (Number.isInteger(expectedCount) && expectedCount !== observations.length) {
    anomalies.push({ severity: 'HIGH', code: 'SOURCE_COUNT_MISMATCH', expected: expectedCount, parsed: observations.length });
  }
  return anomalies;
}

export function compareSnapshotMetrics(previous, current, {
  maxRelativeDrop = 0.10,
  minAbsoluteDrop = 50,
  maxMissingPrisonRateIncrease = 0.25
} = {}) {
  const anomalies = [];
  if (previous?.total > 0 && current?.total >= 0) {
    const drop = previous.total - current.total;
    const ratio = drop / previous.total;
    if (drop >= minAbsoluteDrop && ratio > maxRelativeDrop) {
      anomalies.push({ severity: 'BLOCK', code: 'ANOMALOUS_TOTAL_DROP', previous: previous.total, current: current.total, drop, ratio });
    }
  }

  if (previous && current) {
    const increase = (current.current_missing_prison_rate ?? 0) - (previous.current_missing_prison_rate ?? 0);
    if (increase > maxMissingPrisonRateIncrease) {
      anomalies.push({
        severity: 'BLOCK',
        code: 'MISSING_PRISON_RATE_SPIKE',
        previous_rate: previous.current_missing_prison_rate ?? 0,
        current_rate: current.current_missing_prison_rate ?? 0,
        increase
      });
    }
  }
  return anomalies;
}

export function shouldBlockPublication(anomalies) {
  return anomalies.some(item => item.severity === 'BLOCK' || item.severity === 'HIGH');
}
