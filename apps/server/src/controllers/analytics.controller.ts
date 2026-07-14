import type { Response } from "express";
import {
  createAnalyticsScope,
  type AnalyticsScope,
} from "../analytics/analyticsScope";
import {
  buildAnalyticsSummary,
  buildBehaviorSummary,
  buildConversionSummary,
  buildOverviewSummary,
  buildProductsSummary,
  buildShoppersSummary,
  type AnalyticsTab,
} from "../analytics/summary";
import type { AuthRequest } from "../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// GET /api/analytics/summary
// ---------------------------------------------------------------------------

function isAnalyticsTab(value: unknown): value is AnalyticsTab {
  return (
    value === "overview" ||
    value === "conversion" ||
    value === "products" ||
    value === "shoppers" ||
    value === "behavior"
  );
}

function buildTabSummary(tab: AnalyticsTab, scope: AnalyticsScope) {
  switch (tab) {
    case "overview":
      return buildOverviewSummary(scope);
    case "conversion":
      return buildConversionSummary(scope);
    case "products":
      return buildProductsSummary(scope);
    case "shoppers":
      return buildShoppersSummary(scope);
    case "behavior":
      return buildBehaviorSummary(scope);
  }
}

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

    const tab = req.query.tab;
    if (tab !== undefined && !isAnalyticsTab(tab)) {
      return res.status(400).json({
        success: false,
        message: "Unknown analytics tab",
      });
    }

    const data =
      tab === undefined
        ? await buildAnalyticsSummary(scopeResult.value)
        : await buildTabSummary(tab, scopeResult.value);

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[getAnalyticsSummary]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
