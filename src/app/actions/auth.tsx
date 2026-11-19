"use server";
import { signInUser } from "@/models/user";
import { createSession, deleteSession } from "@/lib/session";
import { safeRedirectPath, signInHref } from "@/lib/redirect-path";
import { redirect } from "next/navigation";

/** An error, with the name entered so the form can keep it. */
export type SignInState = { message: string; name: string } | null;

/**
 * Signs in, then returns the player to `next` (the page they came from).
 * Returns an error message if the name or password is wrong.
 */
export async function signin(
  _: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const name = formData.get("name");
  const password = formData.get("password");
  if (typeof name !== "string" || typeof password !== "string") {
    return { message: "Invalid username or password", name: "" };
  }

  const user = await signInUser(name, password);
  if (!user) {
    return { message: "Invalid username or password", name };
  }

  await createSession(user);
  redirect(safeRedirectPath(formData.get("next")));
}

/**
 * Signs out. From the sign-in page (the form sends `next`), stays there so
 * the player can sign in again and still go back to `next`; otherwise home.
 */
export async function signout(formData?: FormData) {
  await deleteSession();
  if (formData?.has("next")) {
    redirect(signInHref(safeRedirectPath(formData.get("next"))));
  }
  redirect("/");
}
