import api from "./axios";

export async function createQuestion(payload) {
  const response = await api.post("/questions", payload);
  return response.data;
}

export async function getAllQuestions(params = {}) {
  const response = await api.get("/questions", { params });
  return response.data;
}

export async function getQuestion(questionHash) {
  const response = await api.get(`/questions/${questionHash}`);
  return response.data;
}

export async function semanticSearch(params) {
  const response = await api.get("/questions/search", { params });
  return response.data;
}

export async function getSimilarQuestions(questionHash, params = {}) {
  const response = await api.get(`/questions/${questionHash}/similar`, {
    params,
  });
  return response.data;
}

export async function runDraftCoach(payload) {
  const response = await api.post("/questions/draft-coach", payload);
  return response.data;
}

export async function checkAnswerFit(questionHash, answerText) {
  const response = await api.post(`/questions/${questionHash}/answer-fit`, {
    answerText,
  });
  return response.data;
}

export async function translateQuestion(questionHash, targetLanguage) {
  const response = await api.post(`/questions/${questionHash}/translate`, {
    targetLanguage,
  });
  return response.data;
}

const translationCache = new Map();
const translationFailures = new Set();
const translationQueue = [];
let activeTranslations = 0;
const MAX_CONCURRENT_TRANSLATIONS = 4;

function processTranslationQueue() {
  while (
    activeTranslations < MAX_CONCURRENT_TRANSLATIONS &&
    translationQueue.length
  ) {
    const request = translationQueue.shift();
    activeTranslations += 1;

    translateQuestion(request.hash, request.language)
      .then((response) => {
        const value = response?.data ?? response;
        if (
          typeof value?.translatedTitle !== "string" ||
          typeof value?.translatedContent !== "string"
        ) {
          throw new Error("Invalid question translation response");
        }
        translationCache.set(request.key, value);
        request.resolve(value);
      })
      .catch((error) => {
        translationFailures.add(request.key);
        request.reject(error);
      })
      .finally(() => {
        activeTranslations -= 1;
        processTranslationQueue();
      });
  }
}

export function getQuestionTranslation(question, targetLanguage) {
  const hash = question.question_hash || question.questionHash || question.hash;
  const title = question.title || "";
  const content = question.content || question.description || "";
  const key = JSON.stringify([hash, title, content, targetLanguage]);

  if (translationCache.has(key)) return Promise.resolve(translationCache.get(key));
  if (translationFailures.has(key)) {
    return Promise.reject(new Error("Question translation previously failed"));
  }

  return new Promise((resolve, reject) => {
    translationQueue.push({ key, hash, language: targetLanguage, resolve, reject });
    processTranslationQueue();
  });
}
