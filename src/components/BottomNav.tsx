import React from 'react';
import { TabType } from '../types';
import { Home, Wallet, History, User, ShieldCheck } from 'lucide-react';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  userEmail?: string;
  teamMembers?: string[];
}

export const BottomNav: React.FC<Props> = ({ activeTab, onSelectTab, userEmail, teamMembers = [] }) => {
  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const isMasterAdmin = normalizedEmail === 'bnyeshop@gmail.com';
  const isTeamMember = teamMembers.some((m) => m.toLowerCase().trim() === normalizedEmail);
  const isAdmin = isMasterAdmin || isTeamMember;

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'wallet' as TabType, label: 'Wallet', icon: Wallet },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin' as TabType, label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 h-20 flex items-center justify-around px-3 sm:px-12 shadow-lg">
      <div className="max-w-md w-full mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              id={`nav-tab-${tab.id}`}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isActive ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-500'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              </div>
              <span className={`text-[11px] ${isActive ? 'font-black' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
