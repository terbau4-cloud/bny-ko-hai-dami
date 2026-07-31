import React, { useState, useEffect } from 'react';
import { Game, TopupProduct } from '../types';
import { ArrowLeft, Check, Plus, Minus, CreditCard, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  game: Game;
  onBack: () => void;
  onPurchase: (orderData: {
    game: Game;
    product: TopupProduct;
    quantity: number;
    playerId: string;
    requirementsData?: { name: string; value: string }[];
    totalAmount: number;
    orderId: string;
  }) => void;
  walletBalance: number;
  isBlocked?: boolean;
}

export const TopupDetailPage: React.FC<Props> = ({
  game,
  onBack,
  onPurchase,
  walletBalance,
  isBlocked = false,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<TopupProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reqValues, setReqValues] = useState<{ [reqId: string]: string }>({});
  const [playerId, setPlayerId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  const availableProducts: TopupProduct[] = (game && game.products && game.products.length > 0) ? game.products : [];

  useEffect(() => {
    if (availableProducts.length > 0) {
      setSelectedProduct(availableProducts[0]);
    } else {
      setSelectedProduct(null);
    }
    setQuantity(1);
    setReqValues({});
    setPlayerId('');
    setErrorMsg('');
    setIsSuccess(false);
  }, [game]);

  const totalAmount = selectedProduct ? selectedProduct.price * quantity : 0;

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const activeRequirements = (game.requirements && game.requirements.length > 0)
    ? game.requirements
    : [{ id: 'req_default', name: 'Player ID', type: 'number' }];

  const handleConfirmPurchase = () => {
    if (isBlocked) {
      setErrorMsg('You have been blocked by Admin. You cannot place orders.');
      return;
    }

    if (!selectedProduct) {
      setErrorMsg('Please select a recharge package product first.');
      return;
    }

    const missingReqs = activeRequirements.filter((r) => !reqValues[r.id]?.trim());
    if (missingReqs.length > 0) {
      if (missingReqs.length === 1) {
        setErrorMsg(`Please enter ${missingReqs[0].name}.`);
      } else if (missingReqs.length === 2) {
        setErrorMsg(`Please enter ${missingReqs[0].name} and ${missingReqs[1].name}.`);
      } else {
        const names = missingReqs.map((r) => r.name);
        const last = names.pop();
        setErrorMsg(`Please enter ${names.join(', ')} and ${last}.`);
      }
      return;
    }

    if (totalAmount > walletBalance) {
      setErrorMsg(`Insufficient wallet balance! Total is RS ${totalAmount}, but your balance is RS ${walletBalance}.`);
      return;
    }

    const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
    const generatedOrderId = `BNY-${randomDigits}`;

    const requirementsData = activeRequirements.map((r) => ({
      name: r.name,
      value: reqValues[r.id]?.trim() || '',
    }));

    const mainPlayerId = requirementsData.map((r) => `${r.name}: ${r.value}`).join(' | ');

    setPlacedOrderId(generatedOrderId);
    setIsSuccess(true);

    onPurchase({
      game,
      product: selectedProduct,
      quantity,
      playerId: mainPlayerId,
      requirementsData,
      totalAmount,
      orderId: generatedOrderId,
    });

    setTimeout(() => {
      onBack();
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-slate-50 pb-28 text-slate-800"
    >
      {/* Top Header Bar for Game Page */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            id="back-to-store-btn"
            className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate max-w-[180px] sm:max-w-xs">
            {game.title}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Wallet:</span>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              RS {walletBalance}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl font-bold shadow-inner">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Purchase Submitted!</h2>
              <p className="text-sm font-bold text-indigo-600 mt-2">
                Order ID:{' '}
                <span className="font-mono bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                  {placedOrderId}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-3 max-w-sm mx-auto">
                Your order is being processed automatically. You can track this order in your History tab. Returning to main page...
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            {/* Step 1: Requirements */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs">
                  1
                </div>
                <span>Enter Account Details</span>
              </label>

              <div className="space-y-3">
                {activeRequirements.map((req) => (
                  <div key={req.id} className="space-y-1">
                    <span className="text-xs font-bold text-slate-600">
                      {req.name}:
                    </span>
                    <div className="relative">
                      <UserCheck size={18} className="absolute left-3.5 top-3.5 text-indigo-600" />
                      <input
                        type={req.type === 'number' ? 'number' : 'text'}
                        value={reqValues[req.id] || ''}
                        onChange={(e) => {
                          setReqValues((prev) => ({ ...prev, [req.id]: e.target.value }));
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder={`Enter ${req.name}`}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-slate-900 font-bold text-sm outline-none transition-all shadow-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Select Package */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs">
                  2
                </div>
                <span>Select Recharge Package</span>
              </label>

              {availableProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  {availableProducts.map((prod) => {
                    const isSelected = selectedProduct?.id === prod.id;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setSelectedProduct(prod);
                          if (errorMsg) setErrorMsg('');
                        }}
                        id={`page-product-card-${prod.id}`}
                        className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {prod.badge && (
                          <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                            {prod.badge}
                          </span>
                        )}

                        <div className="font-black text-slate-900 text-sm sm:text-base pr-8">
                          {prod.name}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-indigo-600 font-black text-sm sm:text-base">
                            RS {prod.price}
                          </span>
                          {isSelected && (
                            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl text-center space-y-1">
                  <p className="font-black text-sm text-amber-900">No Recharge Packages Available</p>
                  <p className="text-amber-700 font-medium">There are no packages available for this game at the moment.</p>
                </div>
              )}
            </div>

            {/* Step 3: Quantity */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Quantity
                </span>
                <span className="text-sm font-black text-slate-800">Number of Packs</span>
              </div>

              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  id="page-qty-decrement-btn"
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer disabled:opacity-50"
                  disabled={quantity <= 1 || !selectedProduct}
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-black text-lg text-slate-900">
                  {selectedProduct ? quantity : 0}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  id="page-qty-increment-btn"
                  className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold transition-colors cursor-pointer disabled:opacity-50"
                  disabled={!selectedProduct}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl text-center">
                {errorMsg}
              </div>
            )}

            {/* Purchase CTA Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Total Payable
                </span>
                <span className="text-2xl font-black text-indigo-600">
                  {selectedProduct ? `RS ${totalAmount}` : 'RS 0'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={!selectedProduct || availableProducts.length === 0}
                id="page-confirm-purchase-btn"
                className={`flex-1 py-4 text-white font-black text-base rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
                  selectedProduct && availableProducts.length > 0
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200 cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <ShieldCheck size={20} />
                <span>{selectedProduct ? 'Confirm Purchase' : 'No Package Available'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
