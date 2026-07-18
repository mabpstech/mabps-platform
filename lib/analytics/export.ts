import { REPORT_LABELS } from "@/lib/analytics/defaults";
import type {
  AnalyticsExportFormat,
  AnalyticsReportId,
  SeriesPoint,
} from "@/lib/analytics/types";

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return `${[
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n")}\n`;
}

export function seriesToCsvRows(
  series: SeriesPoint[],
): Array<Array<string | number>> {
  return series.map((point) => [point.date, point.value, point.label ?? ""]);
}

export type ReportTable = {
  title: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
};

export function buildCsvFromTables(tables: ReportTable[]): string {
  const parts: string[] = [];
  for (const table of tables) {
    parts.push(`# ${table.title}`);
    parts.push(rowsToCsv(table.headers, table.rows).trimEnd());
    parts.push("");
  }
  return `${parts.join("\n")}\n`;
}

/** Minimal single-page text PDF (no external dependency). */
export function buildSimplePdf(input: {
  title: string;
  subtitle?: string;
  lines: string[];
}): Buffer {
  const contentLines = [
    input.title,
    input.subtitle ?? "",
    "",
    ...input.lines,
  ].filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));

  const escaped = contentLines.map((line) =>
    line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .slice(0, 110),
  );

  const streamParts: string[] = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
  escaped.forEach((line, index) => {
    if (index === 0) {
      streamParts.push(`(${line}) Tj`);
    } else {
      streamParts.push("T*");
      streamParts.push(`(${line}) Tj`);
    }
  });
  streamParts.push("ET");
  const stream = streamParts.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function reportFilename(
  report: AnalyticsReportId,
  format: AnalyticsExportFormat,
  workspaceSlug?: string | null,
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = workspaceSlug?.replace(/[^a-z0-9-_]/gi, "") || "workspace";
  return `mabps-${slug}-${report}-${stamp}.${format}`;
}

export function reportTitle(report: AnalyticsReportId): string {
  return REPORT_LABELS[report];
}
