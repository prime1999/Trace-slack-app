import { formatThread, getThreadMessages } from '../services/slack.service.js';
import {
  detectThreadIntent,
  handleTraceQuestion,
  handleTraceSave,
  handleTraceSuggestion,
} from '../services/Trace.service.js';

export async function appMention({ event, client }) {
  const command = event.text.replace(/<@[^>]+>/g, '').trim();

  const lower = command.toLowerCase();

  console.log('Command:', command);

  // -------------------------
  // DIRECT SAVE
  // -------------------------
  if (lower.startsWith('save')) {
    console.log('ROUTE: SAVE');

    const entry = await handleTraceSave({
      client,
      teamId: event.team,
      channelId: event.channel,
      messageTs: event.ts,
      threadTs: event.thread_ts,
      command,
    });

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: `✅ Saved knowledge: ${entry.title}`,
    });

    return;
  }

  // -------------------------
  // EMPTY MENTION
  // -------------------------
  if (!command) {
    const messages = await getThreadMessages(client, event.channel, event.ts, event.thread_ts);

    const threadContext = formatThread(messages);

    const intent = await detectThreadIntent(threadContext);

    if (intent.intent === 'question') {
      const answer = await handleTraceQuestion({
        client,
        teamId: event.team,
        channelId: event.channel,
        messageTs: event.ts,
        threadTs: event.thread_ts,
        question: threadContext,
      });

      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts || event.ts,
        text: answer,
      });

      return;
    }

    await handleTraceSuggestion({
      client,
      teamId: event.team,
      channelId: event.channel,
      messageTs: event.ts,
      threadTs: event.thread_ts,
    });

    return;
  }
  // -------------------------
  // QUESTION DETECTION
  // -------------------------
  const looksLikeQuestion =
    command.includes('?') ||
    lower.startsWith('who') ||
    lower.startsWith('what') ||
    lower.startsWith('when') ||
    lower.startsWith('where') ||
    lower.startsWith('why') ||
    lower.startsWith('how') ||
    lower.startsWith('which') ||
    lower.startsWith('can') ||
    lower.startsWith('could') ||
    lower.startsWith('should') ||
    lower.startsWith('is') ||
    lower.startsWith('are') ||
    lower.startsWith('do') ||
    lower.startsWith('does');

  if (looksLikeQuestion) {
    console.log('ROUTE: QUESTION');

    const answer = await handleTraceQuestion({
      client,
      teamId: event.team,
      channelId: event.channel,
      messageTs: event.ts,
      threadTs: event.thread_ts,
      question: command,
    });

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: answer,
    });

    return;
  }

  // -------------------------
  // KNOWLEDGE SUGGESTION
  // -------------------------
  console.log('ROUTE: SUGGESTION');

  await handleTraceSuggestion({
    client,
    triggerId: event.trigger_id,
    teamId: event.team,
    channelId: event.channel,
    messageTs: event.ts,
    threadTs: event.thread_ts,
    content: command,
  });
}
