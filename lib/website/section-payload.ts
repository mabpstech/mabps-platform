import { isSectionType, type SectionSettings, type SectionType } from "@/lib/website/types";

export type SectionReplaceInput = {
  id?: string;
  type: SectionType;
  content?: Record<string, unknown>;
  settings?: SectionSettings;
};

/**
 * Parse a client/API sections array for replaceSections.
 * Throws Error with a clear message on invalid entries.
 */
export function parseSectionsPayload(sections: unknown): SectionReplaceInput[] {
  if (!Array.isArray(sections)) {
    throw new Error("sections array is required.");
  }

  return sections.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid section at index ${index}.`);
    }
    const record = item as Record<string, unknown>;
    if (!isSectionType(record.type)) {
      throw new Error(`Invalid section type at index ${index}.`);
    }
    return {
      id: typeof record.id === "string" ? record.id : undefined,
      type: record.type,
      content:
        record.content && typeof record.content === "object"
          ? (record.content as Record<string, unknown>)
          : undefined,
      settings:
        record.settings && typeof record.settings === "object"
          ? (record.settings as SectionSettings)
          : undefined,
    };
  });
}
