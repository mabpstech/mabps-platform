/**
 * Runtime no-op for historical ensure*Ready / migrate*Schema call sites.
 *
 * Schema SQL must never be read or applied from application runtime
 * (serverless bundles do not ship module schema.sql files). Apply schemas only via:
 *   npm run db:migrate:all
 *   npm run db:migrate:<module>
 *
 * Example: createSchemaMigrator("lib/crm/schema.sql")
 */
export function createSchemaMigrator(_relativeSchemaPath: string): () => void {
  return () => {
    // Intentionally empty — migrations are CLI-only.
  };
}
