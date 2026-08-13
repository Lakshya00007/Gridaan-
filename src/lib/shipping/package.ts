import { z } from 'zod';
import type { PackageDetails } from './types';

export const packageDetailsSchema = z.object({
  weightGrams: z.number().finite().positive().max(100_000),
  lengthCm: z.number().finite().positive().max(300),
  widthCm: z.number().finite().positive().max(300),
  heightCm: z.number().finite().positive().max(300),
});

export function validatePackageDetails(input: unknown):
  | { ok: true; packageDetails: PackageDetails }
  | { ok: false; issues: string[] } {
  const parsed = packageDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return { ok: true, packageDetails: parsed.data };
}
