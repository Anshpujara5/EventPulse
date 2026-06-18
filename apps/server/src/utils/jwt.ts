import "dotenv/config";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

const jwtSecretValue = jwtSecret;

export type JwtPayload = {
  userId: string;
  email: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecretValue, {
    expiresIn: jwtExpiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecretValue) as unknown as JwtPayload;
}
