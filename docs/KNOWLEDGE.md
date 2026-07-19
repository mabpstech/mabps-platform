# Knowledge ownership

Clarifies the two knowledge stores in MABPS and their API / retrieval boundaries (P2-6).

## Ownership matrix

| Store | Scope | Tables | Storage | Retrieval | Primary APIs |
| --- | --- | --- | --- | --- | --- |
| **Workspace knowledge** | Org-wide FAQs, docs, site crawls | `kb_source`, `kb_source_version`, `kb_chunk`, `kb_embedding` | `data/uploads/knowledge/` | Hybrid semantic (embeddings + vectors) with lexical fallback via `searchKnowledge` | `/api/knowledge/*` |
| **Chatbot-local KB** | Per-bot uploads / overrides | `chatbot_knowledge_source`, `chatbot_knowledge_chunk` | `data/uploads/chatbot/{workspaceId}/{botId}` | Lexical token overlap via `retrieveRelevantChunks` | `/api/chatbot/knowledge/*` |

Both are intentional. The chatbot engine merges them into one prompt context; schemas are **not** merged.

## Consumers

| Consumer | Workspace KB | Chatbot-local KB |
| --- | --- | --- |
| Chatbot visitor engine (`lib/chatbot/engine/chat.ts`) | Yes — `searchKnowledgeForChatbot` | Yes — `listKnowledgeChunks` + `retrieveRelevantChunks` |
| AI assistant tool `knowledge_search` | Yes — `searchKnowledge` | No |
| Automation knowledge step | Yes — `searchKnowledgeForAutomation` | No |

## API boundaries

- **Do** manage org-wide sources only through `/api/knowledge/*` (member/manager knowledge auth).
- **Do** manage bot-scoped sources only through `/api/chatbot/knowledge/*` (requires `botId`; chatbot auth).
- **Do not** expose chatbot chunks on `/api/knowledge/search`.
- **Do not** create workspace `kb_*` sources from chatbot knowledge routes.
- Public chatbot chat may *use* both stores for grounding; it does not expose raw chunk CRUD.

## Code map

| Concern | Path |
| --- | --- |
| Workspace module | `lib/knowledge/` |
| Workspace chatbot/automation facades | `lib/knowledge/consumers.ts` |
| Bot-local extract/chunk/storage/retrieve | `lib/chatbot/knowledge/` |
| Bot-local CRUD / indexing | `lib/chatbot/repository.ts` (`*Knowledge*` helpers) |
| Merge point (prompt context) | `lib/chatbot/engine/chat.ts` → `handleVisitorMessage` |

## Quality note

Workspace retrieval is stronger (embeddings). Bot-local retrieval is lexical-only by design for small, bot-specific packs. Improving bot-local to vectors is a scale concern (see P3), not a reason to collapse the two stores.

## Out of scope (do not do here)

- Merging `kb_*` and `chatbot_knowledge_*` schemas
- Migrating bot KB onto the workspace vector store as part of P2
- Letting AI tools silently query bot-local tables without an explicit product decision
