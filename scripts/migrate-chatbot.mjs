import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseFile = process.env.DATABASE_URL
  ? path.isAbsolute(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : path.join(root, process.env.DATABASE_URL)
  : path.join(root, "data", "mabps.db");

fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const db = new Database(databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(
  path.join(root, "lib/chatbot/schema.sql"),
  "utf8",
);
db.exec(schema);
db.close();

console.log(`Chatbot schema applied to ${databaseFile}`);
