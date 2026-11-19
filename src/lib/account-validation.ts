/** Checks for the Account page's forms; each returns an error message or null. */

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 250; // Player.Email is nvarchar(250)

export function checkEmail(email: string): string | null {
  if (!email) return "Enter an email address.";
  if (email.length > MAX_EMAIL_LENGTH) return "That email address is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function checkNewPassword(
  current: string,
  password: string,
  confirm: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Your new password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "The new passwords don't match.";
  if (password === current) {
    return "Your new password must be different from your current one.";
  }
  return null;
}
