import { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_PYMUPDF_BASE_URL || 'http://localhost:16002'

function App() {
  const [file, setFile] = useState(null)
  const [markdown, setMarkdown] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = event => {
    setFile(event.target.files?.[0] || null)
    setMarkdown('')
    setAnalysis(null)
    setError('')
  }

  const upload = async endpoint => {
    if (!file) return
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_BASE}/${endpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (endpoint === 'analyze/pdf') {
        setAnalysis(response.data)
        setMarkdown(response.data.markdown)
      } else {
        setMarkdown(response.data.markdown)
        setAnalysis(null)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err.response?.data?.detail || 'Unable to process file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">PyMuPDF Service Client</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <input type="file" accept=".pdf" onChange={handleFileChange} className="rounded border p-2" />
        <div className="flex gap-2">
          <button
            onClick={() => upload('convert/pdf-to-markdown')}
            disabled={!file || loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Working…' : 'Convert'}
          </button>
          <button
            onClick={() => upload('analyze/pdf')}
            disabled={!file || loading}
            className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Working…' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {analysis && (
        <div className="mb-6 grid gap-4 rounded border bg-white p-4 shadow">
          <div>
            <h2 className="text-lg font-semibold">Document metadata</h2>
            <pre className="mt-2 rounded bg-gray-100 p-3 text-xs">{JSON.stringify(analysis.metadata, null, 2)}</pre>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Extracted entities</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {analysis.entities?.map((entity, index) => (
                <li key={`${entity.type}-${index}`}>
                  <span className="font-medium">[{entity.type}]</span> {entity.value}
                  {entity.score ? <span className="text-muted-foreground"> ({entity.score})</span> : null}
                </li>
              ))}
            </ul>
          </div>
          {analysis.pages?.length ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Per-page output</h2>
                <span className="text-xs text-muted-foreground">{analysis.pages.length} pages detected</span>
              </div>
              <div className="mt-2 divide-y rounded border">
                {analysis.pages.map(page => (
                  <details key={page.page} className="group" open={analysis.pages.length <= 3}>
                    <summary className="cursor-pointer select-none bg-gray-50 px-3 py-2 text-sm font-medium">
                      Page {page.page}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {page.markdown ? 'Markdown available' : 'Markdown unavailable'}
                      </span>
                    </summary>
                    <div className="space-y-3 bg-white px-3 py-3 text-sm">
                      {page.markdown && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Markdown</p>
                          <div className="mt-1 rounded bg-gray-100 p-2 text-xs whitespace-pre-wrap">{page.markdown}</div>
                        </div>
                      )}
                      {page.text && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Plain text</p>
                          <div className="mt-1 rounded bg-gray-50 p-2 text-xs whitespace-pre-wrap">{page.text}</div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {markdown && (
        <div className="rounded border bg-gray-50 p-4 text-sm shadow">
          <h2 className="mb-2 font-semibold">Markdown output</h2>
          <div className="whitespace-pre-wrap">{markdown}</div>
        </div>
      )}
    </div>
  )
}

export default App
