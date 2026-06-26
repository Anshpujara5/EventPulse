import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";

export async function getDashboardSummaryController(
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

    const userId = req.user.userId;

    const [
      totalProjects,
      totalApiKeys,
      activeApiKeys,
      revokedApiKeys,
      recentProjects,
      recentApiKeys,
    ] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.apiKey.count({ where: { userId } }),
      prisma.apiKey.count({ where: { userId, status: "ACTIVE" } }),
      prisma.apiKey.count({ where: { userId, status: "REVOKED" } }),
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          domain: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          maskedKey: true,
          keyPrefix: true,
          status: true,
          createdAt: true,
          revokedAt: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          totalProjects,
          totalApiKeys,
          activeApiKeys,
          revokedApiKeys,
          recentProjects,
          recentApiKeys,
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
