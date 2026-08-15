import { z } from 'zod';

export const metaCapiSuccessResponseSchema = z
  .object({
    events_received: z.number().int().min(1),
    messages: z.array(z.string()).optional(),
    fbtrace_id: z.string().min(1).optional(),
  })
  .passthrough();

export function isSuccessfulMetaCapiResponse(responseOk: boolean, payload: unknown) {
  return responseOk && metaCapiSuccessResponseSchema.safeParse(payload).success;
}
