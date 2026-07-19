import assert from "node:assert/strict";
import {
  normalizePlatformEvent,
  PLATFORM_EVENT_SCHEMA_VERSION,
  PlatformEventSchemaError,
  listVersionedEventTypes,
} from "../lib/automation/event-schema";
import {
  getVectorStore,
  listVectorStores,
  resolveVectorStoreId,
} from "../lib/knowledge/vector";
import {
  CacheKeys,
  cacheClear,
  cacheGet,
  cacheGetOrSet,
  getCacheStats,
  invalidateWorkspaceEntitlements,
} from "../lib/platform/cache";
import { resolveVectorDatabaseUrl } from "../lib/vector/pg-client";

// P3-4 cache
cacheClear();
let loads = 0;
const plan = cacheGetOrSet(CacheKeys.planId("ws_test"), () => {
  loads += 1;
  return "pro";
});
assert.equal(plan, "pro");
assert.equal(cacheGet(CacheKeys.planId("ws_test")), "pro");
cacheGetOrSet(CacheKeys.planId("ws_test"), () => {
  loads += 1;
  return "free";
});
assert.equal(loads, 1, "second read should hit cache");
invalidateWorkspaceEntitlements("ws_test");
assert.equal(cacheGet(CacheKeys.planId("ws_test")), undefined);
const stats = getCacheStats();
assert.ok(stats.hits >= 1);
assert.equal(stats.driver, "memory");

// P3-5 vector driver
assert.deepEqual(listVectorStores(), ["sqlite", "pgvector"]);
assert.equal(resolveVectorStoreId(), "sqlite");
assert.equal(resolveVectorStoreId("pgvector"), "pgvector");
assert.equal(getVectorStore().id, "sqlite");
assert.equal(getVectorStore("pgvector").id, "pgvector");
assert.equal(resolveVectorDatabaseUrl(), null);

// P3-6 event schema
const events = listVersionedEventTypes();
assert.ok(events.length >= 20);
assert.equal(events[0]?.schemaVersion, PLATFORM_EVENT_SCHEMA_VERSION);

const normalized = normalizePlatformEvent({
  type: "email.sent",
  workspaceId: "ws_1",
  payload: { messageId: "m1", email: "a@b.com", subject: "Hi" },
});
assert.equal(normalized.schemaVersion, 1);
assert.ok(normalized.occurredAt);

assert.throws(
  () =>
    normalizePlatformEvent({
      type: "email.sent",
      workspaceId: "ws_1",
      payload: { email: "a@b.com" },
    }),
  (err) => err instanceof PlatformEventSchemaError,
);

assert.throws(
  () =>
    normalizePlatformEvent({
      type: "email.sent",
      workspaceId: "ws_1",
      payload: { messageId: "m1", email: "a@b.com" },
      schemaVersion: 99,
    }),
  (err) => err instanceof PlatformEventSchemaError,
);

console.log(
  JSON.stringify({
    ok: true,
    cacheHits: stats.hits,
    eventTypes: events.length,
    vectorStores: listVectorStores(),
    schemaVersion: PLATFORM_EVENT_SCHEMA_VERSION,
  }),
);
