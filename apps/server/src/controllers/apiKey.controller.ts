import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  generateApiKey,
  getApiKeyDisplayValues,
  hashApiKey,
} from "../utils/apiKey";
import { isNonEmptyString, normalizeString } from "../utils/validation";

const apiKeySelect = {
  id: true,
  name: true,
  keyPrefix: true,
  maskedKey: true,
  permissions: true,
  status: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      domain: true,
      status: true,
    },
  },
};

export async function getApiKeysController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: apiKeySelect,
    });

    return res.json({
      success: true,
      data: {
        apiKeys,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function createApiKeyController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { name, permissions, projectId } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        success: false,
        message: "API key name is required",
      });
    }

    if (!isNonEmptyString(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    if (permissions !== undefined && typeof permissions !== "string") {
      return res.status(400).json({
        success: false,
        message: "Permissions must be a string",
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user.userId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const rawApiKey = generateApiKey();
    const { keyPrefix, maskedKey } = getApiKeyDisplayValues(rawApiKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        name: normalizeString(name),
        keyHash: hashApiKey(rawApiKey),
        keyPrefix,
        maskedKey,
        permissions: isNonEmptyString(permissions)
          ? normalizeString(permissions)
          : "Ingest Events",
        userId: req.user.userId,
        projectId,
      },
      select: apiKeySelect,
    });

    return res.status(201).json({
      success: true,
      message: "API key created successfully",
      data: {
        apiKey,
        rawApiKey,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function deleteApiKeyController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (!isNonEmptyString(id)) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!existingApiKey) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    const apiKey = await prisma.apiKey.update({
      where: {
        id: existingApiKey.id,
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      select: apiKeySelect,
    });

    return res.json({
      success: true,
      message: "API key revoked successfully",
      data: {
        apiKey,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
