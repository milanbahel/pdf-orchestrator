import { useState } from 'react';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];

function fileIcon(mime) {
  if (!mime) return '📄';
  if (IMAGE_TYPES.includes(mime)) return '🖼️';
  if (VIDEO_TYPES.includes(mime)) return '🎬';
  if (AUDIO_TYPES.includes(mime)) return '🎵';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gz')) return '🗜️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📊';
  if (mime.startsWith('text/')) return '📄';
  return '📦';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function isPreviewable(mime) {
  return IMAGE_TYPES.includes(mime) || VIDEO_TYPES.includes(mime) || AUDIO_TYPES.includes(mime);
}

export default function FileCard({ file, onPreview, onDownload, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const previewable = isPreviewable(file.mime_type);

  function handleDelete(e) {
    e.stopPropagation();
    if (!confirm) return setConfirm(true);
    onDelete(file.id);
  }

  return (
    <div
      onClick={() => previewable && onPreview(file)}
      className={`card p-4 flex items-center gap-3 transition-all group ${previewable ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}
    >
      <div className="text-3xl select-none">{fileIcon(file.mime_type)}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
        <p className="text-xs text-gray-400">
          {formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}
          {previewable && <span className="ml-1 text-blue-400">· click to preview</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onDownload(file); }}
          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
        >
          ⬇
        </button>
        <button
          onClick={handleDelete}
          onMouseLeave={() => setConfirm(false)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            confirm ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
          }`}
        >
          {confirm ? 'Sure?' : '🗑'}
        </button>
      </div>
    </div>
  );
}
