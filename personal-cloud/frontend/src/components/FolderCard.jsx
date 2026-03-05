import { useState } from 'react';

export default function FolderCard({ folder, onClick, onDelete }) {
  const [confirm, setConfirm] = useState(false);

  function handleDelete(e) {
    e.stopPropagation();
    if (!confirm) return setConfirm(true);
    onDelete(folder.id);
  }

  return (
    <div
      onClick={onClick}
      className="card p-4 flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="text-3xl select-none">📁</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{folder.name}</p>
        <p className="text-xs text-gray-400">{new Date(folder.created_at).toLocaleDateString()}</p>
      </div>
      <button
        onClick={handleDelete}
        onMouseLeave={() => setConfirm(false)}
        className={`opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded transition-all ${
          confirm ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
        }`}
      >
        {confirm ? 'Sure?' : '🗑'}
      </button>
    </div>
  );
}
