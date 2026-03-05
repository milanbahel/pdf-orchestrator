export default function Breadcrumb({ folders, currentFolder, onNavigate }) {
  // Build path from root to current folder
  const path = [];
  let current = currentFolder;
  while (current) {
    path.unshift(current);
    current = folders.find(f => f.id === current.parent_id) || null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className={`hover:text-blue-600 transition-colors ${!currentFolder ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
      >
        ☁️ My Cloud
      </button>
      {path.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1">
          <span className="text-gray-400">/</span>
          <button
            onClick={() => onNavigate(folder)}
            className={`hover:text-blue-600 transition-colors ${i === path.length - 1 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
