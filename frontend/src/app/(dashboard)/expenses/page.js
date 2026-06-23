'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HiOutlineDocumentText, HiOutlineCheck, HiOutlineX, HiOutlineRefresh, HiOutlineUpload, HiOutlineDownload } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const STATUS_MAP = {
  pending: { label: 'En attente', cls: 'badge-warning' },
  approved: { label: 'Approuvé', cls: 'badge-success' },
  rejected: { label: 'Refusé', cls: 'badge-danger' },
};

export default function ExpensesPage() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ pending_amount: 0, approved_amount: 0 });
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  
  // Form State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  useScrollLock(showModal);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes, statsRes] = await Promise.all([
        api.get('/expenses/'),
        api.get('/expenses/categories/').catch(() => []),
        api.get('/expenses/stats/').catch(() => ({}))
      ]);
      setExpenses(expRes.results || expRes || []);
      setCategories(catRes.results || catRes || []);
      setStats(statsRes || { pending_amount: 0, approved_amount: 0 });
    } catch (error) {
      console.error(error);
      showToast('error', 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // E4: Câblage temps réel
    if (user?.profile?.organization_id) {
      const channel = supabase.channel(`public:konggest_public_expenses`)
        .on('broadcast', { event: 'expense.approved' }, (payload) => {
          showToast('success', 'Une dépense a été approuvée !');
          fetchData();
        })
        .on('broadcast', { event: 'expense.rejected' }, (payload) => {
          showToast('error', 'Une dépense a été refusée.');
          fetchData();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // E5: Utilisation FormData pour Multipart
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('reason', reason);
      formData.append('date', date);
      if (categoryId) formData.append('category', categoryId);
      if (file) formData.append('attachment', file);
      
      await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showToast('success', "Note de frais envoyée. L'image est en cours de compression au format JPG.");
      setShowModal(false);
      fetchData();
      
      // reset
      setAmount(''); setReason(''); setDate(''); setFile(null);
    } catch (err) {
      showToast('error', "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, actionStr) => {
    try {
      await api.post(`/expenses/${id}/${actionStr}/`);
      fetchData();
    } catch (err) {
      showToast('error', `Erreur lors de l'action (${actionStr}).`);
    }
  };

  const handleExport = async () => {
    try {
      // E7: Streaming CSV download trigger
      const response = await api.get('/expenses/export_csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      showToast('error', 'Erreur export CSV.');
    }
  };

  return (
    <div className="animate-in">
      {toast.show && (
        <div className={`toast toast-${toast.type} fixed top-4 right-4 z-50 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.text}
        </div>
      )}

      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notes de Frais</h1>
          <p className="text-gray-500">Gérier et validez vos dépenses (Expenses)</p>
        </div>
        <div className="flex gap-2">
          {['manager', 'hr', 'admin'].includes(profile?.role) && (
            <button className="btn btn-secondary flex items-center gap-2" onClick={handleExport}>
              <HiOutlineDownload /> Export Excel
            </button>
          )}
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <HiOutlineUpload /> Nouvelle Dépense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card orange p-4 border rounded shadow-sm">
          <h3 className="text-xl font-bold">{stats.pending_amount} FCFA</h3>
          <p className="text-gray-500">En attente d'approbation</p>
        </div>
        <div className="stat-card green p-4 border rounded shadow-sm">
          <h3 className="text-xl font-bold">{stats.approved_amount} FCFA</h3>
          <p className="text-gray-500">Total Approuvé</p>
        </div>
      </div>

      <div className="card border rounded shadow-sm bg-white">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Historique</h3>
          <button className="btn btn-ghost" onClick={fetchData}><HiOutlineRefresh /></button>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4">Employé</th>
                <th className="p-4">Date</th>
                <th className="p-4">Motif</th>
                <th className="p-4">Montant (FCFA)</th>
                <th className="p-4">Reçu</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-4 text-center">Chargement...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center text-gray-500">Aucune dépense trouvée.</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="border-b transition hover:bg-gray-50">
                  <td className="p-4 font-medium">{exp.employee_name}</td>
                  <td className="p-4">{exp.date}</td>
                  <td className="p-4">{exp.reason} <br/><small className="text-gray-400">{exp.category_name}</small></td>
                  <td className="p-4 font-bold">{exp.amount}</td>
                  <td className="p-4">
                    {exp.attachment_url ? (
                      <a href={exp.attachment_url} target="_blank" rel="noreferrer" className="text-blue-500 underline text-sm flex items-center gap-1">
                        <HiOutlineDocumentText /> Voir
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`badge ${STATUS_MAP[exp.status]?.cls} px-2 py-1 rounded text-xs`}>
                      {STATUS_MAP[exp.status]?.label}
                    </span>
                  </td>
                  <td className="p-4">
                    {exp.status === 'pending' && ['manager', 'hr', 'admin'].includes(profile?.role) && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(exp.id, 'approve')} className="text-green-600 hover:text-green-800" title="Approuver"><HiOutlineCheck size={20} /></button>
                        <button onClick={() => handleAction(exp.id, 'reject')} className="text-red-600 hover:text-red-800" title="Refuser"><HiOutlineX size={20} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h2>Soumettre une note de frais</h2>
                <p>Renseignez les détails de votre dépense.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label htmlFor="exp-amount">Montant (FCFA) *</label>
                  <input id="exp-amount" className="input" type="number" required value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="0" />
                </div>
                <div className="input-group">
                  <label htmlFor="exp-reason">Motif / Description *</label>
                  <input id="exp-reason" className="input" type="text" required value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Restaurant client X" />
                </div>
                <div className="input-group">
                  <label htmlFor="exp-cat">Catégorie</label>
                  <select id="exp-cat" className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">— Sélectionnez —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="exp-date">Date *</label>
                  <input id="exp-date" className="input" type="date" required value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="input-group">
                  <label htmlFor="exp-file">Justificatif (Image/PDF)</label>
                  <input id="exp-file" className="input" type="file" onChange={e => setFile(e.target.files[0])} accept="image/*,.pdf" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Compressé automatiquement (max 500 Ko).</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Envoi...' : 'Soumettre'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
