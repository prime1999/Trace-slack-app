import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

console.log("API Key exists:", !!process.env.GEMINI_API_KEY);

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "hello",
});

console.log(response.text);
