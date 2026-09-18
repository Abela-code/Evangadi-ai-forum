import { GoogleGenerativeAI } from "@google/generative-ai";
import { ServiceUnavailableError } from "../../../utility/errors/errors.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";

const LANGUAGE_NAMES = {
  en: "English",
  am: "Amharic",
  fr: "French",
  es: "Spanish",
};

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

function parseJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const value = JSON.parse(cleaned);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export async function translateQuestionText({
  title,
  content,
  targetLanguage,
}) {
  const target = LANGUAGE_NAMES[targetLanguage];
  const prompt = `Translate this forum question into ${target}. Preserve markdown in the body, code, technical names, and meaning. Return ONLY valid JSON with this exact shape: {"translatedTitle":"...","translatedContent":"..."}.

TITLE:
${title}

BODY:
${content}`;

  try {
    const result = await textModel.generateContent(prompt);
    const parsed = parseJson(result?.response?.text?.());
    if (
      typeof parsed?.translatedTitle !== "string" ||
      typeof parsed?.translatedContent !== "string" ||
      !parsed.translatedTitle.trim() ||
      !parsed.translatedContent.trim()
    ) {
      throw new Error("Gemini returned an invalid translation");
    }

    return {
      language: targetLanguage,
      translatedTitle: parsed.translatedTitle.trim(),
      translatedContent: parsed.translatedContent.trim(),
    };
  } catch (error) {
    console.error("translateQuestionText:", error);
    throw new ServiceUnavailableError(
      "AI translation is temporarily unavailable. Please try again later.",
    );
  }
}
