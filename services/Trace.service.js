import { getThreadMessages, formatThread } from "./slack.service.js";

import {
  getWorkspaceConnection,
  searchKnowledge,
  createSuggestion,
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
}) {
  const connection = await getWorkspaceConnection(teamId);

  const messages = await getThreadMessages(
    client,
    channelId,
    messageTs,
    threadTs,
  );

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

  return suggestion;
}
