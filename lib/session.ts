import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "qiosk_session";

export type SessionPayload = {
  sub: number;
  u: string;
  exp: number;
};

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return "dev-insecure-qiosk-session-secret";
  }
  return s;
}

function sign(payloadB64url: string): string {
  return createHmac("sha256", getSecret())
    .update(payloadB64url)
    .digest("base64url");
}

export function sealSession(userId: number, username: string): string {
  const payload: SessionPayload = {
    sub: userId,
    u: username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function openSession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const data = JSON.parse(json) as SessionPayload;
    if (
      typeof data.sub !== "number" ||
      typeof data.u !== "string" ||
      typeof data.exp !== "number"
    ) {
      return null;
    }
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return openSession(raw);
}

export async function setSessionCookie(userId: number, username: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, sealSession(userId, username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
