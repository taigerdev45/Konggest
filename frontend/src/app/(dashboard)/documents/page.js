'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HiOutlineDocumentText, HiOutlineUpload, HiOutlineRefresh, HiOutlineDownload, HiOutlineTrash } from 'react-icons/hi';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
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
      setDocuments(data);
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

  const handleDelete = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;
    try {
      await api.delete(`/documents/${id}/`);
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Erreur lors de la suppression.');
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

      <div className="grid grid-3 mb-lg animate-in delay-1">
        <div className="stat-card blue">
          <div className="stat-icon blue"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--primary)' }}>{documents.length}</h3>
            <p>Documents stockés</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3>{(Array.isArray(documents) ? documents : []).filter(d => d.mime_type?.includes('pdf')).length}</h3>
            <p>Fichiers PDF</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineDocumentText /></div>
          <div className="stat-info">
            <h3>{(Array.isArray(documents) ? documents : []).filter(d => d.is_confidential).length}</h3>
            <p>Confidentiels</p>
          </div>
        </div>
      </div>

      <div className="table-container animate-in delay-2">
        <table>
          <thead>
            <tr>
              <th>Nom du document</th>
              <th>Format</th>
              <th>Taille</th>
              <th>Ajouté le</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="5"><div className="skeleton" style={{ height: 24 }} /></td>
                </tr>
              ))
            ) : documents.length > 0 ? (
              documents.map((doc, i) => (
                <tr key={doc.id} className={`animate-in delay-${Math.min(i+1, 4)}`}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 6, 
                        background: doc.mime_type?.includes('pdf') ? '#fee2e2' : '#e0f2fe',
                        color: doc.mime_type?.includes('pdf') ? '#ef4444' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        <HiOutlineDocumentText />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {doc.title}
                        {doc.is_confidential && (
                          <span style={{ marginLeft: 8, fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>
                            🔒 Privé
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                      {doc.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-xs justify-end">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-xs btn-ghost" 
                        title="Télécharger"
                        style={{ padding: '8px' }}
                      >
                        <HiOutlineDownload fontSize="1.1rem" />
                      </a>
                      {isHR && (
                        <button 
                          className="btn btn-xs btn-ghost" 
                          title="Supprimer" 
                          onClick={() => handleDelete(doc.id)}
                          style={{ padding: '8px', color: 'var(--danger)' }}
                        >
                          <HiOutlineTrash fontSize="1.1rem" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 60 }}>
                  <div className="empty-state">
                    <HiOutlineDocumentText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3 style={{ margin: 0 }}>Aucun document</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Commencez par ajouter vos premiers fichiers RH.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h2>Uploader un document</h2>
                <p>Ajoutez un fichier à votre coffre-fort numérique.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label>Titre du document *</label>
                  <input
                    className="input"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Ex: Contrat de travail, Attestation..."
                  />
                </div>
                <div className="input-group">
                  <label>Fichier *</label>
                  <div
                    style={{
                      border: '2px dashed #CBD5E1',
                      borderRadius: 12,
                      padding: '20px 16px',
                      textAlign: 'center',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onClick={() => document.getElementById('file-upload').click()}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                  >
                    <HiOutlineUpload size={24} style={{ color: 'var(--primary)', marginBottom: 6 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                      {formData.file ? formData.file.name : 'Cliquez pour choisir'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>PDF, PNG, JPG · max 10 MB</p>
                    <input id="file-upload" type="file" onChange={handleFileChange} required style={{ display: 'none' }} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_confidential}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_confidential: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  Restreindre l&apos;accès (Confidentiel)
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !formData.file}>
                  {uploading ? 'Upload...' : 'Uploader'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

