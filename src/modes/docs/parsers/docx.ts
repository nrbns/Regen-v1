import mammoth from 'mammoth';

export async function parseDocxFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return (res.value || '').trim();
}


