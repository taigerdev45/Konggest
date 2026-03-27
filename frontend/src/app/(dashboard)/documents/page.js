'use client';

import { useState, useEffect } from 'react';
import { HiOutlineDocumentText, HiOutlineUpload, HiOutlineRefresh, HiOutlineDownload, HiOutlineTrash } from 'react-icons/hi';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    is_confidential: false,
    file: null
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/documents/');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, file: e.target.files[0] }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const file = formData.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.profile?.organization?.slug || 'common'}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Save reference in Django Backend
      await api.post('/documents/', {
        title: formData.title || file.name,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_confidential: formData.is_confidential,
      });

      setShowModal(false);
      setFormData({ title: '', category: '', is_confidential: false, file: null });
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Erreur lors de l\'upload du document.');
    } finally {
      setUploading(false);
    }
  };

  const isHR = user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestion Documentaire</h1>
          <p>Contrats, attestations et documents RH</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchDocuments} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          {isHR && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <HiOutlineUpload /> Upload document
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3>{documents.length}</h3>
            <p>Documents stockés</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3>{documents.filter(d => d.mime_type?.includes('pdf')).length}</h3>
            <p>Fichiers PDF</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3>{documents.filter(d => d.is_confidential).length}</h3>
            <p>Confidentiels</p>
          </div>
        </div>
      </div>

      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Taille</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="5"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : documents.length > 0 ? (
              documents.map(doc => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div className="flex items-center gap-sm">
                      <HiOutlineDocumentText style={{ color: 'var(--primary-light)' }} />
                      {doc.title}
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{doc.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span></td>
                  <td>{(doc.file_size / 1024).toFixed(1)} KB</td>
                  <td>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div className="flex gap-xs">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost" title="Télécharger">
                        <HiOutlineDownload />
                      </a>
                      {isHR && (
                        <button className="btn btn-xs btn-ghost text-danger" title="Supprimer">
                          <HiOutlineTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun document trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Uploader un document</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpload} className="modal-body">
              <div className="form-group mb-md">
                <label>Titre du document *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required placeholder="Ex: Contrat de travail..." />
              </div>
              <div className="form-group mb-md">
                <label>Fichier *</label>
                <input type="file" onChange={handleFileChange} required />
              </div>
              <div className="form-group mb-md flex items-center gap-sm">
                <input type="checkbox" id="confidential" checked={formData.is_confidential} onChange={(e) => setFormData(prev => ({ ...prev, is_confidential: e.target.checked }))} />
                <label htmlFor="confidential" style={{ marginBottom: 0 }}>Document confidentiel</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !formData.file}>
                  {uploading ? 'Upload en cours...' : 'Uploader'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
            .modal-content { width: 90%; padding: 24px; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }
            .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; }
          `}</style>
        </div>
      )}
    </div>
  );
}

