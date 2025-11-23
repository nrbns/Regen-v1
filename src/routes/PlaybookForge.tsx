import { useEffect, useState } from 'react';

type Playbook = { id: string; title: string; yaml: string; createdAt: number };

const KEY = 'omnib_playbooks_v1';

function load(): Playbook[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function save(items: Playbook[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export default function PlaybookForge() {
  const [items, setItems] = useState<Playbook[]>(load());
  const [title, setTitle] = useState('New Playbook');
  const [yaml, setYaml] = useState('');

  useEffect(() => {
    setItems(load());
  }, []);

  const addFromRecorder = async () => {
    try {
      const dsl = await (window as any).recorder?.getDsl?.();
      const y = typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2);
      setYaml(y);
    } catch (error) {
      console.error('[PlaybookForge] Failed to get DSL from recorder:', error);
      // Silently fail - user can manually enter YAML
    }
  };

  const saveItem = () => {
    try {
      const next = [{ id: cryptoRandom(), title, yaml, createdAt: Date.now() }, ...items];
      setItems(next);
      save(next);
    } catch (error) {
      console.error('[PlaybookForge] Failed to save item:', error);
      // Could show toast notification here
    }
  };

  const runItem = async (pb: Playbook) => {
    try {
      const parsed = JSON.parse(pb.yaml);
      await (window as any).agent?.start?.(parsed);
    } catch (error) {
      console.error('[PlaybookForge] Failed to run playbook:', error);
      // Use toast instead of alert for better UX
      if (error instanceof SyntaxError) {
        // Could import toast here: toast.error('Invalid JSON/YAML format');
        alert('Invalid JSON/YAML format');
      } else {
        alert(`Failed to run playbook: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  return (
    <div className="p-4 grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Create Playbook</h3>
        <input
          className="bg-neutral-800 rounded px-2 py-1"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="flex-1 bg-neutral-800 rounded p-2 text-xs"
          value={yaml}
          onChange={e => setYaml(e.target.value)}
          placeholder="Paste DSL (JSON/YAML) here"
        />
        <div className="flex gap-2">
          <button className="bg-neutral-800 px-2 py-1 rounded" onClick={addFromRecorder}>
            Load from Recorder
          </button>
          <button className="bg-indigo-600 text-white px-2 py-1 rounded" onClick={saveItem}>
            Save
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Library</h3>
        <div className="space-y-2 overflow-auto">
          {items.map(pb => (
            <div key={pb.id} className="border border-neutral-800 rounded p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">{pb.title}</div>
                <div className="text-xs text-neutral-400">
                  {new Date(pb.createdAt).toLocaleString()}
                </div>
              </div>
              <pre className="text-xs bg-neutral-900 rounded p-2 overflow-auto max-h-40">
                {pb.yaml}
              </pre>
              <div className="flex gap-2">
                <button
                  className="bg-indigo-600 text-white px-2 py-1 rounded"
                  onClick={() => runItem(pb)}
                >
                  Run
                </button>
                <button
                  className="bg-neutral-800 px-2 py-1 rounded"
                  onClick={() => {
                    const next = items.filter(x => x.id !== pb.id);
                    setItems(next);
                    save(next);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2);
}
