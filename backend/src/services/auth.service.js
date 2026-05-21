import crypto from "node:crypto";

const hashWithSalt = (password, salt) =>
  crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");

export const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const digest = hashWithSalt(password, salt);
  return `${salt}$${digest}`;
};

export const verifyPassword = (password, hash) => {
  if (typeof hash !== "string" || !hash.includes("$")) {
    return false;
  }

  const [salt, expectedDigest] = hash.split("$");
  if (!salt || !expectedDigest) {
    return false;
  }

  const actualDigest = hashWithSalt(password, salt);
  if (expectedDigest.length !== actualDigest.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expectedDigest), Buffer.from(actualDigest));
};

export const createSessionManager = ({ sessionTtlHours, now = () => Date.now() }) => {
  const sessions = new Map();

  const issueToken = (userId) => {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = now() + sessionTtlHours * 60 * 60 * 1000;
    sessions.set(token, { userId, expiresAt });
    return token;
  };

  const getSession = (token) => {
    if (!token || typeof token !== "string") {
      return null;
    }

    const session = sessions.get(token);
    if (!session) {
      return null;
    }

    if (session.expiresAt <= now()) {
      sessions.delete(token);
      return null;
    }

    return session;
  };

  const invalidateToken = (token) => {
    if (!token) {
      return false;
    }
    return sessions.delete(token);
  };

  return {
    issueToken,
    getSession,
    invalidateToken,
    size: () => sessions.size,
  };
};

