function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text) return [];
  const sanitized = text.replace(/\r/g, '');
  const chunks = [];
  let start = 0;
  while (start < sanitized.length) {
    const end = Math.min(start + chunkSize, sanitized.length);
    chunks.push(sanitized.slice(start, end));
    if (end >= sanitized.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

module.exports = {
  chunkText
};
