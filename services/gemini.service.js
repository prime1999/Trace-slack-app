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

export async function generateWithFallback(prompt) {
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

const EMBEDDING_RETRY_DELAYS = [1000, 3000, 5000];

export async function createEmbedding(text) {
  let lastError;

  for (let attempt = 0; attempt <= EMBEDDING_RETRY_DELAYS.length; attempt++) {
    try {
      console.log(`Creating embedding (attempt ${attempt + 1})`);

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
      lastError = error;

      console.error(
        `Embedding attempt ${attempt + 1} failed`,
        error?.message || error,
      );

      if (attempt < EMBEDDING_RETRY_DELAYS.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, EMBEDDING_RETRY_DELAYS[attempt]),
        );
      }
    }
  }

  throw lastError;
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
You are Trace, an AI knowledge curator for Slack.

Your job is to determine whether a conversation contains reusable organizational knowledge.

IMPORTANT RULES:

- Only extract EXPLICIT facts.
- Never guess missing information.
- Never infer facts from questions.
- Never infer facts from uncertainty.
- Never infer facts from mentions, bot names, user IDs, or Slack usernames.
- Never create knowledge from incomplete discussions.
- Never create knowledge from assumptions or speculation.

Examples of things that SHOULD NOT be saved:

- "Who is our CEO?"
- "I think it might be John."
- "Maybe we use Supabase."
- "I forgot his name."
- "@trace"
- "hello"

If no clear factual knowledge exists, return:

{
  "should_save": false,
  "reason": "No factual knowledge found"
}

If factual knowledge exists, return:

{
  "should_save": true,
  "title": "",
  "summary": "",
  "knowledge_type": "",
  "confidence": 0
}

Knowledge types:
- company_information
- policy
- process
- technical_decision
- architecture
- product_information
- team_information
- other

Examples:

Input:
"Our CEO is Priime"

Output:
{
  "should_save": true,
  "title": "CEO",
  "summary": "The CEO is Priime.",
  "knowledge_type": "company_information",
  "confidence": 0.98
}

Input:
"We use Supabase Auth."

Output:
{
  "should_save": true,
  "title": "Authentication",
  "summary": "The application uses Supabase Auth for authentication.",
  "knowledge_type": "technical_decision",
  "confidence": 0.97
}

Input:
"Who is our boss? John? Nope I forgot his name."

Output:
{
  "should_save": false,
  "reason": "No factual knowledge found"
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
      should_save: false,
      reason: "Extraction failed",
    };
  }
}
