import React, { useState, useEffect } from 'react';
import { Game, TopupProduct } from '../types';
import { X, Check, Plus, Minus, CreditCard, ShieldCheck, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  game: Game | null;
  onClose: () => void;
  onPurchase: (orderData: {
    game: Game;
    product: TopupProduct;
    quantity: number;
    playerId: string;
    totalAmount: number;
    orderId: string;
  }) => void;
  walletBalance: number;
}

export const TopupDetailModal: React.FC<Props> = ({
  game,
  onClose,
  onPurchase,
  walletBalance,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<TopupProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [playerId, setPlayerId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  // Set default selected product when game changes
  useEffect(() => {
    if (game && game.products && game.products.length > 0) {
      setSelectedProduct(game.products[0]);
    } else if (game) {
      setSelectedProduct({
        id: 'default_1',
        name: '100 Diamonds',
        price: 150,
      });
    }
    setQuantity(1);
    setPlayerId('');
    setErrorMsg('');
    setIsSuccess(false);
  }, [game]);

  if (!game) return null;

  const defaultProducts: TopupProduct[] = game.products || [
    { id: 'def_1', name: '100 Diamonds', price: 150, badge: 'Popular' },
    { id: 'def_2', name: '250 Diamonds', price: 350 },
    { id: 'def_3', name: '500 Diamonds', price: 680, badge: 'HOT' },
    { id: 'def_4', name: '1000 Diamonds', price: 1300 },
  ];

  const currentProduct = selectedProduct || defaultProducts[0];
  const totalAmount = currentProduct ? currentProduct.price * quantity : 0;

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleConfirmPurchase = () => {
    if (!playerId.trim()) {
      setErrorMsg('Please enter your Player ID / User ID first.');
      return;
    }

    if (totalAmount > walletBalance) {
      setErrorMsg(`Insufficient wallet balance! Total is RS ${totalAmount}, but you have RS ${walletBalance}.`);
      return;
    }

    // Generate BNY- + 8 random digits
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
    const generatedOrderId = `BNY-${randomDigits}`;

    setPlacedOrderId(generatedOrderId);
    setIsSuccess(true);

    onPurchase({
      game,
      product: currentProduct,
      quantity,
      playerId: playerId.trim(),
      totalAmount,
      orderId: generatedOrderId,
    });

    // After brief success state, return home
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="relative bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center text-2xl">
                {game.coverImg ? (
                  <img
                    src={game.coverImg}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{game.icon}</span>
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                  {game.title}
                </h3>
                {game.publisher && (
                  <p className="text-xs text-indigo-300 font-medium">
                    {game.publisher}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              id="close-modal-btn"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800">
            {isSuccess ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-10 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
                  ✓
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Purchase Submitted!</h3>
                  <p className="text-sm font-semibold text-indigo-600 mt-1">
                    Order ID: <span className="font-mono bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">{placedOrderId}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Check your order status in the History tab. Redirecting home...
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Step 1: Account ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={15} className="text-indigo-600" />
                    1. Enter Player ID / User ID
                  </label>
                  <input
                    type="text"
                    value={playerId}
                    onChange={(e) => {
                      setPlayerId(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. 123456789 (1234)"
                    id="player-id-input"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-bold text-sm outline-none transition-colors"
                  />
                </div>

                {/* Step 2: Select Package / Product */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={15} className="text-indigo-600" />
                    2. Select Product / Package
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {defaultProducts.map((prod) => {
                      const isSelected = currentProduct?.id === prod.id;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setSelectedProduct(prod);
                            if (errorMsg) setErrorMsg('');
                          }}
                          id={`product-card-${prod.id}`}
                          className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {prod.badge && (
                            <span className="absolute top-2 right-2 bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                              {prod.badge}
                            </span>
                          )}

                          <div className="font-bold text-slate-900 text-sm pr-10">
                            {prod.name}
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-indigo-600 font-extrabold text-sm">
                              RS {prod.price}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Quantity Selector */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Quantity
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      Select Amount
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      id="qty-decrement-btn"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center font-black text-lg text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      id="qty-increment-btn"
                      className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                    {errorMsg}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar */}
          {!isSuccess && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">
                  Total Price
                </span>
                <span className="text-2xl font-black text-indigo-600">
                  RS {totalAmount}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                id="confirm-purchase-btn"
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} />
                <span>Purchase Now</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
