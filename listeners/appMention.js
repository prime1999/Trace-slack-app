import {
  handleTraceQuestion,
  handleTraceSave,
  handleTraceSuggestion,
} from "../services/trace.service.js";

export async function appMention({ event, client }) {
  const command = event.text.replace(/<@[^>]+>/g, "").trim();

  const lower = command.toLowerCase();

  console.log("Command:", command);

  // -------------------------
  // DIRECT SAVE
  // -------------------------
  if (lower.startsWith("save")) {
    console.log("ROUTE: SAVE");

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
    console.log("ROUTE: SUGGESTION (empty mention)");

    await handleTraceSuggestion({
      client,
      triggerId: event.trigger_id,
      teamId: event.team,
      channelId: event.channel,
      messageTs: event.ts,
      threadTs: event.thread_ts,
      content: "",
    });

    return;
  }

  // -------------------------
  // QUESTION DETECTION
  // -------------------------
  const looksLikeQuestion =
    command.includes("?") ||
    lower.startsWith("who") ||
    lower.startsWith("what") ||
    lower.startsWith("when") ||
    lower.startsWith("where") ||
    lower.startsWith("why") ||
    lower.startsWith("how") ||
    lower.startsWith("which") ||
    lower.startsWith("can") ||
    lower.startsWith("could") ||
    lower.startsWith("should") ||
    lower.startsWith("is") ||
    lower.startsWith("are") ||
    lower.startsWith("do") ||
    lower.startsWith("does");

  if (looksLikeQuestion) {
    console.log("ROUTE: QUESTION");

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
  console.log("ROUTE: SUGGESTION");

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
