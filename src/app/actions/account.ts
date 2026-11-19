"use server";

import { refresh } from "next/cache";
import { checkEmail, checkNewPassword } from "@/lib/account-validation";
import { getSession } from "@/lib/session";
import { changeEmail, changePassword } from "@/models/account";

export type AccountFormState = {
  ok: boolean;
  message: string;
  email?: string; // what was entered, so the email form can keep it
} | null;

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

const WRONG_PASSWORD = "Your current password is incorrect.";

/** The player always comes from the signed session, never the form. */
export async function updateEmail(
  _: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to change your email." };

  const email = field(formData, "email").trim();
  const error = checkEmail(email);
  if (error) return { ok: false, message: error, email };

  try {
    const result = await changeEmail(
      session.playerId,
      field(formData, "currentPassword"),
      email,
    );
    if (result === "wrong-password") {
      return { ok: false, message: WRONG_PASSWORD, email };
    }
  } catch (error) {
    console.error("updateEmail failed", error);
    return { ok: false, message: "Couldn't update your email. Please try again.", email };
  }
  refresh();
  return { ok: true, message: "Your email has been updated.", email };
}

export async function updatePassword(
  _: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to change your password." };

  const current = field(formData, "currentPassword");
  const password = field(formData, "newPassword");
  const error = checkNewPassword(current, password, field(formData, "confirmPassword"));
  if (error) return { ok: false, message: error };

  try {
    const result = await changePassword(session.playerId, current, password);
    if (result === "wrong-password") return { ok: false, message: WRONG_PASSWORD };
  } catch (error) {
    console.error("updatePassword failed", error);
    return { ok: false, message: "Couldn't change your password. Please try again." };
  }
  return { ok: true, message: "Your password has been changed." };
}
