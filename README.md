# Knowledge Management v2

AI-assisted knowledge base that lets teams upload documents, run them through a PyMuPDF enrichment pipeline, index chunks into Elasticsearch, and chat with the curated corpus through a React UI.

## Architecture

- **Backend (`backend/server`)** – Node.js/Express + Sequelize (Postgres) with JWT auth, conversations/messages REST APIs, file pipeline, queue-backed worker, and RAG abstractions (Elasticsearch provider by default).
- **Frontend (`frontend`)** – Vite + React + Tailwind/Shadcn UI for auth, conversation sidebar, knowledge base manager, and chat panel wired to backend APIs.
- **Microservices (`microservices/pymupdf_service`)** – FastAPI + PyMuPDF utility that converts PDFs to markdown and exposes an `/analyze/pdf` endpoint that emits lightweight metadata/entities for ingestion. A tiny Vite client (`microservices/pymupdf_service_node_client`) is included for manual testing.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 18+ | Used for backend & frontend workspaces |
| npm | 9+ | Comes with Node 18 |
| Python | 3.10+ | Required for the PyMuPDF FastAPI microservice |
| Postgres | 14+ | Primary database for Sequelize |
| Redis *(optional)* | 6+ | Needed only when `QUEUE_DRIVER=bull` |
| Elasticsearch | 2.4+ | Backing store for the RAG provider (vector scoring handled in-app) |

## Environment variables

Create `backend/server/.env` (copy from the existing sample) and fill in:

```
PORT=16001
DATABASE_URL=postgres://user:password@localhost:5432/knowledge
JWT_SECRET=super-secret
ELASTICSEARCH_NODE=http://localhost:9200
OPENAI_API_KEY=
OPENAI_BASE_URL=http://localhost:18000/v1
DEFAULT_EMBEDDING_MODEL=moka-ai/m3e-base
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./uploads
QUEUE_DRIVER=memory # or bull when Redis is available
PYMUPDF_SERVICE_URL=http://localhost:16002
RAG_COLLECTION=knowledge_documents
```

Frontend expects `frontend/.env` (see `.env.example`):

```
VITE_API_BASE_URL=http://localhost:16001/api
```

The PyMuPDF FastAPI service can reuse defaults but accepts `PORT`/`HOST` if you update `main.py` or the process command.

## Installation

```bash
# Backend
cd backend/server
npm install

# Frontend
cd ../frontend
npm install

# PyMuPDF service
cd ../../microservices/pymupdf_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Database migrations & seeders

The backend ships with Sequelize CLI tooling. Typical workflow:

```bash
cd backend/server
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all   # optional demo data
```

Use `npx sequelize-cli db:migrate:undo` (or `:all`) to roll back.

## Running the stack locally

| Service | Command |
| --- | --- |
| Backend API + worker | `npm run dev --prefix backend/server` |
| Frontend | `npm run dev --prefix frontend` (Vite on port 16000) |
| Diagnostic client (`frontend_client_test`) | `npm run dev --prefix backend/server/frontend_client_test` |
| PyMuPDF service | `source microservices/pymupdf_service/.venv/bin/activate && uvicorn main:app --reload --port 16002` |
| PyMuPDF web client (optional) | `npm run dev --prefix microservices/pymupdf_service_node_client/web_client` |

> The backend automatically registers the file-processing worker; when a file is uploaded it queues `process-file`, streams the source to the PyMuPDF service, chunks markdown into Elasticsearch, and updates file status.

## Verification & health commands

```bash
# Frontend type/lint check & production build
npm run lint --prefix frontend
npm run build --prefix frontend

# Backend smoke (starts server, ensure DB/Elasticsearch reachable)
npm run dev --prefix backend/server

# Microservice syntax check
python -m compileall microservices/pymupdf_service/main.py
```

## Microservice analyzer

- `POST /convert/pdf-to-markdown` – original markdown conversion endpoint.
- `POST /analyze/pdf` – returns `{ markdown, metadata, entities }` where entities currently include detected headings, simple keyword scores, and recorded page counts. The backend falls back to `/convert/pdf-to-markdown` if analysis fails.
- Use the included Vite client (`microservices/pymupdf_service_node_client`) to manually exercise both routes.

## Development tips

- Toggle `QUEUE_DRIVER=memory` to avoid running Redis locally.
- When adjusting extraction logic, keep `chunkText` parameters in sync with your retrieval strategy.
- The frontend toast system surfaces backend errors automatically; open the dev console for full JSON logs streaming from the Express error handler.

## Vector search & embeddings

- The ingestion worker now generates OpenAI-compatible embeddings for every chunk (and a document-average embedding) before indexing into Elasticsearch. Set `OPENAI_BASE_URL` + `DEFAULT_EMBEDDING_MODEL` to point at your embedding service (e.g. `moka-ai/m3e-base`).
- Manual document creation via the Graph-RAG tester includes an **Auto-generate embeddings** toggle; leave it on unless you plan to supply vectors yourself.
- `POST /rag/search` accepts a `searchMode` of `keyword`, `vector`, or `hybrid` plus optional `vectorWeight`, `textWeight`, and `candidateCount`. The backend re-ranks Elasticsearch hits with cosine similarity, so no native `dense_vector` field is required.
- In the primary React workspace, the chat panel now exposes a **Vector search** button that opens a quick inspection dialog (query form, mode selection, metadata filters, and inline hit previews) so you can verify retrieval quality without leaving the app.
- The diagnostic `frontend_client_test` GraphRAG panel mirrors these options, making it easy to compare keyword vs. hybrid scoring while watching the raw API payloads in `ResponseViewer`.

Happy building! Feel free to extend the worker, add new chunkers, or swap out the RAG provider by implementing another adapter in `backend/server/src/services/rag`.
