'use client';

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { HiOutlinePrinter, HiOutlineQrcode, HiOutlineClock, HiOutlineShieldCheck } from 'react-icons/hi';
import api from '@/lib/api';

/**
 * AttendanceQR — Premium Station QR Generator
 * Handles generation of 60-day permanent station QR Codes.
 */
export default function AttendanceQR({ organizationName }) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validity, setValidity] = useState(null);
  const [isLongTerm, setIsLongTerm] = useState(true);

  const generateStationQR = async () => {
    setIsLoading(true);
    try {
      // AT3 Updated: generate_qr with long_term support
      const res = await api.post('/time-tracking/entries/generate_qr/', {
        long_term: isLongTerm
      });
      setToken(res.token || res.qr_payload);
      setValidity(res.expires_at);
    } catch (err) {
      console.error('Failed to generate QR:', err);
      alert('Erreur lors de la génération du QR Code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-8 md:p-10 border-b bg-gray-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-1 bg-blue-600 rounded-full"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Opérationnel</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <HiOutlineQrcode className="text-blue-500" /> Station de Pointage QR
          </h2>
          <p className="text-sm text-gray-400 font-medium mt-1">Générez un point d'accès fixe pour vos locaux (60 jours).</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors">
                <input 
                    type="checkbox" 
                    checked={isLongTerm} 
                    onChange={(e) => setIsLongTerm(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded-xl border-2 border-gray-100 focus:ring-blue-500/20 transition-all checked:bg-blue-600"
                />
                Long terme (60j)
            </label>
            <button 
                onClick={generateStationQR} 
                disabled={isLoading}
                className="w-full sm:w-auto btn bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/50 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? 'Génération...' : 'Générer Point d\'Accès'}
            </button>
        </div>
      </div>

      <div className="p-10 md:p-20 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-50/30">
        {token ? (
          <>
            <div className="p-10 md:p-12 bg-white border border-gray-100 rounded-[3rem] shadow-2xl mb-10 transition-transform hover:scale-[1.02] duration-500 print:shadow-none print:border-none print:p-0">
                <QRCodeCanvas 
                    value={token} 
                    size={320} 
                    level="H" 
                    includeMargin={true}
                    imageSettings={{
                        src: "/logo.png",
                        x: undefined, y: undefined,
                        height: 60, width: 60,
                        excavate: true,
                    }}
                />
            </div>
            
            <div className="text-center max-w-md print:hidden animate-in fade-in duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm border border-emerald-100">
                <HiOutlineShieldCheck size={14} /> Certificat Actif
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-2 uppercase">{organizationName}</h3>
              <p className="text-sm text-gray-400 font-medium mb-10 flex items-center justify-center gap-2">
                <HiOutlineClock className="text-blue-500" /> 
                Expire le : <span className="text-gray-900 font-bold">{new Date(validity).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}</span>
              </p>
              
              <button 
                onClick={handlePrint}
                className="group btn bg-white text-gray-900 border border-gray-100 px-10 py-4 rounded-[1.5rem] flex items-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 font-black text-[10px] uppercase tracking-widest"
              >
                <HiOutlinePrinter size={18} className="group-hover:text-blue-500 transition-colors" /> 
                Imprimer Affichage A4
              </button>
            </div>

            {/* Print-only section for A4 optimization (Highly Professional) */}
            <div className="hidden print:flex fixed inset-0 bg-white z-[9999] flex-col items-center justify-between text-center p-20 font-sans">
                <div className="w-full flex justify-between items-center opacity-40">
                    <img src="/logo.png" alt="Logo" className="w-16 h-16" />
                    <span className="font-black text-sm tracking-widest">KONGGEST ELITE SaaS • {new Date().getFullYear()}</span>
                </div>

                <div className="flex flex-col items-center">
                    <div className="mb-14">
                        <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase mb-4">STATION DE POINTAGE</h1>
                        <div className="w-24 h-2 bg-blue-600 mx-auto rounded-full mb-6"></div>
                        <p className="text-3xl text-gray-500 font-medium">{organizationName}</p>
                    </div>
                    
                    <div className="p-16 border-[16px] border-gray-900 rounded-[80px] shadow-2xl">
                        <QRCodeCanvas value={token} size={650} level="H" includeMargin={false} />
                    </div>

                    <div className="mt-20 space-y-6">
                        <p className="text-4xl font-black text-gray-900 tracking-tight uppercase">Scannez pour valider votre présence</p>
                        <p className="text-2xl text-gray-400 font-medium">Ouvrez votre espace employé et utilisez le scanner intégré.</p>
                    </div>
                </div>

                <div className="w-full pt-10 border-t border-gray-200 flex justify-between text-[12px] font-black text-gray-300 uppercase tracking-widest">
                    <span>ID: {token.substring(0, 16)}</span>
                    <span>EXPIRATION : {new Date(validity).toLocaleDateString()}</span>
                </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] w-full border-2 border-dashed border-gray-100 group">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200 shadow-sm border border-gray-50 group-hover:scale-110 transition-transform duration-500">
              <HiOutlineQrcode size={48} />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-2 uppercase">Aucun QR Code Actif</h3>
            <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">Cliquez sur le bouton pour initialiser la station de pointage permanente de votre organisation.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print\:hidden { display: none !important; }
          .print\:flex { display: flex !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
