import { useState } from 'react';
import { MockImageEngine } from './engines';

export default function ImagesPanel() {
  const engine = new MockImageEngine();
  const [prompt, setPrompt] = useState('a scenic mountain');
  const [imgs, setImgs] = useState<string[]>([]);
  return (
    <div className="p-3 space-y-2">
      <form onSubmit={(e)=>{ e.preventDefault(); setImgs(engine.generate(prompt)); }}>
        <input className="w-full bg-neutral-800 rounded px-3 py-2 text-sm" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
      </form>
      <div className="grid grid-cols-3 gap-2">
        {imgs.map((src, i)=> (<div key={i} className="bg-neutral-800 h-32 flex items-center justify-center text-xs">{src}</div>))}
      </div>
    </div>
  );
}


