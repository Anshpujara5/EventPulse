import { prisma } from "../config/prisma";

interface MatchingAlertRow {
  id: string;
  threshold: number;
  windowMinutes: number;
}

interface CountRow {
  count: bigint;
}

interface LastTriggerRow {
  createdAt: Date;
}

/**
 * Best-effort, real-time alert evaluation. Called once per successfully
 * ingested event. Never throws — a failure here must not turn a stored event
 * into a failed ingestion request.
 *
 * For each ACTIVE alert matching this project + event name, counts matching
 * events within the alert's window. If the count reaches the threshold and no
 * trigger was already recorded within the current window (cooldown), a real
 * AlertTrigger row is saved. No email/Slack delivery — this only persists the
 * fact that the rule fired so the dashboard can show it honestly.
 */
export async function evaluateAlertsForEvent({
  userId,
  projectId,
  eventName,
}: {
  userId: string;
  projectId: string;
  eventName: string;
}): Promise<void> {
  try {
    const matchingAlerts = await prisma.alert.findMany({
      where: {
        userId,
        projectId,
        eventName,
        status: "ACTIVE",
      },
      select: { id: true, threshold: true, windowMinutes: true },
    });

    if (matchingAlerts.length === 0) {
      return;
    }

    for (const alert of matchingAlerts) {
      await evaluateSingleAlert(alert, projectId, eventName);
    }
  } catch (error) {
    console.error("[evaluateAlertsForEvent]", error);
  }
}

async function evaluateSingleAlert(
  alert: MatchingAlertRow,
  projectId: string,
  eventName: string,
): Promise<void> {
  const [countRow] = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS count
    FROM "Event"
    WHERE "projectId" = ${projectId}
      AND name = ${eventName}
      AND "createdAt" >= NOW() - make_interval(mins => ${alert.windowMinutes})
  `;

  const count = Number(countRow?.count ?? 0);

  if (count < alert.threshold) {
    return;
  }

  const [lastTrigger] = await prisma.$queryRaw<LastTriggerRow[]>`
    SELECT "createdAt"
    FROM "AlertTrigger"
    WHERE "alertId" = ${alert.id}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const cooldownStart = new Date(Date.now() - alert.windowMinutes * 60_000);
  const isWithinCooldown =
    lastTrigger !== undefined && lastTrigger.createdAt >= cooldownStart;

  if (isWithinCooldown) {
    return;
  }

  await prisma.alertTrigger.create({
    data: {
      alertId: alert.id,
      eventCount: count,
      threshold: alert.threshold,
    },
  });
}
