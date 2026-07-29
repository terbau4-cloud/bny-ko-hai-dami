import React, { useState } from 'react';
import { TabType, Game, Transaction, UserProfile, TopupProduct } from './types';
import { INITIAL_GAMES, INITIAL_TRANSACTIONS, INITIAL_PROFILE } from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { WalletTab } from './components/WalletTab';
import { HistoryTab } from './components/HistoryTab';
import { ProfileTab } from './components/ProfileTab';
import { TopupDetailModal } from './components/TopupDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Handle Wallet Top-Up Deposit
  const handleAddTransaction = (amount: number, screenshotUrl: string) => {
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      orderId: `BNY-${Math.floor(10000000 + Math.random() * 90000000)}`,
      type: 'deposit',
      amount,
      date: 'Just Now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Approved',
      description: 'Wallet Deposit via QR Payment',
      screenshotUrl,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setProfile((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance + amount,
    }));
  };

  // Handle Top-Up Purchase Order
  const handlePurchaseOrder = (orderData: {
    game: Game;
    product: TopupProduct;
    quantity: number;
    playerId: string;
    totalAmount: number;
    orderId: string;
  }) => {
    const { game, product, quantity, playerId, totalAmount, orderId } = orderData;

    const newOrderTx: Transaction = {
      id: `tx_order_${Date.now()}`,
      orderId, // e.g. BNY-84920183
      type: 'purchase',
      amount: totalAmount,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending',
      description: `${product.name} x ${quantity}`,
      gameTitle: game.title,
      gameIcon: game.icon,
      gameCoverImg: game.coverImg,
      productName: product.name,
      productPrice: product.price,
      quantity,
      playerId,
    };

    setTransactions((prev) => [newOrderTx, ...prev]);

    // Deduct total price from wallet & add to totalSpent
    setProfile((prev) => ({
      ...prev,
      walletBalance: Math.max(0, prev.walletBalance - totalAmount),
      totalSpent: prev.totalSpent + totalAmount,
    }));

    // Return to home tab
    setActiveTab('home');
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 antialiased">
      {/* Top Header Bar */}
      <Header
        profile={profile}
        onOpenWallet={() => setActiveTab('wallet')}
      />

      {/* Main Content Area */}
      <main className="px-4 py-5 max-w-3xl mx-auto">
        {activeTab === 'home' && (
          <HomeTab
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            onAddTransaction={handleAddTransaction}
            currentBalance={profile.walletBalance}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab transactions={transactions} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Interactive Game Top-Up Detail Modal */}
      <TopupDetailModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onPurchase={handlePurchaseOrder}
        walletBalance={profile.walletBalance}
      />

      {/* Bottom 4 Navigation Tabs */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}

