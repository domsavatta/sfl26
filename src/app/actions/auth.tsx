"use server";
import { signInUser } from "@/models/user";
import { cookies } from "next/headers";

export async function signin(_: undefined, formData: FormData) {
  console.log("Form Data:", formData);

  const name = formData.get("name");
  const password = formData.get("password");
  console.log("Name:", name);
  console.log("Password:", password);
  const user = await signInUser(name as string, password as string);
  if (!user) {
    return {
      success: false,
      message: "Invalid username or password",
    };
  }
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  cookieStore.set("session", user.playerId, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "strict",
    path: "/",
  });
  cookieStore.set("player", JSON.stringify(user), {
    httpOnly: false,
    secure: true,
    expires: expiresAt,
    sameSite: "strict",
  });
  // Mutate data
  // Revalidate cache
  return {
    success: true,
    message: "Logged in successfully!",
  };
}
