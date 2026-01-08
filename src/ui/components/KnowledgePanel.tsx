import React from 'react';

export function KnowledgePanel(): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <label htmlFor="knowledge-search" className="sr-only">
            Search knowledge
          </label>
          <div className="flex items-center gap-2">
            <input
              id="knowledge-search"
              className="focus-ring flex-1 rounded bg-white/5 px-3 py-2 text-white outline-none"
              placeholder="Search curated knowledge..."
            />
            <button className="rounded bg-[var(--color-primary-400)] px-3 py-2 text-black">
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <section aria-label="Quick actions" className="bg-white/3 rounded p-4">
            <h3 className="mb-2 font-semibold">Quick Actions</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <button className="underline">Open Reference Library</button>
              </li>
              <li>
                <button className="underline">Saved Notes</button>
              </li>
              <li>
                <button className="underline">Citation Manager</button>
              </li>
            </ul>
          </section>

          <section aria-label="Highlights" className="bg-white/3 rounded p-4">
            <h3 className="mb-2 font-semibold">Highlights</h3>
            <p className="text-sm text-white/80">
              Curated topics, FAQs, and recent updates from your knowledge base.
            </p>
          </section>
        </div>

        <div className="mt-6">
          <h4 className="mb-2 text-sm text-white/80">Recent</h4>
          <div className="space-y-3">
            <div className="bg-white/2 rounded p-3">
              Getting started with Research Mode —{' '}
              <span className="text-xs text-white/70">Today</span>
            </div>
            <div className="bg-white/2 rounded p-3">
              Citation best practices — <span className="text-xs text-white/70">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KnowledgePanel;
