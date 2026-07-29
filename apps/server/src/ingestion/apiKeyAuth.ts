import { prisma } from "../config/prisma";
import { hashApiKey } from "../utils/apiKey";

interface ActiveApiKeyRow {
  id: string;
  userId: string;
  projectId: string;
  status: string;
  projectStatus: string;
}

export type ApiKeyAuthenticationResult =
  | { status: "invalid" }
  | { status: "revoked" }
  | { status: "projectInactive" }
  | { status: "authenticated"; apiKey: ActiveApiKeyRow };

export function extractRawApiKey(
  authHeader: string | string[] | undefined,
  xApiKey: string | string[] | undefined,
): string | undefined {
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (typeof xApiKey === "string") {
    return xApiKey.trim();
  }

  return undefined;
}

export async function authenticateApiKey(
  rawKey: string,
): Promise<ApiKeyAuthenticationResult> {
  const keyHash = hashApiKey(rawKey);

  const [apiKeyRow] = await prisma.$queryRaw<ActiveApiKeyRow[]>`
    SELECT a.id, a."userId", a."projectId", a.status, p.status AS "projectStatus"
    FROM "ApiKey" a
    JOIN "Project" p ON p.id = a."projectId"
    WHERE a."keyHash" = ${keyHash}
    LIMIT 1
  `;

  if (!apiKeyRow) {
    return { status: "invalid" };
  }

  if (apiKeyRow.status !== "ACTIVE") {
    return { status: "revoked" };
  }

  if (apiKeyRow.projectStatus !== "ACTIVE") {
    return { status: "projectInactive" };
  }

  return { status: "authenticated", apiKey: apiKeyRow };
}
