export type EpochTimestamp = number;

/** Unix epoch time in milliseconds. All persisted date/time values use this format. */
export const nowEpoch = (): EpochTimestamp => Date.now();

export const toEpoch = (value: unknown): EpochTimestamp => {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && value.trim() !== '') return numericValue;

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  throw new Error('Invalid timestamp value.');
};
