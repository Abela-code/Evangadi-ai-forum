import api from "./axios";

export async function getMyBookmarks() {
  const response = await api.get("/bookmarks");
  return response.data;
}

export async function getBookmarkStatus(questionId) {
  const response = await api.get(`/bookmarks/${questionId}`);
  return response.data;
}

export async function bookmarkQuestion(questionId) {
  const response = await api.post(`/bookmarks/${questionId}`);
  return response.data;
}

export async function unbookmarkQuestion(questionId) {
  const response = await api.delete(`/bookmarks/${questionId}`);
  return response.data;
}
