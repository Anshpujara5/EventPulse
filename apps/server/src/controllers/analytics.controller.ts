import type { Response } from "express";
import { createAnalyticsScope } from "../analytics/analyticsScope";
import { buildAnalyticsSummary } from "../analytics/summary";
import type { AuthRequest } from "../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// GET /api/analytics/summary
// ---------------------------------------------------------------------------

export async function getAnalyticsSummaryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const scopeResult = createAnalyticsScope({
      userId: req.user.userId,
      projectId: req.query.projectId,
      range: req.query.range,
      from: req.query.from,
      to: req.query.to,
    });

    if (!scopeResult.valid) {
      return res.status(400).json({
        success: false,
        message: scopeResult.message,
      });
    }

    const data = await buildAnalyticsSummary(scopeResult.value);

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[getAnalyticsSummary]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
