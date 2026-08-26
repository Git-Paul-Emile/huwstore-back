import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "";

export type JwtPayload = { userId: string; role: "CLIENT" | "ADMIN" };

export const signAccessToken = (payload: JwtPayload) => jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (payload: JwtPayload) => jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "30d" });

export const verifyAccessToken = (token: string) => jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) => jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
