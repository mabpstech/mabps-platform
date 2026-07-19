import net from "node:net";
import tls from "node:tls";
import { formatFromAddress } from "@/lib/email-engine/defaults";
import type { EmailProviderSendResult } from "@/lib/email-engine/types";

type SmtpSocket = net.Socket | tls.TLSSocket;

function encodeAuth(user: string, password: string): string {
  return Buffer.from(`\u0000${user}\u0000${password}`, "utf8").toString(
    "base64",
  );
}

function buildMimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
}): string {
  const boundary = `mabps_${Date.now().toString(36)}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@mabps.local>`,
  ];
  if (input.replyTo) headers.push(`Reply-To: ${input.replyTo}`);

  const text = input.text || stripHtml(input.html || input.subject);
  const html = input.html || `<p>${escapeHtml(text)}</p>`;

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  return [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

class SmtpClient {
  private socket: SmtpSocket | null = null;
  private buffer = "";
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;

  constructor(host: string, port: number, secure: boolean) {
    this.host = host;
    this.port = port;
    this.secure = secure;
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      if (this.secure && this.port === 465) {
        const socket = tls.connect(
          { host: this.host, port: this.port, servername: this.host },
          () => {
            socket.off("error", onError);
            this.socket = socket;
            resolve();
          },
        );
        socket.on("error", onError);
        socket.setEncoding("utf8");
        socket.on("data", (chunk: string) => {
          this.buffer += chunk;
        });
      } else {
        const socket = net.connect({ host: this.host, port: this.port }, () => {
          socket.off("error", onError);
          this.socket = socket;
          resolve();
        });
        socket.on("error", onError);
        socket.setEncoding("utf8");
        socket.on("data", (chunk: string) => {
          this.buffer += chunk;
        });
      }
    });
  }

  private async readResponse(): Promise<{ code: number; lines: string[] }> {
    const started = Date.now();
    while (Date.now() - started < 30_000) {
      const match = this.buffer.match(
        /^(\d{3})([ -])(.*(?:\r?\n(?!\d{3}[ -]).*)*)\r?\n/,
      );
      if (match) {
        const full = match[0];
        this.buffer = this.buffer.slice(full.length);
        const code = Number(match[1]);
        const lines = full
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => line.slice(4));
        return { code, lines };
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error("SMTP response timeout.");
  }

  private async command(
    command: string,
    expect: number | number[],
  ): Promise<{ code: number; lines: string[] }> {
    if (!this.socket) throw new Error("SMTP not connected.");
    this.socket.write(`${command}\r\n`);
    const response = await this.readResponse();
    const expected = Array.isArray(expect) ? expect : [expect];
    if (!expected.includes(response.code)) {
      throw new Error(
        `SMTP ${command.split(" ")[0]} failed (${response.code}): ${response.lines.join(" ")}`,
      );
    }
    return response;
  }

  async upgradeToTls(): Promise<void> {
    if (!this.socket) throw new Error("SMTP not connected.");
    const plain = this.socket as net.Socket;
    await new Promise<void>((resolve, reject) => {
      const secureSocket = tls.connect(
        {
          socket: plain,
          host: this.host,
          servername: this.host,
        },
        () => {
          secureSocket.off("error", reject);
          this.socket = secureSocket;
          this.buffer = "";
          secureSocket.setEncoding("utf8");
          secureSocket.on("data", (chunk: string) => {
            this.buffer += chunk;
          });
          resolve();
        },
      );
      secureSocket.on("error", reject);
    });
  }

  async quit(): Promise<void> {
    try {
      if (this.socket) {
        await this.command("QUIT", [221, 250]).catch(() => undefined);
        this.socket.destroy();
      }
    } catch {
      this.socket?.destroy();
    } finally {
      this.socket = null;
    }
  }

  async send(input: {
    user?: string | null;
    password?: string | null;
    fromEmail: string;
    fromName?: string | null;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | null;
  }): Promise<string | undefined> {
    await this.readResponse(); // banner
    await this.command(`EHLO mabps.local`, 250);

    if (!this.secure && this.port !== 465) {
      try {
        await this.command("STARTTLS", 220);
        await this.upgradeToTls();
        await this.command(`EHLO mabps.local`, 250);
      } catch {
        // Some local SMTP servers have no STARTTLS; continue if AUTH not required.
      }
    }

    if (input.user && input.password) {
      await this.command("AUTH PLAIN " + encodeAuth(input.user, input.password), 235);
    }

    const from = formatFromAddress(input.fromEmail, input.fromName);
    await this.command(`MAIL FROM:<${input.fromEmail}>`, 250);
    await this.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await this.command("DATA", 354);

    const mime = buildMimeMessage({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (!this.socket) throw new Error("SMTP not connected.");
    this.socket.write(`${mime.replace(/\n\./g, "\n..")}\r\n.\r\n`);
    const dataResponse = await this.readResponse();
    if (dataResponse.code !== 250) {
      throw new Error(
        `SMTP DATA failed (${dataResponse.code}): ${dataResponse.lines.join(" ")}`,
      );
    }

    const idLine = dataResponse.lines.find((line) => /id[=:\s]/i.test(line));
    return idLine?.match(/[A-Za-z0-9._-]{8,}/)?.[0];
  }
}

export async function sendWithSmtp(input: {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
}): Promise<EmailProviderSendResult> {
  const client = new SmtpClient(input.host, input.port, input.secure);
  try {
    await client.connect();
    const providerMessageId = await client.send(input);
    await client.quit();
    return {
      ok: true,
      providerMessageId,
      raw: { transport: "smtp", host: input.host, port: input.port },
    };
  } catch (error) {
    await client.quit().catch(() => undefined);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SMTP send failed.",
    };
  }
}
