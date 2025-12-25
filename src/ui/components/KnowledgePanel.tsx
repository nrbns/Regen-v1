import React from 'react';

export function KnowledgePanel(): JSX.Element {
  return (
    <div className="h-full w-full flex flex-col p-6">
      <div className="max-w-3xl w-full mx-auto">
        <div className="mb-6">
          <label htmlFor="knowledge-search" className="sr-only">Search knowledge</label>
          <div className="flex items-center gap-2">
            <input id="knowledge-search" className="flex-1 px-3 py-2 rounded bg-white/5 text-white outline-none focus-ring" placeholder="Search curated knowledge..." />
            <button className="px-3 py-2 rounded bg-[var(--color-primary-400)] text-black">Search</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <section aria-label="Quick actions" className="p-4 rounded bg-white/3">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <ul className="text-sm text-white/80 space-y-2">
              <li><button className="underline">Open Reference Library</button></li>
              <li><button className="underline">Saved Notes</button></li>
              <li><button className="underline">Citation Manager</button></li>
            </ul>
          </section>

          <section aria-label="Highlights" className="p-4 rounded bg-white/3">
            <h3 className="font-semibold mb-2">Highlights</h3>
            <p className="text-sm text-white/80">Curated topics, FAQs, and recent updates from your knowledge base.</p>
          </section>
        </div>

        <div className="mt-6">
          <h4 className="text-sm text-white/80 mb-2">Recent</h4>
          <div className="space-y-3">
            <div className="p-3 rounded bg-white/2">Getting started with Research Mode — <span className="text-xs text-white/70">Today</span></div>
            <div className="p-3 rounded bg-white/2">Citation best practices — <span className="text-xs text-white/70">Yesterday</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KnowledgePanel;
