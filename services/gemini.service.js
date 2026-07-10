import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash",
  "gemini-3.1-flash-lite",
];

const RETRY_DELAYS = [1000, 3000, 5000];

async function generateWithFallback(prompt) {
  let lastError;

  for (const model of MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        console.log(`Success with ${model}`);

        return response.text;
      } catch (error) {
        lastError = error;

        const status =
          error?.status || error?.error?.code || error?.cause?.status;

        console.error(
          `[${model}] Attempt ${attempt + 1} failed`,
          status,
          error?.message || error,
        );

        const retryableStatuses = [429, 500, 502, 503, 504];

        if (!retryableStatuses.includes(status)) {
          console.error(`${model} failed with non-retryable error`);
          break;
        }

        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];

          console.log(`Retrying ${model} in ${delay}ms...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.log(`${model} exhausted. Falling back to next model...`);
  }

  throw lastError;
}

/* -------------------------------- */
/* Embeddings */
/* -------------------------------- */

export async function createEmbedding(text) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: text,
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) {
      throw new Error("No embedding returned from Gemini");
    }

    return embedding;
  } catch (error) {
    console.error("createEmbedding failed:", error);
    throw error;
  }
}

/* -------------------------------- */
/* Q&A */
/* -------------------------------- */

export async function answerQuestion({
  question,
  threadContext,
  knowledgeContext,
}) {
  const prompt = `
You are Trace.

Answer the user's question using the provided context.

THREAD:
${threadContext}

KNOWLEDGE:
${knowledgeContext}

QUESTION:
${question}
`;

  try {
    return await generateWithFallback(prompt);
  } catch (error) {
    console.error("answerQuestion failed after all model fallbacks:", error);

    return "I'm having trouble reaching the AI service right now. Please try again in a moment.";
  }
}

/* -------------------------------- */
/* Knowledge Extraction */
/* -------------------------------- */

export async function extractKnowledge(content) {
  const prompt = `
You are extracting organizational knowledge from Slack.

Convert the content into a reusable knowledge record.

Return ONLY valid JSON.

{
  "title": "",
  "summary": "",
  "knowledge_type": "",
  "confidence": 0
}

Examples:

Input:
"Our CEO is Prime"

Output:
{
  "title": "CEO",
  "summary": "The CEO is Prime.",
  "knowledge_type": "company_information",
  "confidence": 0.98
}

Input:
"Refunds require manager approval"

Output:
{
  "title": "Refund Policy",
  "summary": "Refunds require manager approval.",
  "knowledge_type": "policy",
  "confidence": 0.95
}

CONTENT:
${content}
`;

  try {
    const text = await generateWithFallback(prompt);

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("extractKnowledge failed:", error);

    return {
      title: "Extraction Failed",
      summary: content,
      knowledge_type: "unknown",
      confidence: 0,
    };
  }
}
