import { App } from "@slack/bolt";
import { config } from "dotenv";

import { appMention } from "./listeners/appMention.js";

config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event("app_mention", async (args) => {
  await appMention(args);
});

await app.start();

console.log("⚡ Trace running");
