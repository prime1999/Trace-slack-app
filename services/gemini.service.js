import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function answerQuestion({
  question,
  threadContext,
  knowledgeContext,
}) {
  const prompt = `
You are Trace.

Answer the user's question using:

THREAD:
${threadContext}

KNOWLEDGE:
${knowledgeContext}

QUESTION:
${question}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
}

export async function extractKnowledge(threadContext) {
  const prompt = `
Extract reusable knowledge.

Return ONLY valid JSON.

{
  "title": "",
  "summary": "",
  "knowledge_type": "",
  "confidence": 0
}

THREAD:
${threadContext}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return JSON.parse(response.text);
}
