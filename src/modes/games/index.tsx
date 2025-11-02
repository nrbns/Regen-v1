import catalog from './catalog.json';

export default function GamesPanel() {
  return (
    <div className="p-3 space-y-2">
      <h3 className="font-medium">Games</h3>
      <ul className="space-y-1 text-sm">
        {catalog.map((g) => (
          <li key={g.url}>
            <a className="text-indigo-400" href={g.url} onClick={(e)=>{ e.preventDefault(); window.api?.tabs?.create?.(g.url); }}>{g.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}


