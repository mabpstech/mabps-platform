export const DEFAULT_PIPELINE_NAME = "Sales pipeline";

export const DEFAULT_PIPELINE_STAGES = [
  { name: "New", color: "#71717a", probability: 10, isWon: false, isLost: false },
  {
    name: "Qualified",
    color: "#2563eb",
    probability: 25,
    isWon: false,
    isLost: false,
  },
  {
    name: "Proposal",
    color: "#7c3aed",
    probability: 50,
    isWon: false,
    isLost: false,
  },
  {
    name: "Negotiation",
    color: "#ea580c",
    probability: 75,
    isWon: false,
    isLost: false,
  },
  { name: "Won", color: "#16a34a", probability: 100, isWon: true, isLost: false },
  { name: "Lost", color: "#dc2626", probability: 0, isWon: false, isLost: true },
] as const;

export function contactDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}
