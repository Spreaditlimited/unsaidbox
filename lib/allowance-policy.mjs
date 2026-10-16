import { plans } from './plan-policy.mjs';
import { InputError } from './security.mjs';

export const allowanceFields = [
  { key: 'submissions', label: 'Responses per monthly allowance period', max: 1000000 },
  { key: 'questions', label: 'Active questions', max: 1000 },
  { key: 'forms', label: 'Active feedback forms', max: 1000 },
];
export function validateAllowances(value) {
  const result = { free: { ...plans.free }, pro: { ...plans.pro } };
  for (const tier of ['free', 'pro']) for (const { key, label, max } of allowanceFields) {
    const n = value?.[tier]?.[key];
    if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new InputError(`${tier === 'free' ? 'Free' : 'Pro'}: ${label} must be a whole number between 1 and ${max.toLocaleString('en-GB')}.`);
    result[tier][key] = n;
  }
  for (const { key, label } of allowanceFields) if (result.pro[key] < result.free[key]) throw new InputError(`Pro ${label.toLowerCase()} cannot be less than Free.`);
  return result;
}
export function parseAllowances(form) {
  const values = { free: {}, pro: {} };
  for (const tier of ['free', 'pro']) for (const { key } of allowanceFields) {
    const value = form.get(`${tier}.${key}`);
    values[tier][key] = typeof value === 'string' && /^[0-9]{1,7}$/.test(value) ? Number(value) : NaN;
  }
  return validateAllowances(values);
}
