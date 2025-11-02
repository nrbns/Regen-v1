import { useState } from 'react';
import { analyzeText } from './analyzer';
import { parsePdfFile } from './parsers/pdf';
import { parseDocxFile } from './parsers/docx';

export default function DocsPanel() {
  const [text, setText] = useState('');
  const report = analyzeText(text);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <input type="file" accept=".pdf,.docx" onChange={async (e)=>{
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.name.toLowerCase().endsWith('.pdf')) setText(await parsePdfFile(f));
          else if (f.name.toLowerCase().endsWith('.docx')) setText(await parseDocxFile(f));
        }} />
      </div>
      <textarea className="w-full h-40 bg-neutral-800 rounded p-2 text-sm" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Paste text here (PDF/DOCX parsing to be added)" />
      <div className="text-sm whitespace-pre-wrap">{report.report}
      </div>
    </div>
  );
}


