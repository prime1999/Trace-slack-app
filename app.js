import { App } from "@slack/bolt";
import { config } from "dotenv";

import { appMention } from "./listeners/appMention.js";
import {
  createKnowledgeEntry,
  deleteSuggestion,
  getSuggestion,
} from "./services/knowledge.service.js";
import { createEmbedding } from "./services/gemini.service.js";

config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event("app_mention", async (args) => {
  await appMention(args);
});

app.action("approve_knowledge", async ({ ack, body, action }) => {
  await ack();

  const suggestionId = action.value;

  console.log("suggestionId:", suggestionId);

  const suggestion = await getSuggestion(suggestionId);

  console.log("suggestion:", suggestion);

  const embedding = await createEmbedding(suggestion.summary);

  await createKnowledgeEntry({
    slack_connection_id: suggestion.slack_connection_id,
    title: suggestion.title,
    summary: suggestion.summary,
    knowledge_type: suggestion.knowledge_type,
    //confidence: suggestion.confidence,
    channel_id: suggestion.channel_id,
    thread_ts: suggestion.thread_ts,
    embeding,
  });

  await deleteSuggestion(suggestionId);
});

app.action("reject_knowledge", async ({ ack, action }) => {
  await ack();

  await deleteSuggestion(action.value);
});

await app.start();

console.log("⚡ Trace running");
