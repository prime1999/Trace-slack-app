import { App } from "@slack/bolt";
import { handleTrace } from "../services/Trace.service.js";

export function registerTraceHandler(app) {
  app.event("app_mention", async ({ event, client }) => {
    try {
      const command = event.text.replace(/<@[^>]+>/g, "").trim();

      const intent = command.toLowerCase().startsWith("save")
        ? "save"
        : "trace";

      const loading = await client.chat.postMessage({
        channel: event.channel,

        thread_ts: event.thread_ts || event.ts,

        text: "Trace is thinking...",
      });

      const result = await handleTrace({
        intent,

        command,

        teamId: event.team,
        channelId: event.channel,

        messageTs: event.ts,

        threadTs: event.thread_ts || null,

        userId: event.user,
      });

      if (result.type === "answer") {
        await client.chat.update({
          channel: event.channel,
          ts: loading.ts,

          text: result.answer,
        });

        return;
      }

      if (result.type === "knowledge_saved") {
        await client.chat.update({
          channel: event.channel,
          ts: loading.ts,

          text: `✅ ${result.title}\n\n` + result.summary,
        });
      }
    } catch (error) {
      console.error(error);
    }
  });
}
