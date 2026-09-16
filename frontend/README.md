# Evangadi Forum - Final React Frontend

This frontend is wired to the current backend routes.

## Requirements

- Node.js
- Backend running at `http://localhost:5000`

## Install

```bash
npm install
```

## Environment

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Run

```bash
npm run dev
```

Frontend:
`http://localhost:5173`

Backend:
`http://localhost:5000`

## Backend endpoints used

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Questions

- `POST /api/question/createQuestion`
- `GET /api/question/getAllQuestions`
- `GET /api/question/:questionHash`
- `GET /api/question/semanticSearch`
- `GET /api/question/:questionHash/similar`
- `POST /api/question/draft-coach`
- `POST /api/question/:questionHash/answer-fit`

### Answers

- `POST /api/answer/postAnswer`
- `GET /api/answer/getAnswer`
- `GET /api/answer/getSingleAnswer/:answerId`
- `PATCH /api/answer/updateSingleAnswer/:answerId`
- `DELETE /api/answer/deleteAnswer/:answerId`

## Important backend limitations

### Auth refresh

The backend currently has no `/api/auth/me` endpoint.
The frontend therefore restores the saved user from `localStorage` and checks JWT expiration client-side.
For stronger production auth, add `/api/auth/me`.

### Map

The architecture includes a Map page, but the backend does not expose location data yet.
The page is included as a safe placeholder instead of making fake API requests.

### RAG / Knowledge Base

The database has document/vector tables, but the current backend does not expose document/RAG routes.
The Knowledge Base page is included as a placeholder for that next backend phase.

## Main structure

```text
src/
├── api/
│   ├── axios.js
│   ├── auth.api.js
│   ├── question.api.js
│   └── answer.api.js
├── components/
│   ├── answers/
│   ├── common/
│   ├── layout/
│   └── questions/
├── context/
│   └── AuthContext.jsx
├── layouts/
│   └── Layout.jsx
├── pages/
│   ├── Landing.jsx
│   ├── Auth.jsx
│   ├── Dashboard.jsx
│   ├── Questions.jsx
│   ├── PostQuestion.jsx
│   ├── MyQuestions.jsx
│   ├── QuestionDetail.jsx
│   ├── SearchPage.jsx
│   ├── MapPage.jsx
│   ├── KnowledgeBase.jsx
│   └── NotFound.jsx
├── routes/
│   └── ProtectedRoute.jsx
├── utils/
│   └── data.js
├── App.jsx
├── main.jsx
└── styles.css
```

## Final UI/video refinements

This revision was matched against the supplied UI screenshots and the four walkthrough video parts.

### Rich question/answer editor

The editor toolbar is functional, not decorative. Select text and use:

- Bold
- Italic
- Inline or fenced code
- Link
- Bulleted list
- Numbered list
- Quote
- Preview

Formatting is stored as Markdown in the existing backend `content` string, so no database schema change is required. Question and answer detail views render that Markdown safely as React elements.

### Footer

The protected application shell now includes the Evangadi Forum footer shown in the dashboard reference, including About / Privacy / Terms / Contact links.

### PDF library

The current backend does not expose document upload/RAG routes. The frontend now still provides a fully usable local interaction:

- choose PDF
- PDF validation
- upload/add to current browser session
- library list
- select document
- remove document
- filter document list
- built-in PDF preview
- open PDF full size

Persistent document storage, embeddings, semantic document search, and grounded AI answers require backend document/RAG endpoints and are intentionally not faked.
