# Graph-RAG tester

This Vite/React console targets `backend/server` so we can exercise every RAG/LLM/file API from one place. It bundles:

- **Auth Panel** – registers/logs-in test users and auto-populates the bearer token field.
- **File Panel** – uploads files into the ingestion pipeline (optionally linking folders/conversations) and lists/deletes processed files.
- **Graph-RAG Panel** – inspects indexes, creates/deletes them, manages documents (create/update/delete), resolves metadata, and runs search/workflow calls.
- **LLM Panel** – fires quick chat completions.
- **Workflow Panel** – triggers full RAG workflows that fetch context and issue LLM prompts.

## Running the tester

```bash
cd backend/server/frontend_client_test
npm install
npm run dev -- --port 16004
```

Point your browser to `http://localhost:16004`. Set the API base URL to the backend (default `http://localhost:16001/api`). Use the Auth panel to obtain a token so subsequent requests succeed.

## Managing Graph-RAG relations

When creating documents you can describe both the node and its relationships. The UI provides JSON textareas for `entities` and `relationships` and includes live examples. Some guidelines:

1. **Give each document a unique entity label.** Use a namespace such as `doc:hr-handbook` so that relationships can reference the node later.
2. **Describe related nodes.** Add extra entities for people, systems, or other documents referenced inside the file.
3. **Link nodes with relationships.** Each relationship needs a `source`, `target`, and `type`. Values should match the `name` fields of the entities you defined.

Example payload for a knowledge document:

```json
{
	"indexName": "knowledge_documents",
	"title": "HR Handbook",
	"content": "...",
	"entities": [
		{ "name": "doc:hr-handbook", "type": "Document", "description": "Master onboarding policies" },
		{ "name": "doc:benefits-guide", "type": "Document", "description": "Benefit deep dive" }
	],
	"relationships": [
		{
			"source": "doc:hr-handbook",
			"target": "doc:benefits-guide",
			"type": "REFERS_TO",
			"description": "Benefits chapter links to full guide"
		}
	]
}
```

After saving, the search forms can return both the documents and their derived graph, letting you visualize how nodes connect.

## Notes

- The UI calls the same `/api/rag/indexes/*` endpoints that the backend exposes. You can inspect the raw responses in the `ResponseViewer` next to each form.
- Relation-aware workflows only work once Elasticsearch has been seeded with documents that contain `entities` and `relationships` arrays.
