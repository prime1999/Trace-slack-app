import { getThreadMessages, formatThread } from "./slack.service.js";

import {
  getWorkspaceConnection,
  searchKnowledge,
  createSuggestion,
  createKnowledgeEntry,
} from "./knowledge.service.js";

import { answerQuestion, extractKnowledge } from "./gemini.service.js";

export async function handleTraceQuestion({
  client,
  teamId,
  channelId,
  messageTs,
  threadTs,
  question,
}) {
  const connection = await getWorkspaceConnection(teamId);
  console.log("Workspace connection:", connection);

  const messages = await getThreadMessages(
    client,
    channelId,
    messageTs,
    threadTs,
  );

  const threadContext = formatThread(messages);

  const knowledge = await searchKnowledge(connection.id, question);

  const knowledgeContext = JSON.stringify(knowledge, null, 2);

  const answer = await answerQuestion({
    question,
    threadContext,
    knowledgeContext,
  });

  return answer;
}

export async function handleTraceSave({
  client,
  teamId,
  channelId,
  messageTs,
  threadTs,
  command,
}) {
  const connection = await getWorkspaceConnection(teamId);

  let content = command.replace(/^save/i, "").trim();

  if (!content) {
    const messages = await getThreadMessages(
      client,
      channelId,
      messageTs,
      threadTs,
    );

    content = formatThread(messages);
  }

  const extracted = await extractKnowledge(content);

  const entry = await createKnowledgeEntry({
    slack_connection_id: connection.id,
    title: extracted.title,
    summary: extracted.summary,
    knowledge_type: extracted.knowledge_type,
    confidence: extracted.confidence,
    channel_id: channelId,
    thread_ts: threadTs || messageTs,
  });

  return entry;
}

export async function handleTraceSuggestion({
  client,
  triggerId,
  teamId,
  channelId,
  messageTs,
  threadTs,
}) {
  const connection = await getWorkspaceConnection(teamId);

  const messages = await getThreadMessages(
    client,
    channelId,
    messageTs,
    threadTs,
  );
  console.log({ connection, messages, teamId });
  const threadContext = formatThread(messages);

  const extracted = await extractKnowledge(threadContext);

  const suggestion = await createSuggestion({
    slack_connection_id: connection.id,
    title: extracted.title,
    summary: extracted.summary,
    knowledge_type: extracted.knowledge_type,
    confidence: extracted.confidence,
    channel_id: channelId,
    thread_ts: threadTs || messageTs,
  });

  console.log("Suggestion created:", suggestion);

  await client.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs || messageTs,

    text: "Trace found reusable knowledge",

    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Trace found reusable knowledge*\n\n*${suggestion[0].title}*\n${suggestion[0].summary}`,
        },
      },

      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Approve",
            },

            style: "primary",

            action_id: "approve_knowledge",

            value: suggestion[0].id,
          },

          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Reject",
            },

            style: "danger",

            action_id: "reject_knowledge",

            value: suggestion.id,
          },
        ],
      },
    ],
  });
}
