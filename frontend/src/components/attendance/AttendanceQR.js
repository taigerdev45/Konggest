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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineQrcode className="text-blue-600" /> Station de Pointage QR
          </h2>
          <p className="text-sm text-gray-500 mt-1">Générez un QR Code fixe pour vos locaux (valide 60 jours).</p>
        </div>
        <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={isLongTerm} 
                    onChange={(e) => setIsLongTerm(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                Long terme (60j)
            </label>
            <button 
                onClick={generateStationQR} 
                disabled={isLoading}
                className="btn bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
            >
                {isLoading ? 'Génération...' : 'Générer QR'}
            </button>
        </div>
      </div>

      <div className="p-10 flex flex-col items-center justify-center">
        {token ? (
          <>
            <div className="p-8 bg-white border-4 border-gray-100 rounded-3xl shadow-xl mb-8 print:shadow-none print:border-none print:p-0">
                <QRCodeCanvas 
                    value={token} 
                    size={280} 
                    level="H" 
                    includeMargin={true}
                    imageSettings={{
                        src: "/logo.png",
                        x: undefined, y: undefined,
                        height: 50, width: 50,
                        excavate: true,
                    }}
                />
            </div>
            
            <div className="text-center max-w-md print:hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mb-4">
                <HiOutlineShieldCheck /> PRÊT POUR POINTAGE
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{organizationName}</h3>
              <p className="text-sm text-gray-500 mb-6 flex items-center justify-center gap-1">
                <HiOutlineClock /> Expire le : {new Date(validity).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              
              <button 
                onClick={handlePrint}
                className="btn border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-xl flex items-center gap-2 transition font-semibold"
              >
                <HiOutlinePrinter /> Imprimer pour Affichage (A4)
              </button>
            </div>

            {/* Print-only section for A4 optimization */}
            <div className="hidden print:flex fixed inset-0 bg-white z-[9999] flex-col items-center justify-center text-center p-20">
                <div className="mb-12">
                    <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4" />
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight uppercase">STATION DE POINTAGE</h1>
                    <p className="text-2xl text-gray-600 mt-2">{organizationName}</p>
                </div>
                
                <div className="p-12 border-[20px] border-gray-900 rounded-[60px]">
                    <QRCodeCanvas value={token} size={600} level="H" includeMargin={false} />
                </div>

                <div className="mt-20 space-y-4">
                    <p className="text-3xl font-bold text-gray-800">Scannez ce code pour marquer votre présence</p>
                    <p className="text-xl text-gray-400">Propulsé par Konggest Elite SaaS</p>
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 text-sm text-gray-300">
                    ID Session: {token.substring(0, 12)}... | Expire le: {validity}
                </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl w-full border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <HiOutlineQrcode size={40} />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Aucun QR Code généré</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2">Cliquez sur le bouton ci-dessus pour créer le point de scan permanent de votre entreprise.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print\:hidden { display: none !important; }
          .print\:flex { display: flex !important; }
          @page { size: auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
