import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export async function parsePdfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const s = content.items.map((it: any)=> it.str).join(' ');
    out += s + '\n';
  }
  return out.trim();
}


