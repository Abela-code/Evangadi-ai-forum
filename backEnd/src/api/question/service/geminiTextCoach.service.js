import { GoogleGenerativeAI } from "@google/generative-ai";
import { ServiceUnavailableError } from "../../../utility/errors/errors.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";

const QUESTION_CATEGORIES = [
  "Technology",
  "Education",
  "Economy",
  "Politics",
  "Health",
  "Science",
  "Career",
  "Business",
  "Other",
];

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

/**
 * Strip optional markdown fence and parse JSON object from model text.
 * @param {string} raw
 * @returns {object|null}
 */
function parseJsonObjectFromGeminiText(raw) {
  if (!raw || typeof raw !== "string") return null;
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    const v = JSON.parse(t);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

async function fetchGeminiJsonTextResponse(userPrompt) {
  const result = await textModel.generateContent(userPrompt);
  const text = result?.response?.text?.();
  return typeof text === "string" ? text : "";
}

/**
 * Assign one allowed category to a question using its title and content.
 * Invalid or unavailable Gemini responses intentionally fall back to Other.
 */
const classifyQuestionCategoryService = async ({ title, content }) => {
  const userPrompt = `Classify this forum question into exactly one category.

QUESTION TITLE:
${title}

QUESTION BODY:
${content}

Reply with ONLY ONE category name from this exact list:
${QUESTION_CATEGORIES.join(", ")}
Do not add punctuation, explanation, markdown, or any other text.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const category = raw.trim().replace(/^['"]|['"]$/g, "");
    return (
      QUESTION_CATEGORIES.find(
        (allowedCategory) =>
          allowedCategory.toLowerCase() === category.toLowerCase(),
      ) || "Other"
    );
  } catch (error) {
    console.error("classifyQuestionCategoryService:", error);
    return "Other";
  }
};

/**
 * Short coaching tips for a question draft (forum / coursework context).
 * @param {{ title: string; content: string }} param
 * @returns {Promise<{ tips: string[] }>}
 */
const generateQuestionDraftCoachService = async ({ title, content }) => {
  const userPrompt = `You help learners write clearer technical forum posts.
Question TITLE:
${title}

Question BODY (markdown allowed):
${content}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"tips":["...","..."]}
Rules:
- tips: array of 3 to 5 short strings (each under 120 characters).
- Focus on: missing context (error message, expected vs actual), reproducibility, a sharper title idea if needed, tone for peers.
- Do not claim the question is "correct" or grade homework; give constructive checklist-style tips only.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    let tips = Array.isArray(parsed?.tips)
      ? parsed.tips
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => t.trim())
      : [];
    tips = tips.slice(0, 5);
    if (tips.length === 0) {
      tips = [
        "Add any error messages or exact behavior you see.",
        "Say what you already tried and what you expected instead.",
      ];
    }
    return { tips };
  } catch (error) {
    console.error("generateQuestionDraftCoachService:", error);
    throw new ServiceUnavailableError(
      "AI draft suggestions are temporarily unavailable. Please try again later.",
    );
  }
};

/**
 * Whether a draft answer seems to address the question (relevance, not correctness).
 * @param {{ questionTitle: string; questionContent: string; answerText: string }} param
 * @returns {Promise<{ level: string; note: string }>}
 */
const assessAnswerAgainstQuestionService = async ({
  questionTitle,
  questionContent,
  answerText,
}) => {
  const userPrompt = `You review whether a forum ANSWER draft addresses the QUESTION (relevance and completeness of engagement — not whether the answer is factually correct).

QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

ANSWER DRAFT:
${answerText}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"level":"strong"|"partial"|"weak","note":"one short sentence"}
Rules:
- level: "strong" if the draft clearly engages with the question; "partial" if somewhat related but missing key parts of the ask; "weak" if mostly off-topic or too vague.
- note: one sentence, plain language, no markdown, under 200 characters. Frame as fit/relevance, not grading.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    const levelRaw = parsed?.level;
    const noteRaw = parsed?.note;
    const level =
      levelRaw === "strong" || levelRaw === "partial" || levelRaw === "weak"
        ? levelRaw
        : "partial";
    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim().slice(0, 280)
        : "Could not summarize fit; treat this as a partial match.";
    return { level, note };
  } catch (error) {
    console.error("assessAnswerAgainstQuestionService:", error);
    throw new ServiceUnavailableError(
      "AI fit check is temporarily unavailable. Please try again later.",
    );
  }
};

/**
 * Answer a question using ONLY the supplied document chunks (RAG).
 * The prompt is deliberately strict: the value of retrieval is lost if the
 * model falls back on what it already knows, so it is told to say when the
 * chunks do not contain the answer.
 *
 * @param {{ query: string, chunks: {ref: number, text: string}[] }} params
 * @returns {Promise<{ answer: string }>}
 */
const answerFromRagChunksService = async ({ query, chunks }) => {
  const context = chunks
    .map((chunk) => `[${chunk.ref}] ${chunk.text}`)
    .join("\n\n");

  const userPrompt = `You answer questions using only the numbered excerpts from a user's own document.

EXCERPTS:
${context}

QUESTION:
${query}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"answer":"..."}
Rules:
- Use only facts stated in the excerpts. Never add outside knowledge.
- Cite the excerpts you used inline as [1], [2] and so on.
- If the excerpts do not answer the question, say so plainly instead of guessing.
- Keep the answer under 900 characters, plain language, no markdown headings.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    const answerRaw = parsed?.answer;

    const answer =
      typeof answerRaw === "string" && answerRaw.trim()
        ? answerRaw.trim().slice(0, 2000)
        : // The model replied but not as JSON; fall back to its raw text so the
          // user still gets something rather than an error.
          String(raw ?? "")
            .trim()
            .slice(0, 2000);

    if (!answer) throw new Error("Gemini returned an empty answer");

    return { answer };
  } catch (error) {
    console.error("answerFromRagChunksService:", error);
    throw new ServiceUnavailableError(
      "AI document answering is temporarily unavailable. Please try again later.",
    );
  }
};

export {
  QUESTION_CATEGORIES,
  classifyQuestionCategoryService,
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
  answerFromRagChunksService,
};
