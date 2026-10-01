export type OAuthErrorCode =
  | "denied"
  | "invalid_state"
  | "invalid_code"
  | "invalid_id_token"
  | "account_exists"
  | "link_conflict"
  | "not_enabled"
  | "last_method"
  | "too_many_attempts";

export const OAUTH_ERROR_MESSAGES: Record<OAuthErrorCode, string> = {
  denied: "Google login cancelled.",
  invalid_state: "That login expired. Please try again.",
  invalid_code: "Google login failed. Please try again.",
  invalid_id_token: "Google login failed. Please try again.",
  account_exists:
    "An account already uses that email. Log in with your password.",
  link_conflict: "That google account is linked to another user.",
  not_enabled: "Google login isn't available.",
  last_method: "Set a password before removing this sign-in method.",
  too_many_attempts: "Too many attempts. Please try again later.",
};
