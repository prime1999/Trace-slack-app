export async function getThreadMessages(
  client,
  channelId,
  messageTs,
  threadTs,
) {
  const ts = threadTs || messageTs;

  const response = await client.conversations.replies({
    channel: channelId,
    ts,
  });

  return response.messages ?? [];
}

export function formatThread(messages) {
  return messages
    .map((message) => {
      const role = message.bot_id ? "Assistant" : "User";

      return `${role}: ${message.text || ""}`;
    })
    .join("\n");
}
