export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;

export const ACCESS_TTL_SECONDS = 15 * 60;

export const SESSION_TTL_MS = {
  short: 24 * 60 * 60 * 1000,
  long: 7 * 24 * 60 * 60 * 1000,
};

export const CSRF_TTL_MS = 24 * 60 * 60 * 1000;
