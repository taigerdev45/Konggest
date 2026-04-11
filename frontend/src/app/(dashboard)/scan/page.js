'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { HiOutlineLogin, HiOutlineLogout } from 'react-icons/hi';

export default function ScanPage() {
  const [scanResult, setScanResult] = useState('');
  const [scanType, setScanType] = useState('in'); // 'in' or 'out'
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  
  const processingRef = useRef(false);
  const router = useRouter();

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  useEffect(() => {
    // Only initialize if we're not fully processed
    if (scanResult) return;

    const scanner = new Html5QrcodeScanner("reader", { 
      qrbox: { width: 250, height: 250 }, 
      fps: 5,
      rememberLastUsedCamera: true
    });

    scanner.render(async (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      
      try {
        const res = await api.post('/time-tracking/entries/scan/', {
          token: decodedText,
          scan_type: scanType
        });
        showToast('success', res.message || 'Pointage enregistré avec succès');
        setScanResult(decodedText);
        scanner.clear();
        setTimeout(() => {
          router.push('/time-tracking');
        }, 3000);
      } catch (err) {
        console.error('Scan error:', err);
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.error || 'QR invalide ou déjà scanné.';
        showToast('error', errorMsg);
        // Allow another scan attempt after 3s error
        setTimeout(() => {
          processingRef.current = false;
        }, 3000);
      }
    }, (error) => {
      // Ignorer les erreurs silencieuses (frame vide, pas de QR visible)
    });

    return () => {
      scanner.clear().catch(err => console.log('Scanner cleanup:', err));
    };
  }, [scanType, scanResult, router]);

  return (
    <div className="animate-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      {toast.show && (
        <div className={`toast toast-${toast.type} fixed top-4 right-4 z-50 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.text}
        </div>
      )}
      
      <div className="page-header" style={{ justifyContent: 'center' }}>
        <div>
          <h1 style={{ textAlign: 'center' }}>Scanner QR Pointage</h1>
          <p>Présentez le code QR quotidien pour valider votre présence</p>
        </div>
      </div>

      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button 
          className={`btn ${scanType === 'in' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setScanType('in'); processingRef.current = false; }}
          disabled={scanResult !== ''}
        >
          <HiOutlineLogin /> Je pointe mon ARRIVÉE
        </button>
        <button 
          className={`btn ${scanType === 'out' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => { setScanType('out'); processingRef.current = false; }}
          disabled={scanResult !== ''}
        >
          <HiOutlineLogout /> Je pointe mon DÉPART
        </button>
      </div>

      {!scanResult ? (
        <div className="card shadow" style={{ padding: 0, overflow: 'hidden' }}>
          <div id="reader" style={{ width: '100%', border: 'none' }}></div>
          <div style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.9em' }}>
            Autorisez l'accès à votre caméra si ce n'est pas déjà fait.
          </div>
        </div>
      ) : (
        <div className="card shadow" style={{ background: 'var(--success-100)', borderColor: 'var(--success-500)' }}>
          <h3 style={{ color: 'var(--success-700)', marginTop: 0 }}>✅ Pointage réussi !</h3>
          <p style={{ color: 'var(--success-600)' }}>
            Vous allez être redirigé vers l'historique de vos pointages...
          </p>
        </div>
      )}
    </div>
  );
}
