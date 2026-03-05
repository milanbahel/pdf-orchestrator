import { useState, useRef } from 'react';
import api from '../api';

export default function UploadZone({ currentFolder, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState([]);
  const inputRef = useRef();

  async function uploadFiles(fileList) {
    if (!fileList.length) return;
    setUploading(true);
    setProgress(Array.from(fileList).map(f => ({ name: f.name, done: false })));

    const form = new FormData();
    Array.from(fileList).forEach(f => form.append('files', f));
    if (currentFolder) form.append('folderId', currentFolder.id);

    try {
      await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          // Mark all as in-progress until done
        },
      });
      setProgress(p => p.map(x => ({ ...x, done: true })));
      setTimeout(() => {
        setUploading(false);
        setProgress([]);
        onUploaded();
      }, 800);
    } catch {
      setUploading(false);
      setProgress([]);
      alert('Upload failed. Please try again.');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="text-4xl mb-2">{dragging ? '📂' : '⬆️'}</div>
        <p className="text-gray-600 font-medium">
          {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Any file type · Up to 10 GB per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />
      </div>

      {uploading && progress.length > 0 && (
        <div className="mt-3 space-y-1">
          {progress.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={f.done ? 'text-green-600' : 'text-blue-600'}>{f.done ? '✓' : '⏳'}</span>
              <span className="text-gray-700 truncate">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
