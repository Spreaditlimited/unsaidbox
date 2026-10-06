export class InputError extends Error {}
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
export const token = () => randomBytes(32).toString("hex");
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
const derive = (password, salt) =>
  new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
export async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    throw new InputError("Use a password between 12 and 128 characters.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length > 128) return false;
  const [version, salt, key] = String(hash).split(":");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(key)
  )
    return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(Buffer.from(key, "hex"), actual);
}
export function textValue(value, label, max, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new InputError(`${label} must be ${min}–${max} characters.`);
  return value.trim();
}
export function usernameValue(value) {
  const username = textValue(value, "Username", 30, 3).toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9_]*$/.test(username) ||
    ["admin", "support", "unsaidbox", "demo", "system"].includes(username)
  )
    throw new InputError(
      "Choose another username using letters, numbers and underscores.",
    );
  return username;
}
