import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Breadcrumb from '../components/Breadcrumb';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import UploadZone from '../components/UploadZone';
import PreviewModal from '../components/PreviewModal';

export default function Dashboard() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem('username');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, fileRes] = await Promise.all([
        api.get('/folders'),
        api.get('/files', { params: currentFolder ? { folderId: currentFolder.id } : {} }),
      ]);
      setFolders(fRes.data);
      setFiles(fileRes.data);
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  // Subfolders of the current location
  const visibleFolders = folders.filter(f =>
    currentFolder ? f.parent_id === currentFolder.id : f.parent_id == null
  );

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await api.post('/folders', { name: newFolderName.trim(), parentId: currentFolder?.id });
    setNewFolderName('');
    setShowNewFolder(false);
    loadData();
  }

  async function deleteFolder(id) {
    await api.delete(`/folders/${id}`);
    loadData();
  }

  async function deleteFile(id) {
    await api.delete(`/files/${id}`);
    loadData();
  }

  function downloadFile(file) {
    api.get(`/files/${file.id}/download`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <span className="font-bold text-gray-900">Personal Cloud</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">👤 {username}</span>
            <button onClick={logout} className="btn-secondary text-xs">Sign out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Breadcrumb + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb folders={folders} currentFolder={currentFolder} onNavigate={setCurrentFolder} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewFolder(v => !v)} className="btn-secondary text-sm">
              📁 New folder
            </button>
          </div>
        </div>

        {/* New folder form */}
        {showNewFolder && (
          <form onSubmit={createFolder} className="flex items-center gap-2 card p-3">
            <input
              className="input flex-1"
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
            />
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowNewFolder(false)} className="btn-secondary">Cancel</button>
          </form>
        )}

        {/* Upload zone */}
        <UploadZone currentFolder={currentFolder} onUploaded={loadData} />

        {/* Content grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-16 text-4xl animate-pulse">☁️</div>
        ) : visibleFolders.length === 0 && files.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-3">📂</div>
            <p className="text-lg font-medium">This folder is empty</p>
            <p className="text-sm">Upload files or create a folder to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleFolders.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Folders</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleFolders.map(f => (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      onClick={() => setCurrentFolder(f)}
                      onDelete={deleteFolder}
                    />
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Files · {files.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {files.map(f => (
                    <FileCard
                      key={f.id}
                      file={f}
                      onPreview={setPreviewFile}
                      onDownload={downloadFile}
                      onDelete={deleteFile}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => { downloadFile(previewFile); setPreviewFile(null); }}
        />
      )}
    </div>
  );
}
