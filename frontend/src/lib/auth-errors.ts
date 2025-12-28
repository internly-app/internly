/**
 * Maps technical Supabase/OAuth error messages to user-friendly messages.
 * Users should never see technical error details - only actionable, clear messages.
 */

type ErrorMapping = {
  pattern: RegExp | string;
  message: string;
};

const signInErrorMappings: ErrorMapping[] = [
  {
    pattern: /invalid login credentials/i,
    message: "Incorrect email or password. If you signed up with Google, use the Google button instead.",
  },
  {
    pattern: /email not confirmed/i,
    message: "Please check your inbox and confirm your email before signing in.",
  },
  {
    pattern: /invalid email/i,
    message: "Please enter a valid email address.",
  },
  {
    pattern: /too many requests/i,
    message: "Too many sign-in attempts. Please wait a moment and try again.",
  },
  {
    pattern: /rate limit/i,
    message: "Too many sign-in attempts. Please wait a moment and try again.",
  },
  {
    pattern: /network|fetch|connection/i,
    message: "Unable to connect. Please check your internet connection and try again.",
  },
  {
    pattern: /timeout/i,
    message: "The request took too long. Please try again.",
  },
  {
    pattern: /user not found/i,
    message: "No account found with this email. Please sign up first.",
  },
  {
    pattern: /user.*banned|account.*disabled|account.*suspended/i,
    message: "This account has been disabled. Please contact support if you think this is a mistake.",
  },
  {
    pattern: /signups.*disabled|registration.*disabled/i,
    message: "New accounts are not being accepted at this time.",
  },
];

const signUpErrorMappings: ErrorMapping[] = [
  {
    pattern: /user already registered/i,
    message: "An account with this email already exists. Try signing in instead.",
  },
  {
    pattern: /email.*already.*use|already.*registered/i,
    message: "An account with this email already exists. Try signing in instead.",
  },
  {
    pattern: /invalid email/i,
    message: "Please enter a valid email address.",
  },
  {
    pattern: /password.*too.*short|password.*weak/i,
    message: "Please choose a stronger password (at least 6 characters).",
  },
  {
    pattern: /too many requests/i,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  {
    pattern: /rate limit/i,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  {
    pattern: /network|fetch|connection/i,
    message: "Unable to connect. Please check your internet connection and try again.",
  },
  {
    pattern: /timeout/i,
    message: "The request took too long. Please try again.",
  },
  {
    pattern: /signups.*disabled|registration.*disabled/i,
    message: "New accounts are not being accepted at this time.",
  },
  {
    pattern: /email.*provider|smtp|sending.*email/i,
    message: "We couldn't send the verification email. Please try again later.",
  },
];

const oauthErrorMappings: ErrorMapping[] = [
  {
    pattern: /unable to exchange external code/i,
    message: "Google sign-in failed. Please try again or use email instead.",
  },
  {
    pattern: /access_denied/i,
    message: "Sign-in was cancelled. Please try again when you're ready.",
  },
  {
    pattern: /server_error/i,
    message: "Something went wrong with sign-in. Please try again.",
  },
  {
    pattern: /temporarily_unavailable/i,
    message: "Sign-in is temporarily unavailable. Please try again in a few minutes.",
  },
  {
    pattern: /invalid_request/i,
    message: "Something went wrong. Please try signing in again.",
  },
  {
    pattern: /popup.*blocked/i,
    message: "Pop-up was blocked. Please allow pop-ups for this site and try again.",
  },
  {
    pattern: /network|fetch|connection/i,
    message: "Unable to connect. Please check your internet connection and try again.",
  },
];

const sessionErrorMappings: ErrorMapping[] = [
  {
    pattern: /session.*expired/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    pattern: /invalid.*token|token.*expired/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    pattern: /refresh.*token/i,
    message: "Your session has expired. Please sign in again.",
  },
];

function matchError(errorMessage: string, mappings: ErrorMapping[]): string | null {
  const lowerMessage = errorMessage.toLowerCase();

  for (const mapping of mappings) {
    if (typeof mapping.pattern === "string") {
      if (lowerMessage.includes(mapping.pattern.toLowerCase())) {
        return mapping.message;
      }
    } else if (mapping.pattern.test(errorMessage)) {
      return mapping.message;
    }
  }

  return null;
}

/**
 * Get a user-friendly error message for sign-in errors
 */
export function getSignInErrorMessage(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : error;

  // Try specific mappings first
  const mapped = matchError(errorMessage, signInErrorMappings);
  if (mapped) return mapped;

  // Try session error mappings
  const sessionMapped = matchError(errorMessage, sessionErrorMappings);
  if (sessionMapped) return sessionMapped;

  // Default fallback
  return "Unable to sign in. Please check your details and try again.";
}

/**
 * Get a user-friendly error message for sign-up errors
 */
export function getSignUpErrorMessage(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : error;

  // Try specific mappings first
  const mapped = matchError(errorMessage, signUpErrorMappings);
  if (mapped) return mapped;

  // Default fallback
  return "Unable to create account. Please try again.";
}

/**
 * Get a user-friendly error message for OAuth/Google sign-in errors
 */
export function getOAuthErrorMessage(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : error;

  // Try specific mappings first
  const mapped = matchError(errorMessage, oauthErrorMappings);
  if (mapped) return mapped;

  // Default fallback
  return "Sign-in failed. Please try again or use a different method.";
}

/**
 * Get a user-friendly error message for session/callback errors
 */
export function getSessionErrorMessage(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : error;

  // Try session mappings first
  const sessionMapped = matchError(errorMessage, sessionErrorMappings);
  if (sessionMapped) return sessionMapped;

  // Try OAuth mappings (for callback page)
  const oauthMapped = matchError(errorMessage, oauthErrorMappings);
  if (oauthMapped) return oauthMapped;

  // Default fallback
  return "Something went wrong. Please try signing in again.";
}
