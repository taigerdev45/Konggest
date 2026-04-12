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
    <div className="min-h-full flex flex-col bg-[#FDFDFF] items-center">
      {toast.show && (
        <div className={`fixed bottom-8 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-10 backdrop-blur-md z-[100] ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-gray-900/95 border border-white/10 ring-1 ring-white/20'}`}>
          <HiOutlineLogin className="text-xl text-blue-400" />
          <span className="font-black text-xs uppercase tracking-widest">{toast.text}</span>
        </div>
      )}
      
      <div className="w-full max-w-xl px-6 pt-12 pb-8 text-center animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Validation Mobile</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-4">
            Scanner de Proximité
        </h1>
        <p className="text-gray-400 font-medium text-sm md:text-base px-4">
            Positionnez le code QR de la station face à votre caméra pour valider votre pointage.
        </p>
      </div>

      <div className="w-full max-w-md px-6 pb-20 flex flex-col items-center gap-8">
        <div className="flex gap-4 w-full bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50">
            <button 
                onClick={() => { setScanType('in'); processingRef.current = false; }}
                disabled={scanResult !== ''}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    scanType === 'in' 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
            >
                <HiOutlineLogin size={18} /> Arrivée
            </button>
            <button 
                onClick={() => { setScanType('out'); processingRef.current = false; }}
                disabled={scanResult !== ''}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    scanType === 'out' 
                    ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
            >
                <HiOutlineLogout size={18} /> Départ
            </button>
        </div>

        {!scanResult ? (
            <div className="w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col">
                    <div id="reader" className="w-full bg-black aspect-square md:aspect-auto"></div>
                    <div className="p-6 text-center bg-white border-t border-gray-50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                           {scanType === 'in' ? 'Prêt pour scan Entrée' : 'Prêt pour scan Sortie'}
                        </p>
                    </div>
                </div>
                
                {/* Decorative Scanner Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/30 rounded-3xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl translate-x-[-2px] translate-y-[-2px]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl translate-x-[2px] translate-y-[-2px]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl translate-x-[-2px] translate-y-[2px]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl translate-x-[2px] translate-y-[2px]"></div>
                </div>
            </div>
        ) : (
            <div className="w-full bg-emerald-500 rounded-[3rem] p-10 text-center shadow-2xl shadow-emerald-500/20 border border-emerald-400 ring-4 ring-emerald-500/10 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <HiOutlineLogin className="text-white text-4xl" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter mb-2 uppercase">Pointage Validé</h3>
                <p className="text-emerald-100 font-medium text-sm">
                    Enregistrement réussi. Redirection immédiate...
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
