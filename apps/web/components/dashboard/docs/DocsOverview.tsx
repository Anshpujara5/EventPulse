"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import Link from "next/link";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

const INGEST_ENDPOINT = `${API_BASE}/api/events/ingest`;

const SAMPLE_BODY = `{
  "name": "product_viewed",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "product_id": "sku_123",
    "product_name": "Organic Apples",
    "category": "Grocery",
    "price": 129,
    "currency": "INR",
    "source": "homepage"
  }
}`;

const SAMPLE_CURL = `curl -X POST ${INGEST_ENDPOINT} \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"product_viewed","customerId":"customer_001","sessionId":"session_001","properties":{"product_id":"sku_123","category":"Grocery","price":129}}'`;

const IDEMPOTENCY_CURL = `curl -X POST ${INGEST_ENDPOINT} \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: purchase-ord_123" \\
  -d '{"name":"purchase_completed","customerId":"customer_001","sessionId":"session_001","properties":{"order_id":"ord_123","amount":1299,"currency":"INR"}}'`;

// Recommended commerce event names — used consistently across the funnel and
// friction analytics. Free-form names still work; these just line up with the
// built-in commerce funnel and friction signals.
const EVENT_NAME_EXAMPLES = [
  "product_viewed",
  "category_viewed",
  "search_performed",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "purchase_completed",
  "payment_completed",
  "payment_failed",
  "item_out_of_stock",
  "item_unavailable",
  "delivery_fee_shown",
  "eta_shown",
  "coupon_applied",
] as const;

// Representative commerce event bodies shown in the docs.
const COMMERCE_EXAMPLES: { title: string; body: string }[] = [
  {
    title: "add_to_cart",
    body: `{
  "name": "add_to_cart",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "product_id": "sku_123",
    "cart_value": 499,
    "quantity": 2,
    "category": "Grocery"
  }
}`,
  },
  {
    title: "checkout_started",
    body: `{
  "name": "checkout_started",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "cart_value": 1299,
    "cart_size": 5,
    "delivery_fee": 49,
    "eta_minutes": 18
  }
}`,
  },
  {
    title: "purchase_completed",
    body: `{
  "name": "purchase_completed",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "order_id": "ord_123",
    "amount": 1299,
    "currency": "INR",
    "payment_method": "upi"
  }
}`,
  },
  {
    title: "payment_failed",
    body: `{
  "name": "payment_failed",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "amount": 1299,
    "payment_method": "upi",
    "reason": "bank_declined"
  }
}`,
  },
  {
    title: "item_out_of_stock",
    body: `{
  "name": "item_out_of_stock",
  "customerId": "customer_001",
  "sessionId": "session_001",
  "properties": {
    "product_id": "sku_456",
    "product_name": "Milk 1L",
    "category": "Dairy",
    "reason": "inventory_unavailable"
  }
}`,
  },
];

const ERROR_RESPONSES: { code: string; label: string; detail: string }[] = [
  {
    code: "400",
    label: "Invalid payload",
    detail:
      "Missing or empty name/customerId/sessionId, values over 120 characters, or properties that aren't a plain JSON object.",
  },
  {
    code: "401",
    label: "Missing / invalid API key",
    detail: "No API key header was sent, or the key does not match any project.",
  },
  {
    code: "403",
    label: "Revoked key or archived project",
    detail:
      "The API key was revoked, or its project is archived so ingestion is paused.",
  },
  {
    code: "429",
    label: "Rate limit exceeded",
    detail:
      "Local limit: 100 events per minute per API key. The event is not stored — wait and retry.",
  },
];

