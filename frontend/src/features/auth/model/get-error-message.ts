import { ApiError } from '@/shared/api';

const GENERIC_ERROR = 'Что-то пошло не так';

export function getErrorMessage(error: Error | null): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return GENERIC_ERROR;
}
