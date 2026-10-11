import { AppError } from '../exceptions/AppError';

/**
 * Safely parses an input into BigInt.
 * Throws an AppError with 400 Bad Request if the input is not a valid numeric value.
 */
export function parseBigInt(val: any, fieldName = 'ID'): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number' && Number.isInteger(val)) {
    return BigInt(val);
  }
  if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
    return BigInt(val.trim());
  }
  throw new AppError(`Invalid ${fieldName}: must be a numeric ID`, 400);
}
