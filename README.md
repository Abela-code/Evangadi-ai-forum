# Evangadi Forum

A technical Q&A forum for Evangadi learners, with semantic search and
retrieval-augmented answers over your own PDFs.

**Stack:** Express 5 · MySQL 8 · React 19 · Vite · Google Gemini

```
backEnd/       Express API  (ES modules)
frontEndNew/   React app    (Vite, CSS Modules)
```

---

## Getting set up

Each developer runs their own database and their own Gemini key. Nothing in
`.env` is shared.

### 1. Database

```sql
CREATE DATABASE evangadi_forum;
```

Run `backEnd/schema/schema.sql` against it. It creates seven tables: `users`,
`questions`, `question_vectors`, `answers`, `documents`, `document_chunks`,
`document_chunk_vectors`.

### 2. Backend

```bash
cd backEnd
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev
```

Fill in `.env` with your database credentials and a Gemini API key from
https://aistudio.google.com/apikey. Runs on `PORT` (5000 by default).

### 3. Frontend

```bash
cd frontEndNew
cp .env.example .env
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

---

## Scripts

| Where          | Command                | Does                          |
| -------------- | ---------------------- | ----------------------------- |
| `backEnd/`     | `npm run dev`          | start with nodemon            |
| `backEnd/`     | `npm start`            | start once                    |
| `backEnd/`     | `npm run format`       | Prettier                      |
| `frontEndNew/` | `npm run dev`          | Vite dev server               |
| `frontEndNew/` | `npm run build`        | production build              |
| `frontEndNew/` | `npm run lint`         | ESLint                        |
| `frontEndNew/` | `npm run format`       | Prettier                      |

---

## API

All routes are prefixed `/api`. Everything except register and login requires
`Authorization: Bearer <token>`.

### Milestone 1 — Authentication

```
POST   /api/auth/register
POST   /api/auth/login
```

### Milestone 2 — Questions and answers

```
POST   /api/questions                              create + embed
GET    /api/questions                              ?search= &mine=
GET    /api/questions/search                       semantic search
GET    /api/questions/:questionHash
GET    /api/questions/:questionHash/similar
POST   /api/questions/draft-coach                  AI writing tips
POST   /api/questions/:questionHash/answer-fit     AI relevance check
POST   /api/answers
GET    /api/answers                                ?questionId=
GET    /api/answers/:answerId
PATCH  /api/answers/:answerId
DELETE /api/answers/:answerId
```

### Milestone 3 — Knowledge base (RAG)

```
POST   /api/rag/documents                          upload PDF, chunk, embed
GET    /api/rag/documents
GET    /api/rag/documents/:documentId
GET    /api/rag/documents/:documentId/file         streams the PDF
GET    /api/rag/documents/:documentId/search       ranked chunk excerpts
POST   /api/rag/documents/:documentId/query        grounded answer + citations
DELETE /api/rag/documents/:documentId
```

Success responses carry `success`, `message` and a payload. Failures return
`{ "msg": "..." }` only — the frontend reads `error.response.data.msg`.

---

## Things worth knowing before you change code

- **Route order matters.** `/questions/search` and `/questions/draft-coach` are
  registered *before* `/questions/:questionHash`. Reverse them and the param
  route swallows both.
- **Envelope keys are not uniform.** `POST /api/questions` returns the question
  under `data`; `GET /api/questions/:hash` returns `question` and `answers` at
  the top level. Check before unwrapping.
- **The author is nested**: `author: { id, firstName, lastName }`, never flat.
  Use the helpers in `frontEndNew/src/utils/data.js`.
- **Two Gemini task types.** Stored text embeds as `RETRIEVAL_DOCUMENT`, a live
  query as `RETRIEVAL_QUERY`. Using one for both silently degrades search.
- **Every query goes through `safeExecute`** with bound parameters. The only
  interpolated SQL is a hardcoded `LIMIT` and a whitelisted `ORDER BY`.
- **CSS is modular.** Component styles live in `Name.module.css` beside the
  component; shared pieces are in `src/styles/`; `src/index.css` holds the
  design tokens and reset only.

---

## Never commit

`.env` (both folders), `node_modules/`, `backEnd/uploads/`, `frontEndNew/dist/`.
All are covered by `.gitignore` — check `git status` before your first commit.
