-- Bind public chatbot transcripts to a visitor session secret (hash only at rest).
ALTER TABLE "chatbot_conversation" ADD COLUMN "visitorSessionSecretHash" text;
