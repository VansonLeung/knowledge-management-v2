# Plan: Scale to Chunk-Level Indexing for 10k+ Documents

This plan outlines the steps to refactor the Knowledge Management System to support accurate chunk-level retrieval, catering to a scale of ~10,000 documents (~100k+ pages).

## Core Architectural Changes
1.  **New Microservice**: `chunking_service` (Python) to handle text splitting logic, ensuring separation of concerns.
2.  **Index Strategy**: Move from "One Document per PDF" to "One Document per Chunk" in Elasticsearch.
3.  **Ingestion Flow**: PDF -> Text Extraction -> **Chunking** -> Embeddings -> **Batch Indexing**.

---

## Phase 1: Infrastructure & Schema Design

- [ ] **1.1 Define Elasticsearch Mapping for Chunks**
    - Create a new index template or update existing logic.
    - Schema fields:
        - `id`: Unique Chunk ID (e.g., `{doc_uuid}_{chunk_index}`)
        - `parent_doc_id`: Reference to the original file.
        - `chunk_index`: Integer for ordering.
        - `content`: The actual text chunk.
        - `vector`: Dense vector (embedding).
        - `metadata`: JSON object (page number, source filename, author, etc.).
    - *Goal*: Ensure efficient retrieval of specific text blocks.

- [ ] **1.2 Design Chunking Service API**
    - Input: `{"text": string, "strategy": string, "params": object}`
    - Output: `{"chunks": [{"text": string, "metadata": object}]}`

---

## Phase 2: Implement Chunking Microservice

- [ ] **2.1 Scaffold Service**
    - Location: `microservices/chunking_service/`
    - Stack: Python (FastAPI).
- [ ] **2.2 Implement Chunking Logic**
    - Integrate a library like LangChain (`RecursiveCharacterTextSplitter`) or LlamaIndex.
    - Implement strategies: Fixed-size, Paragraph-based, or Semantic splitting.
    - Ensure overlap handling (e.g., 10-20% overlap) to preserve context at boundaries.
- [ ] **2.3 Dockerize & Run**
    - Create `Dockerfile`.
    - Add to project startup scripts.

---

## Phase 3: Backend Ingestion Refactoring (Node.js)

- [ ] **3.1 Update RAG Service / Ingestion Workflow**
    - Modify `backend/server/services/rag/` (or equivalent).
    - Current flow: `Extract -> Embed -> Index Doc`.
    - New flow:
        1.  **Extract**: Call `pymupdf_service` (Existing).
        2.  **Chunk**: Call `chunking_service` (New).
        3.  **Embed**: Loop through chunks and call Embedding API (Existing Local Model).
        4.  **Index**: Use Elasticsearch `_bulk` API to index all chunks.
- [ ] **3.2 Optimize Embedding Calls**
    - Implement batching for embedding requests if the local model API supports it, to reduce network overhead.
- [ ] **3.3 Update Document Management**
    - When deleting a "File", ensure all associated "Chunks" (by `parent_doc_id`) are deleted from Elasticsearch.

---

## Phase 4: Search Logic Updates

- [ ] **4.1 Refactor Search Controller**
    - Update `backend/server/controllers/rag.controller.js`.
    - Change query target to the Chunk index.
- [ ] **4.2 Implement Hybrid Search for Chunks**
    - Combine Keyword search (BM25 on `content`) + Vector search (KNN on `vector`).
- [ ] **4.3 Response Formatting**
    - Return hits as specific chunks.
    - Include `score`, `chunk_content`, `page_number`, and `parent_doc_id`.

---

## Phase 5: Frontend Enhancements

- [ ] **5.1 Update GraphRagPanel**
    - Adapt "Search" tab to display Chunk results instead of whole documents.
    - Show "Page X" and "Source File" for each hit.
- [ ] **5.2 Context View (Optional)**
    - Add a feature to "View Surrounding Chunks" (fetch `chunk_index - 1` and `chunk_index + 1`) to see context without loading the full PDF.
- [ ] **5.3 Update Main Frontend Application (`frontend/`)**
    - Update `api/rag.js` to consume the new chunk-based search API.
    - Update Search UI (`components/search/`) to display chunk hits with page numbers.
    - Update Chat/RAG UI (`components/chat/`) to handle chunk citations.

## Phase 6: Migration & Performance

- [ ] **6.1 Re-indexing Script**
    - Create a script to iterate over existing stored files and re-run the ingestion pipeline.
- [ ] **6.2 Performance Tuning**
    - Test ingestion speed with 100 files.
    - Tune Elasticsearch `refresh_interval` and bulk batch sizes.
