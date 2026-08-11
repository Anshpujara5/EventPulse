import { Prisma } from "@prisma/client";
import {
  CURRENCY_CODE_PATTERN,
  NEGATIVE_MONEY_SQL_PATTERN,
  NON_NEGATIVE_MONEY_SQL_PATTERN,
} from "../../contract/moneyRules";
import { ORDER_FACT_EVENT_NAMES } from "../../contract/orderIdentity";

const PAYMENT_COMPLETED_EVENT_NAME = "payment_completed";
export const CURRENCY_SQL_PATTERN = CURRENCY_CODE_PATTERN.source;

export function orderFactNamesSql(): Prisma.Sql {
  return Prisma.join([...ORDER_FACT_EVENT_NAMES]);
}

export function allMoneyEvidenceNamesSql(): Prisma.Sql {
  return Prisma.join([
    ...ORDER_FACT_EVENT_NAMES,
    PAYMENT_COMPLETED_EVENT_NAME,
  ]);
}

export function orderFactsCtes(eventScope: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    scoped_sales_events AS (
      SELECT
        id,
        name,
        properties,
        "projectId",
        "sessionId",
        "customerId",
        "createdAt",
        NULLIF(BTRIM(properties->>'order_id'), '') AS order_id,
        properties->>'amount' AS amount_text,
        properties->>'currency' AS currency_text
      FROM "Event"
      WHERE ${eventScope}
        AND LOWER(name) IN (${allMoneyEvidenceNamesSql()})
    ),
    order_fact_events AS (
      SELECT *
      FROM scoped_sales_events
      WHERE LOWER(name) IN (${orderFactNamesSql()})
    ),
    identity_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "projectId", order_id
          ORDER BY "createdAt" ASC, id ASC
        ) AS identity_rank
      FROM order_fact_events
      WHERE order_id IS NOT NULL
    ),
    identity_representatives AS (
      SELECT *
      FROM identity_ranked
      WHERE identity_rank = 1
    ),
    session_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "projectId", NULLIF(BTRIM("sessionId"), '')
          ORDER BY "createdAt" ASC, id ASC
        ) AS session_rank
      FROM order_fact_events
      WHERE NULLIF(BTRIM("sessionId"), '') IS NOT NULL
    ),
    session_representatives AS (
      SELECT *
      FROM session_ranked
      WHERE session_rank = 1
    ),
    money_evidence AS (
      SELECT e.*
      FROM scoped_sales_events e
      INNER JOIN identity_representatives i
        ON i."projectId" = e."projectId"
       AND i.order_id = e.order_id
    ),
    classified_money_evidence AS (
      SELECT
        *,
        CASE
          WHEN amount_text IS NULL OR BTRIM(amount_text) = '' THEN 'missing'
          WHEN amount_text ~ ${NEGATIVE_MONEY_SQL_PATTERN} THEN 'negative'
          WHEN amount_text ~ ${NON_NEGATIVE_MONEY_SQL_PATTERN} THEN 'valid'
          ELSE 'invalid'
        END AS amount_state,
        CASE
          WHEN currency_text IS NULL OR BTRIM(currency_text) = '' THEN 'missing'
          WHEN BTRIM(currency_text) ~ ${CURRENCY_SQL_PATTERN} THEN 'valid'
          ELSE 'invalid'
        END AS currency_state
      FROM money_evidence
    ),
    valid_money_evidence AS (
      SELECT
        *,
        amount_text::numeric AS amount_value,
        BTRIM(currency_text) AS normalized_currency,
        CASE
          WHEN LOWER(name) IN (${orderFactNamesSql()}) THEN 0
          ELSE 1
        END AS source_priority
      FROM classified_money_evidence
      WHERE amount_state = 'valid'
        AND currency_state = 'valid'
    ),
    ranked_money_evidence AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "projectId", order_id
          ORDER BY source_priority ASC, "createdAt" ASC, id ASC
        ) AS money_rank
      FROM valid_money_evidence
    ),
    money_representatives AS (
      SELECT *
      FROM ranked_money_evidence
      WHERE money_rank = 1
    ),
    money_evidence_quality AS (
      SELECT
        "projectId",
        order_id,
        BOOL_OR(amount_state <> 'missing') AS has_amount,
        BOOL_OR(amount_state = 'invalid') AS has_invalid_amount,
        BOOL_OR(amount_state = 'negative') AS has_negative_amount,
        BOOL_OR(
          amount_state = 'valid' AND currency_state = 'missing'
        ) AS has_missing_currency,
        BOOL_OR(
          amount_state = 'valid' AND currency_state = 'invalid'
        ) AS has_invalid_currency,
        COUNT(DISTINCT (
          CASE
            WHEN amount_state = 'valid' AND currency_state = 'valid'
              THEN amount_text::numeric
          END,
          CASE
            WHEN amount_state = 'valid' AND currency_state = 'valid'
              THEN BTRIM(currency_text)
          END
        )) FILTER (
          WHERE amount_state = 'valid' AND currency_state = 'valid'
        ) > 1 AS has_conflicting_money
      FROM classified_money_evidence
      GROUP BY "projectId", order_id
    ),
    order_quality AS (
      SELECT
        i."projectId",
        i.order_id,
        q.has_amount,
        q.has_invalid_amount,
        q.has_negative_amount,
        q.has_missing_currency,
        q.has_invalid_currency,
        q.has_conflicting_money,
        m.id AS money_representative_id
      FROM identity_representatives i
      LEFT JOIN money_evidence_quality q
        ON q."projectId" = i."projectId" AND q.order_id = i.order_id
      LEFT JOIN money_representatives m
        ON m."projectId" = i."projectId" AND m.order_id = i.order_id
    ),
    currency_slices AS (
      SELECT
        normalized_currency AS currency,
        SUM(amount_value) AS gmv,
        COUNT(*) AS money_bearing_orders
      FROM money_representatives
      GROUP BY normalized_currency
    )
  `;
}
