"use server";
import { signInUser } from "@/models/user";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

type SignInState = { success: boolean; message: string } | null;

export async function signin(
  _: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const name = formData.get("name");
  const password = formData.get("password");
  if (typeof name !== "string" || typeof password !== "string") {
    return { success: false, message: "Invalid username or password" };
  }

  const user = await signInUser(name, password);
  if (!user) {
    return { success: false, message: "Invalid username or password" };
  }

  await createSession(user);
  return { success: true, message: "Logged in successfully!" };
}

export async function signout() {
  await deleteSession();
  redirect("/");
}
