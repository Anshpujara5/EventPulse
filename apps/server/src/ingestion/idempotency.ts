import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface IngestedEventRow {
  id: string;
  name: string;
  projectId: string;
  createdAt: Date;
  customerId?: string | null;
  sessionId?: string | null;
}

export function resolveIdempotencyKey(
  headerValue: string | string[] | undefined,
  bodyValue: unknown,
): string | undefined {
  const rawIdempotencyKey =
    typeof headerValue === "string"
      ? headerValue
      : typeof bodyValue === "string"
        ? bodyValue
        : undefined;

  return rawIdempotencyKey?.trim() || undefined;
}

export async function findEventByIdempotencyKey(
  apiKeyId: string,
  idempotencyKey: string,
): Promise<IngestedEventRow | undefined> {
  const [existing] = await prisma.$queryRaw<IngestedEventRow[]>`
    SELECT id, name, "projectId", "createdAt", "customerId", "sessionId"
    FROM "Event"
    WHERE "apiKeyId" = ${apiKeyId} AND "idempotencyKey" = ${idempotencyKey}
    LIMIT 1
  `;

  return existing;
}

export function isIdempotencyUniqueViolation(error: unknown): boolean {
  const meta =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.meta
      : undefined;

  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof meta?.code === "string" &&
    meta.code === "23505"
  );
}
