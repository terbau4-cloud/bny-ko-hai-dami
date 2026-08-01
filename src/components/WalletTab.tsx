import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Upload, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
  onAddTransaction: (amount: number, screenshotUrl: string, paymentQrTitle?: string) => void;
  currentBalance: number;
  isBlocked?: boolean;
}

interface PaymentQR {
  id: string;
  title: string;
  imageUrl: string;
}

export const WalletTab: React.FC<Props> = ({ onAddTransaction, currentBalance, isBlocked = false }) => {
  const [amount, setAmount] = useState<string>('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [paymentQrs, setPaymentQrs] = useState<PaymentQR[]>(() => {
    try {
      const cached = localStorage.getItem('bny_payment_qrs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedQrIndex, setSelectedQrIndex] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'payment_qrs'),
      (snap) => {
        const qrs: PaymentQR[] = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || 'Payment QR',
          imageUrl: d.data().imageUrl || '',
        }));
        if (qrs.length > 0) {
          setPaymentQrs(qrs);
          try {
            localStorage.setItem('bny_payment_qrs', JSON.stringify(qrs));
          } catch {}
        }
      },
      (err) => {
        console.warn('Firestore payment_qrs warning in WalletTab:', err?.message || err);
      }
    );
    return () => unsub();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      alert('You have been blocked by Admin. You cannot submit deposit requests.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount!');
      return;
    }
    if (!screenshot) {
      alert('Please upload payment screenshot!');
      return;
    }

    const rawTitle = paymentQrs[selectedQrIndex]?.title || paymentQrs[0]?.title || '';
    const selectedQrTitle = (rawTitle && rawTitle.toLowerCase() !== 'payment qr') ? rawTitle : 'eSewa QR';
    onAddTransaction(numAmount, screenshot, selectedQrTitle);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setScreenshot(null);
      setFileName('');
      setAmount('');
    }, 2800);
  };

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      {/* Wallet Balance Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={18} /> My Wallet Balance
          </span>
          <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
            Instant Deposit
          </span>
        </div>
        <div className="text-4xl sm:text-5xl font-extrabold mb-1">
          RS {currentBalance.toFixed(2)}
        </div>
        <p className="text-xs text-indigo-100 font-medium">Scan QR code below to top up your wallet instantly</p>
      </div>

      {submitted ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 text-center space-y-3 shadow-md"
        >
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-bold text-emerald-900">Payment Submitted! 🎉</h3>
          <p className="text-sm text-emerald-700 font-medium">
            Your top up of <span className="font-bold text-lg">RS {amount}</span> has been uploaded. Track status in History!
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: SCAN QR CODE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                1
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="text-indigo-600" /> Scan QR Code
              </h3>
            </div>

            {/* Display Uploaded QR or Fallback SVG */}
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border border-slate-200 gap-3">
              {paymentQrs.length > 0 ? (
                <>
                  {paymentQrs.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap justify-center mb-1">
                      {paymentQrs.map((qr, idx) => (
                        <button
                          key={qr.id}
                          type="button"
                          onClick={() => setSelectedQrIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            selectedQrIndex === idx
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {qr.title || `QR ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 relative">
                    <img
                      src={paymentQrs[selectedQrIndex]?.imageUrl || paymentQrs[0]?.imageUrl}
                      alt={paymentQrs[selectedQrIndex]?.title || 'Payment QR'}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-600">
                    {paymentQrs[selectedQrIndex]?.title || 'Scan QR Code to Pay'}
                  </p>
                </>
              ) : (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative">
                  <svg
                    className="w-48 h-48 sm:w-52 sm:h-52"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="100" height="100" fill="white" rx="8" />
                    <rect x="10" y="10" width="25" height="25" fill="#4F46E5" rx="4" />
                    <rect x="14" y="14" width="17" height="17" fill="white" rx="2" />
                    <rect x="18" y="18" width="9" height="9" fill="#4F46E5" rx="1" />

                    <rect x="65" y="10" width="25" height="25" fill="#4F46E5" rx="4" />
                    <rect x="69" y="14" width="17" height="17" fill="white" rx="2" />
                    <rect x="73" y="18" width="9" height="9" fill="#4F46E5" rx="1" />

                    <rect x="10" y="65" width="25" height="25" fill="#4F46E5" rx="4" />
                    <rect x="14" y="69" width="17" height="17" fill="white" rx="2" />
                    <rect x="18" y="73" width="9" height="9" fill="#4F46E5" rx="1" />

                    <rect x="40" y="10" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="52" y="10" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="40" y="22" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="52" y="22" width="8" height="8" fill="#1E293B" rx="1" />

                    <rect x="10" y="40" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="22" y="40" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="10" y="52" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="22" y="52" width="8" height="8" fill="#1E293B" rx="1" />

                    <rect x="65" y="40" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="77" y="40" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="65" y="52" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="77" y="52" width="8" height="8" fill="#4F46E5" rx="1" />

                    <rect x="40" y="65" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="52" y="65" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="40" y="77" width="8" height="8" fill="#1E293B" rx="1" />
                    <rect x="52" y="77" width="8" height="8" fill="#4F46E5" rx="1" />
                    <rect x="65" y="77" width="20" height="8" fill="#4F46E5" rx="1" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: ENTER AMOUNT */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                2
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Enter Amount
              </h3>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                RS
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                id="amount-input"
                placeholder="0"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          {/* STEP 3: UPLOAD SCREENSHOT */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                3
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="text-indigo-600" /> Upload Receipt Screenshot
              </h3>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="screenshot-file-input"
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : screenshot
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              {screenshot ? (
                <div className="space-y-3">
                  <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden border-2 border-emerald-400 shadow-xs">
                    <img src={screenshot} alt="Screenshot preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-emerald-800 font-bold text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={18} className="text-emerald-600" /> Screenshot Attached ({fileName || 'Receipt'})
                  </div>
                  <p className="text-xs text-slate-500">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <span className="text-sm font-medium text-slate-600 block">Click or drag & drop to upload screenshot</span>
                  <p className="text-xs text-slate-400">Supports PNG, JPG, JPEG payment proofs</p>
                </div>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            id="submit-payment-btn"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            <span>Confirm</span>
            <ArrowRight size={20} />
          </button>
        </form>
      )}
    </div>
  );
};

