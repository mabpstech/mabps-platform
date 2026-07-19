import { promises as dns } from "node:dns";

export type DnsTxtCheckResult = {
  ok: boolean;
  records: string[];
  error: string | null;
};

export type DnsCnameCheckResult = {
  ok: boolean;
  records: string[];
  error: string | null;
};

/**
 * Verify a TXT record contains the expected token.
 * Looks up `_mabps-verify.<hostname>` by default.
 */
export async function verifyTxtRecord(options: {
  hostname: string;
  expectedToken: string;
  recordHost?: string;
}): Promise<DnsTxtCheckResult> {
  const host =
    options.recordHost || `_mabps-verify.${options.hostname}`;
  try {
    const answers = await dns.resolveTxt(host);
    const records = answers.map((chunks) => chunks.join(""));
    const ok = records.some((record) =>
      record.includes(options.expectedToken),
    );
    return {
      ok,
      records,
      error: ok
        ? null
        : `TXT record on ${host} does not contain the verification token.`,
    };
  } catch (error) {
    return {
      ok: false,
      records: [],
      error:
        error instanceof Error
          ? error.message
          : `Unable to resolve TXT for ${host}.`,
    };
  }
}

export async function verifyCnameRecord(options: {
  hostname: string;
  expectedTarget: string;
}): Promise<DnsCnameCheckResult> {
  const expected = options.expectedTarget.replace(/\.$/, "").toLowerCase();
  try {
    const records = await dns.resolveCname(options.hostname);
    const normalized = records.map((item) =>
      item.replace(/\.$/, "").toLowerCase(),
    );
    const ok = normalized.some(
      (record) => record === expected || record.endsWith(`.${expected}`),
    );
    return {
      ok,
      records: normalized,
      error: ok
        ? null
        : `CNAME for ${options.hostname} does not point to ${expected}.`,
    };
  } catch (error) {
    return {
      ok: false,
      records: [],
      error:
        error instanceof Error
          ? error.message
          : `Unable to resolve CNAME for ${options.hostname}.`,
    };
  }
}

export function dnsInstructions(options: {
  hostname: string;
  verificationToken: string;
  cnameTarget: string | null;
}): {
  txtHost: string;
  txtValue: string;
  cnameHost: string;
  cnameValue: string | null;
} {
  return {
    txtHost: `_mabps-verify.${options.hostname}`,
    txtValue: options.verificationToken,
    cnameHost: options.hostname,
    cnameValue: options.cnameTarget,
  };
}
