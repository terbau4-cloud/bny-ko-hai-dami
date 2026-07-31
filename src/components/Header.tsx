import React from 'react';
import { UserProfile } from '../types';
import { Wallet } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onOpenWallet: () => void;
}

export const Header: React.FC<Props> = ({ profile, onOpenWallet }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* BNY SHOP Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shrink-0 flex items-center justify-center relative group">
            <img
              src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
              alt="BNY SHOP Logo"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }
              }}
              className="w-full h-full object-cover"
            />
            <div className="logo-fallback hidden w-full h-full flex-col items-center justify-center bg-indigo-600 text-white font-black text-xs leading-none">
              <span>BNY</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
              BNY <span className="text-[#FE202D]">SHOP</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              Topup Center Nepal
            </p>
          </div>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-3">
          {/* Wallet Balance Pill */}
          <button
            onClick={onOpenWallet}
            id="header-wallet-btn"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Wallet size={15} />
            <span>RS {profile.walletBalance}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

