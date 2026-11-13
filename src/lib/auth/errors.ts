/**
 * Turns a Supabase sign-in error into one of OUR friendly messages
 * (a dictionary key, so it's shown in Georgian or English).
 *
 * Supabase errors carry a `code` like "invalid_credentials"; very old or
 * network errors may only have a message or a status number.
 */
import type { MessageKey } from "@/i18n/dictionaries";

type AuthLikeError = { code?: string; status?: number; message?: string; name?: string } | null | undefined;

const BY_CODE: Record<string, MessageKey> = {
  invalid_credentials: "authError.invalidCredentials",
  email_not_confirmed: "authError.emailNotConfirmed",
  user_already_exists: "authError.alreadyExists",
  email_exists: "authError.alreadyExists",
  identity_already_exists: "authError.alreadyExists",
  weak_password: "authError.weakPassword",
  same_password: "authError.samePassword",
  over_email_send_rate_limit: "authError.tooManyEmails",
  over_request_rate_limit: "authError.tooManyRequests",
  email_address_invalid: "authError.invalidEmail",
  email_address_not_authorized: "authError.emailNotAuthorized",
  signup_disabled: "authError.signupDisabled",
  email_provider_disabled: "authError.signupDisabled",
  provider_disabled: "authError.providerDisabled",
  otp_expired: "authError.linkExpired",
  flow_state_expired: "authError.linkExpired",
  flow_state_not_found: "authError.linkExpired",
  bad_code_verifier: "authError.linkOtherBrowser",
  session_not_found: "authError.sessionExpired",
  user_not_found: "authError.invalidCredentials",
  user_banned: "authError.banned",
};

export function authErrorKey(error: AuthLikeError): MessageKey {
  if (!error) return "authError.unknown";
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  // No answer from the server at all: the internet (or Supabase) is unreachable.
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || /fetch|network/i.test(error.message ?? "")) {
    return "authError.network";
  }
  if (error.status === 429) return "authError.tooManyRequests";
  return "authError.unknown";
}

/** A simple check before asking the server: something@something.something */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
