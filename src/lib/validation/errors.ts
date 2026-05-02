import { json } from '@sveltejs/kit';
import type { ZodError } from 'zod';

export function validationError(err: ZodError) {
  console.error('[validation]', err.flatten());
  return json({ code: 'VALIDATION_ERROR', message: '入力値が不正です' }, { status: 400 });
}
