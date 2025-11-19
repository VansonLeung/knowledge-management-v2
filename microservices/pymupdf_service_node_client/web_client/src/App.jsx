import { useState } from 'react'
import axios from 'axios'

function App() {
  const [file, setFile] = useState(null)
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('http://localhost:16002/convert/pdf-to-markdown', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setMarkdown(response.data.markdown)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error converting file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PDF to Markdown Converter Test</h1>
      
      <div className="mb-4 flex gap-4">
        <input 
          type="file" 
          accept=".pdf"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
        <button 
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Converting...' : 'Convert'}
        </button>
      </div>

      {markdown && (
        <div className="border p-4 rounded bg-gray-50 whitespace-pre-wrap">
          {markdown}
        </div>
      )}
    </div>
  )
}

export default App
