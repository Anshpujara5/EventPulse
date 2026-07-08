export const metrics = [
  {
    label: "Total Events",
    value: "125,842",
    delta: "12.8%",
    deltaTone: "text-emerald-400",
    icon: "pulse",
    spark: "M0 38 L15 35 L28 31 L42 32 L54 24 L66 27 L78 17 L91 21 L104 8",
  },
  {
    label: "Events / min",
    value: "2,094",
    delta: "8.4%",
    deltaTone: "text-emerald-400",
    icon: "clock",
    spark: "M0 34 L14 33 L27 29 L39 31 L50 24 L62 28 L74 18 L87 20 L104 10",
  },
  {
    label: "Active Projects",
    value: "12",
    delta: "3 new",
    deltaTone: "text-cyan-300",
    icon: "folder",
    spark: "M0 35 L14 35 L28 30 L42 31 L56 26 L70 27 L84 22 L104 19",
  },
  {
    label: "Error Rate",
    value: "0.18%",
    delta: "0.05%",
    deltaTone: "text-emerald-400",
    icon: "activity",
    spark: "M0 38 L15 36 L28 35 L42 30 L54 29 L66 24 L78 27 L91 21 L104 12",
  },
] as const;

export const eventStream = [
  ["product_viewed", "sku_123 · Organic Apples", "2s ago", "OK", "bg-cyan-400"],
  ["add_to_cart", "cart ₹499 · qty 2", "5s ago", "OK", "bg-emerald-400"],
  ["checkout_started", "cart ₹1,299 · 5 items", "8s ago", "OK", "bg-blue-400"],
  ["purchase_completed", "ord_8476 · ₹1,299", "10s ago", "OK", "bg-violet-400"],
  ["payment_failed", "upi · bank_declined", "12s ago", "FAIL", "bg-rose-400"],
] as const;

export const categories = [
  ["Product views", "32%", "bg-cyan-400"],
  ["Add to cart", "24%", "bg-blue-500"],
  ["Checkout", "18%", "bg-violet-500"],
  ["Purchases", "14%", "bg-rose-500"],
  ["Friction", "12%", "bg-amber-400"],
] as const;

export const healthRows = ["Product Views", "Add to Cart", "Checkout", "Purchases"];

export const apiSummary = [
  ["Active API Keys", "5"],
  ["Events accepted today", "42,982"],
  ["Queue status", "Normal"],
  ["Worker status", "Running"],
] as const;

export const activityRows = [
  ["product_viewed", "Main Store", "Accepted", "Just now"],
  ["add_to_cart", "Main Store", "Accepted", "1m ago"],
  ["checkout_started", "Mobile App", "Queued", "2m ago"],
  ["purchase_completed", "Main Store", "Accepted", "4m ago"],
  ["payment_failed", "Mobile App", "Failed", "8m ago"],
] as const;

export const apiKeys = [
  ["web-store-key", "48.7K", "w-[92%]"],
  ["mobile-app-key", "32.1K", "w-[70%]"],
  ["quick-commerce-key", "18.9K", "w-[50%]"],
  ["staging-key", "8.4K", "w-[30%]"],
  ["analytics-key", "6.3K", "w-[24%]"],
] as const;

export const bars = [34, 48, 56, 72, 64, 83, 68, 76, 58, 70, 78, 61, 74, 90, 63, 75];