export function DocsOverview() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="mx-auto max-w-[960px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Developer Docs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Send commerce events from your store to EventPulse using a project API
          key — track product views, carts, checkout, purchases, and friction.
        </p>
      </div>

      {/* Authentication */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-400">
            <Icon name="key" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">Authentication</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Every ingestion request is authenticated with an API key that belongs
          to one of your projects. Create keys on the{" "}
          <Link
            className="font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/api-keys"
          >
            API Keys
          </Link>{" "}
          page. A key&apos;s full value is shown only once, at creation time —
          store it securely. Send it using one of these headers:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
          {`Authorization: Bearer <API_KEY>\nx-api-key: <API_KEY>`}
        </pre>
      </GlowCard>

      {/* Send an event */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
            <Icon name="bolt" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">Send an event</h2>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
          Endpoint
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-cyan-100">
            POST {INGEST_ENDPOINT}
          </code>
          <button
            className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
            onClick={() => copy("endpoint", INGEST_ENDPOINT)}
            type="button"
          >
            {copied === "endpoint" ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
          Request body
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
          {SAMPLE_BODY}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-bold text-slate-400">name</span>,{" "}
          <span className="font-bold text-slate-400">customerId</span> (your
          store&apos;s shopper id), and{" "}
          <span className="font-bold text-slate-400">sessionId</span> (one
          shopping visit) are required.{" "}
          <span className="font-bold text-slate-400">properties</span> is
          optional and must be a plain JSON object.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Local limit: 100 events per minute per API key. Requests over the
          limit receive a 429 and are not stored.
        </p>
      </GlowCard>

      {/* Idempotency */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-300">
              <Icon name="shield" className="size-5" />
            </div>
            <h2 className="text-lg font-black text-white">Idempotency</h2>
          </div>
          <button
            className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
            onClick={() => copy("idempotency-curl", IDEMPOTENCY_CURL)}
            type="button"
          >
            {copied === "idempotency-curl" ? "Copied!" : "Copy curl"}
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          To safely retry a request without creating a duplicate event, send
          an{" "}
          <code className="rounded border border-slate-700/70 bg-slate-950/60 px-1.5 py-0.5 font-mono text-xs text-cyan-100">
            Idempotency-Key
          </code>{" "}
          header. It is scoped per API key — reusing the same key with the
          same API key returns the original event instead of inserting a new
          one.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
          {IDEMPOTENCY_CURL}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          On the first request the response includes{" "}
          <span className="font-bold text-slate-400">duplicate: false</span>.
          Repeating the same key returns{" "}
          <span className="font-bold text-slate-400">duplicate: true</span>{" "}
          with the original event and does not evaluate alerts again.
        </p>
      </GlowCard>

      {/* Curl example */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-400">
              <Icon name="code" className="size-5" />
            </div>
            <h2 className="text-lg font-black text-white">Curl example</h2>
          </div>
          <button
            className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
            onClick={() => copy("curl", SAMPLE_CURL)}
            type="button"
          >
            {copied === "curl" ? "Copied!" : "Copy curl"}
          </button>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
          {SAMPLE_CURL}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Replace the placeholder with a real API key from one of your projects.
          Keys are never shown in this documentation.
        </p>
      </GlowCard>

      {/* Commerce event examples */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
            <Icon name="cube" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">Commerce event examples</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Copy any of these bodies as a starting point. Properties are free-form
          — the ones below map cleanly to the commerce funnel and friction
          signals.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {COMMERCE_EXAMPLES.map((example) => (
            <div key={example.title}>
              <p className="mb-1 font-mono text-xs font-bold text-cyan-300">
                {example.title}
              </p>
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
                {example.body}
              </pre>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Event naming rules */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
            <Icon name="list" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">
            Event naming &amp; recommended commerce events
          </h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-cyan-400">•</span>
            Between 1 and 120 characters after trimming whitespace.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">•</span>
            No control characters (newlines, tabs, etc.).
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">•</span>
            Free-form names work, but these standard commerce names line up with
            the built-in funnel and friction analytics.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {EVENT_NAME_EXAMPLES.map((example) => (
            <code
              className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-cyan-100"
              key={example}
            >
              {example}
            </code>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          EventPulse records basic request metadata like user-agent and IP
          for debugging.
        </p>
      </GlowCard>

      {/* Error responses */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-300">
            <Icon name="shield" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">Error responses</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {ERROR_RESPONSES.map((row) => (
            <div
              className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              key={row.code}
            >
              <span className="inline-flex h-7 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/60 font-mono text-xs font-black text-rose-300">
                {row.code}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{row.label}</p>
                <p className="text-xs text-slate-400">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Where to see events */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-400/25 bg-blue-500/10 text-blue-300">
            <Icon name="pulse" className="size-5" />
          </div>
          <h2 className="text-lg font-black text-white">Where to see events</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Once ingested, events appear on the{" "}
          <Link
            className="font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/events"
          >
            Events
          </Link>{" "}
          page and under each project&apos;s{" "}
          <Link
            className="font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/projects"
          >
            project view
          </Link>
          . Aggregated metrics are on the{" "}
          <Link
            className="font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/analytics"
          >
            Analytics
          </Link>{" "}
          page.
        </p>
      </GlowCard>
    </div>
  );
}
