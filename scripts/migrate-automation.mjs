import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./lib/open-db.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { db, label } = openDatabase(root);

const schema = fs.readFileSync(
  path.join(root, "lib/automation/schema.sql"),
  "utf8",
);
db.exec(schema);
db.close();

console.log(`Automation schema applied to ${label}`);
