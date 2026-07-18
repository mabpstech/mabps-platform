import { EmbedChat } from "@/components/chatbot/embed-chat";

type PageProps = {
  params: Promise<{ publicKey: string }>;
};

export default async function EmbedChatbotPage({ params }: PageProps) {
  const { publicKey } = await params;
  return <EmbedChat publicKey={publicKey} />;
}
