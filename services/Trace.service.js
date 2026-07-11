import { getThreadMessages, formatThread } from "./slack.service.js";

import {
  getWorkspaceConnection,
  searchKnowledge,
  createSuggestion,
  createKnowledgeEntry,
} from "./knowledge.service.js";

import { answerQuestion, extractKnowledge, generateWithFallback } from "./gemini.service.js";

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
  console.log(extracted);

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

  const threadContext = formatThread(messages);

  // Search using the actual conversation
  const matches = await searchKnowledge(connection.id, threadContext);

  const similarity = Number(matches[0]?.similarity ?? 0);

  console.log("Knowledge matches:", matches);

  // Existing knowledge found
  if (matches.length > 0 && similarity >= 0.7) {
    const answer = await answerQuestion({
      question: threadContext,
      threadContext,
      knowledgeContext: JSON.stringify(matches, null, 2),
    });

    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs || messageTs,
      text: answer,
    });

    return;
  }

  // No knowledge found -> try extracting new knowledge
  const extracted = await extractKnowledge(threadContext);

  console.log("Extracted knowledge:", extracted);

  const suggestion = await createSuggestion({
    slack_connection_id: connection.id,
    title: extracted.title,
    summary: extracted.summary,
    knowledge_type: extracted.knowledge_type,
    confidence: extracted.confidence,
    channel_id: channelId,
    thread_ts: threadTs || messageTs,
  });

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
            value: suggestion[0].id,
          },
        ],
      },
    ],
  });
}

export async function detectThreadIntent(threadContext) {
  const prompt = `
Classify this Slack thread.

Return ONLY JSON:

{
  "intent": "question"
}

OR

{
  "intent": "knowledge_capture"
}

QUESTION:
Someone is asking for information.

KNOWLEDGE_CAPTURE:
Someone is stating a fact that should be saved.

THREAD:
${threadContext}
`;

  const result = await generateWithFallback(prompt);

  return JSON.parse(result);
}
