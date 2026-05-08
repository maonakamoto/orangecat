import { ZodSchema } from 'zod';
import type { Middleware } from './compose';
import { apiValidationError } from './standardResponse';

interface ZodContext<T> {
  body?: T;
}

export function withZodBody<T>(schema: ZodSchema<T>): Middleware<ZodContext<T>> {
  return async (req, ctx, next) => {
    try {
      const json = await req.json();
      const parsed = schema.parse(json);
      ctx.body = parsed;
      return next(req, ctx);
    } catch (err: unknown) {
      const e = err as { errors?: unknown; message?: string };
      const details = e?.errors ?? e?.message;
      return apiValidationError('Invalid request body', details);
    }
  };
}
