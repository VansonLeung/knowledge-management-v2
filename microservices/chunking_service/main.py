from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Optional, Dict, Any

app = FastAPI()

class ChunkingRequest(BaseModel):
    text: str
    chunk_size: int = 1000
    chunk_overlap: int = 200
    metadata: Optional[Dict[str, Any]] = None

class Chunk(BaseModel):
    text: str
    metadata: Dict[str, Any]

class ChunkingResponse(BaseModel):
    chunks: List[Chunk]

@app.post("/chunk", response_model=ChunkingResponse)
async def chunk_text(request: ChunkingRequest):
    try:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )
        
        docs = text_splitter.create_documents([request.text], metadatas=[request.metadata] if request.metadata else None)
        
        chunks = []
        for i, doc in enumerate(docs):
            # Merge original metadata with chunk-specific metadata
            chunk_metadata = doc.metadata.copy() if doc.metadata else {}
            chunk_metadata["chunk_index"] = i
            chunks.append(Chunk(text=doc.page_content, metadata=chunk_metadata))
            
        return ChunkingResponse(chunks=chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
