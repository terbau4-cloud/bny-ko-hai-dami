import React from 'react';
import { UserProfile } from '../types';
import { Gamepad2, Wallet } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onOpenWallet: () => void;
}

export const Header: React.FC<Props> = ({ profile, onOpenWallet }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-xs">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Gamepad2 size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Game TopUp <span className="text-indigo-600">Center</span>
          </h1>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-3">
          {/* Wallet Balance Pill */}
          <button
            onClick={onOpenWallet}
            id="header-wallet-btn"
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Wallet size={15} />
            <span>RS {profile.walletBalance}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
