import React from 'react';
import { UserProfile } from '../types';
import { Wallet, CreditCard, Mail, User } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const ProfileTab: React.FC<Props> = ({ profile }) => {
  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
        {/* Circle Avatar / Logo */}
        <div className="w-28 h-28 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md border-4 border-indigo-100">
          <User size={56} className="stroke-[2.5]" />
        </div>

        {/* Name */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
          
          {/* Email */}
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 mt-1">
            <Mail size={15} className="text-slate-400" />
            <span>{profile.email || 'mandipmahato717@gmail.com'}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards: Wallet Balance & Total Spent */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wallet Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <Wallet size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Wallet Balance</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              RS {profile.walletBalance}
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Spent</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              RS {profile.totalSpent || 1200}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

