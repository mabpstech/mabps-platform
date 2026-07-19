export const PLAN_IDS = ["free", "starter", "pro", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type PlanLimits = {
  /** Max workspace members (including owner). -1 = unlimited. */
  members: number;
  /** Max published sites. -1 = unlimited. */
  sites: number;
  /** Storage quota in megabytes. -1 = unlimited. */
  storageMb: number;
  /** Monthly AI credit allowance. -1 = unlimited. */
  aiCredits: number;
  /** Max active automations. -1 = unlimited. */
  automations: number;
  /** Max enabled marketplace plugins/extensions. -1 = unlimited. */
  plugins: number;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  /** Display prices in USD (Stripe Price IDs come from env). */
  priceUsd: Record<BillingInterval, number>;
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started with a single workspace and core tools.",
    priceUsd: { monthly: 0, yearly: 0 },
    limits: {
      members: 3,
      sites: 1,
      storageMb: 500,
      aiCredits: 100,
      automations: 0,
      plugins: 2,
    },
    features: [
      "3 team members",
      "1 site",
      "500 MB storage",
      "100 AI credits / month",
      "2 marketplace plugins",
      "Community support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small teams launching their first branded presence.",
    priceUsd: { monthly: 29, yearly: 290 },
    limits: {
      members: 10,
      sites: 5,
      storageMb: 10_240,
      aiCredits: 1_000,
      automations: 5,
      plugins: 10,
    },
    features: [
      "10 team members",
      "5 sites",
      "10 GB storage",
      "1,000 AI credits / month",
      "5 automations",
      "10 marketplace plugins",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Scale content, CRM, and automation across the team.",
    priceUsd: { monthly: 79, yearly: 790 },
    limits: {
      members: 50,
      sites: 25,
      storageMb: 102_400,
      aiCredits: 10_000,
      automations: 50,
      plugins: 50,
    },
    features: [
      "50 team members",
      "25 sites",
      "100 GB storage",
      "10,000 AI credits / month",
      "50 automations",
      "50 marketplace plugins",
      "Priority support",
    ],
    highlighted: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Advanced limits, governance, and dedicated support.",
    priceUsd: { monthly: 299, yearly: 2_990 },
    limits: {
      members: -1,
      sites: -1,
      storageMb: 1_048_576,
      aiCredits: -1,
      automations: -1,
      plugins: -1,
    },
    features: [
      "Unlimited members",
      "Unlimited sites",
      "1 TB storage",
      "Unlimited AI credits",
      "Unlimited automations",
      "Unlimited marketplace plugins",
      "Dedicated support",
    ],
  },
};

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingInterval(value: string): value is BillingInterval {
  return (BILLING_INTERVALS as readonly string[]).includes(value);
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function comparePlans(a: PlanId, b: PlanId): number {
  return PLAN_RANK[a] - PLAN_RANK[b];
}

/**
 * Resolve Stripe Price ID for a paid plan + interval from environment.
 * Free has no Stripe price.
 */
export function getStripePriceId(
  planId: PlanId,
  interval: BillingInterval,
): string | null {
  if (planId === "free") {
    return null;
  }

  const envKey =
    `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}` as const;
  const value = process.env[envKey]?.trim();
  return value || null;
}

export function resolvePlanFromPriceId(
  priceId: string | null | undefined,
): { planId: PlanId; interval: BillingInterval } | null {
  if (!priceId) {
    return null;
  }

  for (const planId of PLAN_IDS) {
    if (planId === "free") continue;
    for (const interval of BILLING_INTERVALS) {
      if (getStripePriceId(planId, interval) === priceId) {
        return { planId, interval };
      }
    }
  }

  return null;
}

export function formatLimit(value: number, unit?: string): string {
  if (value < 0) {
    return unit ? `Unlimited ${unit}` : "Unlimited";
  }
  const formatted = value.toLocaleString("en-US");
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
