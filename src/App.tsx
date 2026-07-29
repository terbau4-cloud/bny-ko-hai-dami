import React, { useState, useEffect } from 'react';
import { TabType, Game, Transaction, UserProfile, TopupProduct, AppBanner } from './types';
import { INITIAL_GAMES, INITIAL_TRANSACTIONS, INITIAL_PROFILE } from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { WalletTab } from './components/WalletTab';
import { HistoryTab } from './components/HistoryTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminTab } from './components/AdminTab';
import { TopupDetailPage } from './components/TopupDetailPage';
import { AuthModal } from './components/AuthModal';

import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Dynamic Banners and Team Members
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [banners, setBanners] = useState<AppBanner[]>([]);

  // Auth States
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Safety fallback for mobile devices to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecking(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    let unsubscribeTx: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeTx) {
        unsubscribeTx();
        unsubscribeTx = null;
      }

      setAuthUser(user);
      if (user) {
        // Fetch or sync user profile from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setProfile({
              uid: user.uid,
              name: data.fullName || user.displayName || 'BNY Gamer',
              email: data.email || user.email || '',
              whatsapp: data.whatsapp || '',
              avatar: '👤',
              level: 1,
              coins: 100,
              walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 0,
              totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
              totalGamesPlayed: 0,
              soundEnabled: true,
              themeColor: 'purple',
            });
          } else {
            // Create user profile if missing
            const initProf: UserProfile = {
              uid: user.uid,
              name: user.displayName || 'BNY Gamer',
              email: user.email || '',
              whatsapp: '',
              avatar: '👤',
              level: 1,
              coins: 100,
              walletBalance: 0,
              totalSpent: 0,
              totalGamesPlayed: 0,
              soundEnabled: true,
              themeColor: 'purple',
            };
            setProfile(initProf);
            await setDoc(userDocRef, {
              uid: user.uid,
              fullName: initProf.name,
              email: initProf.email,
              whatsapp: '',
              walletBalance: 0,
              totalSpent: 0,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error fetching user profile doc:', err);
        }

        // Listen to Firestore transactions for this user
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        unsubscribeTx = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const loadedTxs: Transaction[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                  id: docSnap.id,
                  orderId: data.orderId,
                  type: data.type || 'purchase',
                  amount: data.amount || 0,
                  date: data.date || 'Today',
                  time: data.time || '',
                  status: data.status || 'Pending',
                  description: data.description || '',
                  gameTitle: data.gameTitle,
                  gameIcon: data.gameIcon,
                  gameCoverImg: data.gameCoverImg,
                  productName: data.productName,
                  productPrice: data.productPrice,
                  quantity: data.quantity,
                  playerId: data.playerId,
                  userEmail: data.userEmail || '',
                  requirementsData: data.requirementsData || [],
                  screenshotUrl: data.screenshotUrl,
                };
              });
              setTransactions(loadedTxs);
            } else {
              setTransactions(INITIAL_TRANSACTIONS);
            }
          },
          (err) => {
            console.error('Firestore transactions snapshot error:', err);
          }
        );
      } else {
        setTransactions(INITIAL_TRANSACTIONS);
        setProfile(INITIAL_PROFILE);
      }
      setAuthChecking(false);
    });

    return () => {
      if (unsubscribeTx) unsubscribeTx();
      unsubscribeAuth();
    };
  }, []);

  // Listen for real-time updates to games collection in Firestore
  useEffect(() => {
    const qGames = query(collection(db, 'games'));
    const unsubscribeGames = onSnapshot(
      qGames,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedGames: Game[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Untitled Game',
              publisher: data.publisher || '',
              category: data.category || 'action',
              rating: data.rating || 4.8,
              icon: data.icon || '🎮',
              coverImg: data.coverImg || '',
              color: data.color || 'from-indigo-600 to-purple-600',
              bgGradient: data.bgGradient || 'bg-gradient-to-br from-indigo-600 to-purple-700',
              plays: data.plays || 100,
              description: data.description || '',
              gameType: data.gameType || 'balloon',
              products: data.products || [],
              requirements: data.requirements || [],
            };
          });
          setGames(loadedGames);

          // Update selected game if currently viewing detail page
          setSelectedGame((prev) => {
            if (!prev) return null;
            const updated = loadedGames.find((g) => g.id === prev.id);
            return updated || null;
          });
        }
      },
      (err) => {
        console.error('App live games listener error:', err);
      }
    );

    return () => unsubscribeGames();
  }, []);

  // Listen for team_members and banners
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'team_members'), (snap) => {
      const emails = snap.docs.map((d) => d.data().email).filter(Boolean);
      setTeamMembers(emails);
    });

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      const list: AppBanner[] = snap.docs.map((d) => ({
        id: d.id,
        imageUrl: d.data().imageUrl || '',
        redirectLink: d.data().redirectLink || '',
        createdAt: d.data().createdAt || '',
      }));
      setBanners(list);
    });

    return () => {
      unsubMembers();
      unsubBanners();
    };
  }, []);

  // Handle Auth Success from AuthModal
  const handleAuthSuccess = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setActiveTab('home');
  };

  // Handle Wallet Top-Up Deposit
  const handleAddTransaction = async (amount: number, screenshotUrl: string) => {
    const orderId = `BNY-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const userEmail = profile.email || authUser?.email || '';

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      orderId,
      type: 'deposit',
      amount,
      date: 'Just Now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending',
      description: 'Wallet Deposit',
      screenshotUrl,
      userEmail,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Firestore sync if user is logged in
    if (authUser) {
      try {
        await addDoc(collection(db, 'transactions'), {
          userId: authUser.uid,
          userEmail,
          orderId,
          type: 'deposit',
          amount,
          date: 'Just Now',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Pending',
          description: 'Wallet Deposit',
          screenshotUrl,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error adding deposit to Firestore:', err);
      }
    }
  };

  // Handle Top-Up Purchase Order
  const handlePurchaseOrder = async (orderData: {
    game: Game;
    product: TopupProduct;
    quantity: number;
    playerId: string;
    requirementsData?: { name: string; value: string }[];
    totalAmount: number;
    orderId: string;
  }) => {
    const { game, product, quantity, playerId, requirementsData, totalAmount, orderId } = orderData;
    const userEmail = profile.email || authUser?.email || '';

    const newOrderTx: Transaction = {
      id: `tx_order_${Date.now()}`,
      orderId,
      type: 'purchase',
      amount: totalAmount,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending',
      description: `${product.name} x ${quantity}`,
      gameId: game.id,
      gameTitle: game.title,
      gameIcon: game.icon,
      gameCoverImg: game.coverImg,
      productName: product.name,
      productPrice: product.price,
      quantity,
      playerId,
      userEmail,
      requirementsData,
    };

    setTransactions((prev) => [newOrderTx, ...prev]);

    const updatedBalance = Math.max(0, profile.walletBalance - totalAmount);
    const updatedSpent = (profile.totalSpent || 0) + totalAmount;

    setProfile((prev) => ({
      ...prev,
      walletBalance: updatedBalance,
      totalSpent: updatedSpent,
    }));

    // Firestore sync if user is logged in
    if (authUser) {
      try {
        await addDoc(collection(db, 'transactions'), {
          userId: authUser.uid,
          userEmail,
          orderId,
          type: 'purchase',
          amount: totalAmount,
          date: 'Today',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Pending',
          description: `${product.name} x ${quantity}`,
          gameId: game.id,
          gameTitle: game.title,
          gameIcon: game.icon,
          gameCoverImg: game.coverImg || '',
          productName: product.name,
          productPrice: product.price,
          quantity,
          playerId,
          requirementsData: requirementsData || [],
          createdAt: new Date().toISOString(),
        });

        const userDocRef = doc(db, 'users', authUser.uid);
        await updateDoc(userDocRef, {
          walletBalance: updatedBalance,
          totalSpent: updatedSpent,
        });
      } catch (err) {
        console.error('Error adding purchase order to Firestore:', err);
      }
    }

    // Clear selected game and go to history tab
    setSelectedGame(null);
    setActiveTab('history');
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  // If checking auth status
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 border border-slate-700 shadow-xl bg-slate-900 flex items-center justify-center animate-pulse">
          <img
            src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
            alt="BNY SHOP Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-black text-slate-200 tracking-wide">Loading BNY SHOP...</p>
      </div>
    );
  }

  // If user is not logged in, force AuthModal
  if (!authUser) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  // If a game is selected, show full TopupDetailPage instead of modal
  if (selectedGame) {
    return (
      <TopupDetailPage
        game={selectedGame}
        onBack={() => setSelectedGame(null)}
        onPurchase={handlePurchaseOrder}
        walletBalance={profile.walletBalance}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 antialiased">
      {/* Top Header Bar */}
      {activeTab !== 'admin' && (
        <Header
          profile={profile}
          onOpenWallet={() => setActiveTab('wallet')}
        />
      )}

      {/* Main Content Area */}
      <main className="px-4 py-5 max-w-3xl mx-auto">
        {activeTab === 'home' && (
          <HomeTab
            games={games}
            banners={banners}
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
            onSignOut={() => setAuthUser(null)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminTab
            adminEmail={profile.email || authUser?.email || 'bnyeshop@gmail.com'}
            teamMembers={teamMembers}
          />
        )}
      </main>

      {/* Bottom Navigation Tabs */}
      <BottomNav
        activeTab={activeTab}
        userEmail={profile.email || authUser?.email || ''}
        teamMembers={teamMembers}
        onSelectTab={(tab) => {
          setSelectedGame(null);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}



