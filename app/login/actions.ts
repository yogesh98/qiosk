"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { isDevMode } from "@/lib/env";
import {
  countUsers,
  getAdminUser,
  getUserByUsername,
  insertUser,
} from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export type ActionState = {
  error?: string;
};

function readCredentials(formData: FormData): {
  username: string;
  password: string;
} {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { username, password };
}

export async function createAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (countUsers() > 0) {
    return { error: "An account already exists. Sign in instead." };
  }

  const { username, password } = readCredentials(formData);
  if (!username || !password) {
    return { error: "Username and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const hash = bcrypt.hashSync(password, 12);
  const id = insertUser(username, hash, "admin");
  await setSessionCookie(id, username);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { username, password } = readCredentials(formData);
  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const user = getUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return { error: "Invalid username or password." };
  }

  await setSessionCookie(user.id, user.username);
  redirect("/dashboard");
}

export async function devLoginAsAdminAction(): Promise<ActionState> {
  if (!isDevMode()) {
    return { error: "Dev login is not enabled." };
  }

  const admin = getAdminUser();
  if (!admin) {
    return { error: "No admin account exists yet." };
  }

  await setSessionCookie(admin.id, admin.username);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
