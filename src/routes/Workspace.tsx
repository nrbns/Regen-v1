import { useParams } from 'react-router-dom';

export default function Workspace() {
  const { id } = useParams();
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Workspace {id}</h2>
      <p className="text-sm text-neutral-300">Tabs and modes will appear here.</p>
    </div>
  );
}


