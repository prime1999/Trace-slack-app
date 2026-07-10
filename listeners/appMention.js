import {
  handleTraceQuestion,
  handleTraceSave,
} from "../services/trace.service.js";

export async function appMention({ event, client }) {
  console.log("appMention event:", event);
  const command = event.text.replace(/<@[^>]+>/g, "").trim();

  const isSave = command.toLowerCase().startsWith("save");

  console.log("isSave: ", isSave);
  if (isSave) {
    console.log("handling trace save");
    const suggestion = await handleTraceSave({
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

      text: `✅ Saved: ${suggestion.title}`,
    });

    return;
  }

  console.log("handling trace question");
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
}
