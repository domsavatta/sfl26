import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Player, PlayerSession } from "@/interfaces";

const SESSION_COOKIE = "session";
// Cookie from the old, unsigned scheme; cleared whenever a session is written.
const LEGACY_PLAYER_COOKIE = "player";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SessionPayload = PlayerSession & { exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set (32+ characters). Generate one with: openssl rand -base64 32",
    );
  }
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Token format: base64url(JSON payload) + "." + HMAC-SHA256 signature. */
function encode(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

function decode(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Signs the player in. Call only from a Server Action or Route Handler. */
export async function createSession(player: PlayerSession) {
  const exp = Date.now() + SESSION_TTL_MS;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encode({ ...player, exp }), {
    httpOnly: true,
    // Browsers drop Secure cookies on plain http (except localhost), which
    // would break signing in from a phone on the dev server's LAN address.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
  cookieStore.delete(LEGACY_PLAYER_COOKIE);
}

/** Signs the player out. Call only from a Server Action or Route Handler. */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_PLAYER_COOKIE);
}

/**
 * The verified signed-in player, or null. Safe to use for authorization:
 * the cookie is signed, so a player can't forge or edit it.
 */
export async function getSession(): Promise<PlayerSession | null> {
  const cookieStore = await cookies();
  const payload = decode(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const { exp: _exp, ...player } = payload;
  return player;
}

/** Just the name and id, for display (e.g. the header greeting). */
export async function getCurrentPlayer(): Promise<Player | null> {
  const session = await getSession();
  return session
    ? { playerId: session.playerId, playerName: session.playerName }
    : null;
}
