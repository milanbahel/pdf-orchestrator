import { useEffect } from 'react';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];

export default function PreviewModal({ file, token, onClose, onDownload }) {
  const url = `/api/files/${file.id}/preview`;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // For preview we need the token in the URL since <img>/<video> can't set headers
  // We use a blob URL approach
  const [blobUrl, setBlobUrl] = [null, () => {}];

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="w-full max-w-4xl flex items-center justify-between mb-3 text-white"
        onClick={e => e.stopPropagation()}
      >
        <span className="font-medium truncate">{file.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button onClick={onDownload} className="btn-secondary text-xs">⬇ Download</button>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-xl leading-none px-2">✕</button>
        </div>
      </div>

      {/* Content */}
      <div
        className="max-w-4xl w-full max-h-[80vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {IMAGE_TYPES.includes(file.mime_type) && (
          <AuthImage fileId={file.id} name={file.name} />
        )}
        {VIDEO_TYPES.includes(file.mime_type) && (
          <AuthVideo fileId={file.id} mimeType={file.mime_type} />
        )}
        {AUDIO_TYPES.includes(file.mime_type) && (
          <AuthAudio fileId={file.id} mimeType={file.mime_type} name={file.name} />
        )}
      </div>
    </div>
  );
}

// Components that fetch the file with auth and create a blob URL
import { useState, useEffect as ue } from 'react';
import api from '../api';

function useBlob(fileId) {
  const [src, setSrc] = useState(null);
  ue(() => {
    api.get(`/files/${fileId}/preview`, { responseType: 'blob' })
      .then(r => setSrc(URL.createObjectURL(r.data)))
      .catch(() => {});
    return () => src && URL.revokeObjectURL(src);
  }, [fileId]);
  return src;
}

function AuthImage({ fileId, name }) {
  const src = useBlob(fileId);
  if (!src) return <div className="text-white text-sm">Loading…</div>;
  return <img src={src} alt={name} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />;
}

function AuthVideo({ fileId, mimeType }) {
  const src = useBlob(fileId);
  if (!src) return <div className="text-white text-sm">Loading…</div>;
  return (
    <video controls autoPlay className="max-w-full max-h-[80vh] rounded-lg shadow-2xl">
      <source src={src} type={mimeType} />
    </video>
  );
}

function AuthAudio({ fileId, mimeType, name }) {
  const src = useBlob(fileId);
  return (
    <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 w-80">
      <div className="text-6xl">🎵</div>
      <p className="text-gray-700 font-medium text-center truncate w-full">{name}</p>
      {src ? (
        <audio controls autoPlay className="w-full">
          <source src={src} type={mimeType} />
        </audio>
      ) : (
        <p className="text-gray-400 text-sm">Loading…</p>
      )}
    </div>
  );
}
