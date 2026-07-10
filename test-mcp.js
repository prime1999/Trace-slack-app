import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

console.log("API Key exists:", !!process.env.GEMINI_API_KEY);

const response = await ai.models.embedContent({
  model: "gemini-embedding-2",
  contents: "hello world",
});

console.log(response.embeddings[0].values.length);
