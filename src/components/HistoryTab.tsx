import React, { useState } from 'react';
import { Transaction } from '../types';
import { History, Copy, Check, ArrowDownLeft, Clock, CheckCircle2, XCircle, Gamepad2 } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

export const HistoryTab: React.FC<Props> = ({ transactions }) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Sort transactions so Pending orders are always at the top
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return 0;
  });

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      {/* Header Card */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <History size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Order & Activity History</h2>
            <p className="text-xs text-slate-500 font-medium">All game topups & wallet history</p>
          </div>
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3.5">
        {sortedTransactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 space-y-2 border border-slate-200 shadow-sm">
            <History size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-base text-slate-700">No history found</p>
            <p className="text-xs">Your top up orders and wallet deposits will appear here.</p>
          </div>
        ) : (
          sortedTransactions.map((tx) => {
            const isPurchase = tx.type === 'purchase' || tx.gameTitle;
            const displayOrderId = tx.orderId || `BNY-${Math.floor(10000000 + Math.random() * 90000000)}`;

            return (
              <div
                key={tx.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-indigo-200 transition-all space-y-3"
              >
                {/* Top Row: Game info & Order ID + Copy */}
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Game Logo / Icon & Game Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 flex items-center justify-center text-2xl">
                      {tx.gameCoverImg ? (
                        <img
                          src={tx.gameCoverImg}
                          alt={tx.gameTitle || 'Game'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : tx.gameIcon ? (
                        <span>{tx.gameIcon}</span>
                      ) : (
                        <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <ArrowDownLeft size={22} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {tx.gameTitle || tx.description}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {tx.date} • {tx.time}
                      </p>
                    </div>
                  </div>

                  {/* Right Top: Order ID & Copy button */}
                  <div className="flex flex-col items-end shrink-0 space-y-1">
                    {tx.orderId ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800">
                        <span>{tx.orderId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(tx.orderId!)}
                          id={`copy-order-${tx.id}`}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === tx.orderId ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-500">
                        <span>{displayOrderId}</span>
                      </div>
                    )}

                    {/* Status Badge below Order ID */}
                    <div>
                      {tx.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                      {(tx.status === 'Completed' || tx.status === 'Approved') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      )}
                      {tx.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Product details for Game Purchases */}
                {isPurchase && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">
                        Product: <span className="text-indigo-600">{tx.productName || tx.description}</span>
                        {tx.quantity && tx.quantity > 1 ? ` (x${tx.quantity})` : ''}
                      </div>
                    </div>

                    <div className="font-black text-sm text-slate-900">
                      RS {tx.amount}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
