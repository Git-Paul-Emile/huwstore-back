import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export type JwtPayload = { userId: string; role: "CLIENT" | "ADMIN" };

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

/**
 * `jwtid` : identifiant unique par jeton. Sans lui, deux connexions du même
 * compte dans la même seconde produisent une chaîne identique (mêmes `userId`,
 * `role`, `iat`, `exp`) - et donc le même hachage, qui viole la contrainte
 * unique de `RefreshToken.tokenHash`.
 */
export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: "30d", jwtid: randomUUID() });

export const verifyAccessToken = (token: string) => jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) => jwt.verify(token, env.REFRESH_TOKEN_SECRET) as JwtPayload;
