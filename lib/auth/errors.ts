export type AuthClientError = {
  message?: string | null;
  code?: string | null;
  status?: number;
  statusText?: string;
} | null | undefined;

const FRIENDLY_BY_CODE: Record<string, string> = {
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists. Try signing in or use a different email.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PASSWORD: "Please enter a valid password.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password is too long.",
  VALIDATION_ERROR: "Validation failed. Please check your details and try again.",
  MISSING_FIELD: "Please fill in all required fields.",
  FAILED_TO_CREATE_USER:
    "Unable to create your account due to a database error. Please try again.",
  FAILED_TO_CREATE_SESSION:
    "Your account was created, but we could not start a session. Please try signing in.",
  ORGANIZATION_SLUG_ALREADY_TAKEN:
    "That workspace slug is already taken. Please choose another.",
  ORGANIZATION_ALREADY_EXISTS:
    "A workspace with that name or slug already exists.",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION:
    "You are not allowed to create a workspace.",
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS:
    "You have reached the maximum number of workspaces.",
};

const FRIENDLY_BY_MESSAGE_FRAGMENT: Array<{ match: RegExp; message: string }> = [
  {
    match: /already exists|user already exists|use another email/i,
    message:
      "An account with this email already exists. Try signing in or use a different email.",
  },
  {
    match: /slug already taken|organization slug already taken/i,
    message: "That workspace slug is already taken. Please choose another.",
  },
  {
    match: /organization already exists/i,
    message: "A workspace with that name or slug already exists.",
  },
  {
    match: /validation|invalid email|invalid password/i,
    message: "Validation failed. Please check your details and try again.",
  },
  {
    match: /failed to create user|database|sqlite|unique constraint/i,
    message:
      "Unable to create your account due to a database error. Please try again.",
  },
];

/**
 * Map Better Auth / better-fetch client errors to short, user-facing copy.
 */
export function getAuthErrorMessage(
  error: AuthClientError,
  fallback = "Unable to create account.",
): string {
  if (!error) return fallback;

  const code = typeof error.code === "string" ? error.code.trim() : "";
  if (code && FRIENDLY_BY_CODE[code]) {
    return FRIENDLY_BY_CODE[code];
  }

  const rawMessage =
    typeof error.message === "string" ? error.message.trim() : "";
  if (rawMessage) {
    for (const entry of FRIENDLY_BY_MESSAGE_FRAGMENT) {
      if (entry.match.test(rawMessage)) {
        return entry.message;
      }
    }
    return rawMessage;
  }

  if (error.status === 422 || error.status === 409) {
    return "An account with this email already exists. Try signing in or use a different email.";
  }
  if (error.status && error.status >= 500) {
    return "A server error occurred while creating your account. Please try again.";
  }
  if (typeof error.statusText === "string" && error.statusText.trim()) {
    return error.statusText.trim();
  }

  return fallback;
}

/** Log the full auth error in development only. */
export function logAuthErrorInDev(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[auth] ${context}`, error);
  }
}
