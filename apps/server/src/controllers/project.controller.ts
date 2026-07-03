import { ProjectStatus } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  isNonEmptyString,
  isValidDomain,
  normalizeString,
} from "../utils/validation";

function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === ProjectStatus.ACTIVE || value === ProjectStatus.INACTIVE;
}

export async function createProjectController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { name, domain, description } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        message: "Valid domain is required",
      });
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const normalizedDescription =
      description === undefined ? undefined : normalizeString(description);

    const project = await prisma.project.create({
      data: {
        name: normalizeString(name),
        domain: normalizeString(domain),
        description: normalizedDescription,
        userId: req.user.userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project,
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

export async function getProjectsController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: {
        projects,
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

export async function getProjectByIdController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      data: {
        project,
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

export async function updateProjectController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Ownership check — a user can only update their own project.
    const existing = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const { name, domain, status, description } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        message: "Valid domain is required",
      });
    }

    if (status !== undefined && !isProjectStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const data: {
      name: string;
      domain: string;
      status?: ProjectStatus;
      description?: string | null;
    } = {
      name: normalizeString(name),
      domain: normalizeString(domain),
    };

    if (status !== undefined) {
      data.status = status;
    }

    if (description !== undefined) {
      data.description = normalizeString(description) || null;
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data,
    });

    return res.json({
      success: true,
      message: "Project updated successfully",
      data: {
        project,
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

export async function getProjectSummaryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    if (typeof id !== "string") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Ownership check first — never leak another user's project counts.
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId,
      },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Event counts use raw SQL (consistent with the rest of the events code,
    // which does not rely on a generated `event` delegate).
    const [totalApiKeys, activeApiKeys, eventCounts] = await Promise.all([
      prisma.apiKey.count({ where: { userId, projectId: id } }),
      prisma.apiKey.count({
        where: { userId, projectId: id, status: "ACTIVE" },
      }),
      prisma.$queryRaw<{ total: bigint; recent: bigint }[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours') AS recent
        FROM "Event"
        WHERE "userId" = ${userId}
          AND "projectId" = ${id}
      `,
    ]);

    const eventRow = eventCounts[0];

    return res.json({
      success: true,
      data: {
        summary: {
          totalEvents: Number(eventRow?.total ?? 0),
          eventsLast24h: Number(eventRow?.recent ?? 0),
          totalApiKeys,
          activeApiKeys,
        },
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

// Archive/restore is a non-destructive status flip. Archiving sets the project
// INACTIVE (pausing ingestion) without deleting any events or API keys;
// restoring sets it back to ACTIVE. Both are ownership-checked.
async function setProjectStatus(
  req: AuthRequest,
  res: Response,
  status: ProjectStatus,
  successMessage: string,
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const existing = await prisma.project.findFirst({
    where: {
      id,
      userId: req.user.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: { status },
  });

  return res.json({
    success: true,
    message: successMessage,
    data: {
      project,
    },
  });
}

export async function archiveProjectController(
  req: AuthRequest,
  res: Response,
) {
  try {
    return await setProjectStatus(
      req,
      res,
      ProjectStatus.INACTIVE,
      "Project archived. Event ingestion is paused for this project.",
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function restoreProjectController(
  req: AuthRequest,
  res: Response,
) {
  try {
    return await setProjectStatus(
      req,
      res,
      ProjectStatus.ACTIVE,
      "Project restored. Event ingestion is active again.",
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
