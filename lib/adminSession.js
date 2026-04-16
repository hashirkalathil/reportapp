export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24;
export const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;

export function createSessionPayload(username, timestamp) {
  return `${username}:${timestamp}`;
}

export function createSessionTokenValue(username, timestamp, signature) {
  return `${encodeURIComponent(username)}.${timestamp}.${signature}`;
}

export function parseSessionToken(token) {
  if (!token) {
    return null;
  }

  const [encodedUsername, rawTimestamp, signature] = token.split(".");

  if (!encodedUsername || !rawTimestamp || !signature) {
    return null;
  }

  const timestamp = Number(rawTimestamp);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  try {
    return {
      username: decodeURIComponent(encodedUsername),
      timestamp,
      signature,
    };
  } catch {
    return null;
  }
}
