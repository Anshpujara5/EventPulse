import { AlertStatus } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { isNonEmptyString, normalizeString } from "../utils/validation";

// Shape returned to the dashboard — includes the owning project's name/status
// so the UI can show context and whether ingestion is currently active.
const alertSelect = {
  id: true,
  name: true,
  eventName: true,
  threshold: true,
  windowMinutes: true,
  status: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isAlertStatus(value: unknown): value is AlertStatus {
  return value === AlertStatus.ACTIVE || value === AlertStatus.INACTIVE;
}

interface TriggerStatsRow {
  alertId: string;
  lastTriggeredAt: Date;
  triggerCount: bigint;
}

export async function getAlertsController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user.userId;

    const [alerts, triggerStats] = await Promise.all([
      prisma.alert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: alertSelect,
      }),
      // Real trigger history, scoped through the alert -> user relation
      // (no denormalized userId on AlertTrigger to avoid duplicated data).
      prisma.$queryRaw<TriggerStatsRow[]>`
        SELECT t."alertId", MAX(t."createdAt") AS "lastTriggeredAt", COUNT(*) AS "triggerCount"
        FROM "AlertTrigger" t
        JOIN "Alert" a ON a.id = t."alertId"
        WHERE a."userId" = ${userId}
        GROUP BY t."alertId"
      `,
    ]);

    const statsByAlertId = new Map(
      triggerStats.map((row) => [row.alertId, row]),
    );

    const enrichedAlerts = alerts.map((alert) => {
      const stats = statsByAlertId.get(alert.id);
      return {
        ...alert,
        lastTriggeredAt: stats?.lastTriggeredAt ?? null,
        triggerCount: Number(stats?.triggerCount ?? 0),
      };
    });

    return res.json({
      success: true,
      data: { alerts: enrichedAlerts },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getAlertTriggersController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const triggers = await prisma.alertTrigger.findMany({
      where: { alert: { userId: req.user.userId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventCount: true,
        threshold: true,
        createdAt: true,
        alert: {
          select: {
            id: true,
            name: true,
            eventName: true,
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: { triggers },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function createAlertController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, eventName, threshold, windowMinutes, projectId } = req.body;

    if (!isNonEmptyString(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        success: false,
        message: "Alert name is required",
      });
    }

    if (!isNonEmptyString(eventName)) {
      return res.status(400).json({
        success: false,
        message: "Event name is required",
      });
    }

    if (!isPositiveInt(threshold)) {
      return res.status(400).json({
        success: false,
        message: "threshold must be a positive integer",
      });
    }

    if (!isPositiveInt(windowMinutes)) {
      return res.status(400).json({
        success: false,
        message: "windowMinutes must be a positive integer",
      });
    }

    // The alert must be tied to a project owned by the requesting user.
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.userId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const alert = await prisma.alert.create({
      data: {
        name: normalizeString(name),
        eventName: normalizeString(eventName),
        threshold,
        windowMinutes,
        userId: req.user.userId,
        projectId,
      },
      select: alertSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: { alert },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function updateAlertController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    const existing = await prisma.alert.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    const { name, eventName, threshold, windowMinutes, status } = req.body;

    const data: {
      name?: string;
      eventName?: string;
      threshold?: number;
      windowMinutes?: number;
      status?: AlertStatus;
    } = {};

    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        return res.status(400).json({
          success: false,
          message: "Alert name must be a non-empty string",
        });
      }
      data.name = normalizeString(name);
    }

    if (eventName !== undefined) {
      if (!isNonEmptyString(eventName)) {
        return res.status(400).json({
          success: false,
          message: "Event name must be a non-empty string",
        });
      }
      data.eventName = normalizeString(eventName);
    }

    if (threshold !== undefined) {
      if (!isPositiveInt(threshold)) {
        return res.status(400).json({
          success: false,
          message: "threshold must be a positive integer",
        });
      }
      data.threshold = threshold;
    }

    if (windowMinutes !== undefined) {
      if (!isPositiveInt(windowMinutes)) {
        return res.status(400).json({
          success: false,
          message: "windowMinutes must be a positive integer",
        });
      }
      data.windowMinutes = windowMinutes;
    }

    if (status !== undefined) {
      if (!isAlertStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE",
        });
      }
      data.status = status;
    }

    const alert = await prisma.alert.update({
      where: { id: existing.id },
      data,
      select: alertSelect,
    });

    return res.json({
      success: true,
      message: "Alert updated successfully",
      data: { alert },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function deleteAlertController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    const existing = await prisma.alert.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    await prisma.alert.delete({ where: { id: existing.id } });

    return res.json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
