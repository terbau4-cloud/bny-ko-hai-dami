import React, { useState, useEffect } from 'react';
import { TabType, Game, Transaction, UserProfile, TopupProduct, AppBanner, Category } from './types';
import { INITIAL_GAMES, INITIAL_TRANSACTIONS, INITIAL_PROFILE, INITIAL_CATEGORIES, INITIAL_BANNERS } from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { WalletTab } from './components/WalletTab';
import { HistoryTab } from './components/HistoryTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminTab } from './components/AdminTab';
import { TopupDetailPage } from './components/TopupDetailPage';
import { AuthModal } from './components/AuthModal';
import { InstallPwaModal } from './components/InstallPwaModal';

import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
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
  const [games, setGames] = useState<Game[]>(() => {
    try {
      const cached = localStorage.getItem('bny_games');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isGamesLoading, setIsGamesLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('bny_games');
      return !cached;
    } catch {
      return true;
    }
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem('bny_transactions');
      return cached ? JSON.parse(cached) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Dynamic Banners, Categories and Team Members
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [banners, setBanners] = useState<AppBanner[]>(() => {
    try {
      const cached = localStorage.getItem('bny_banners');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('bny_categories');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Auth States
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Minimum initial loading screen time when app opens
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecking(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);


  // Listen for Firebase Auth state changes & real-time user profile
  useEffect(() => {
    let unsubscribeTx: (() => void) | null = null;
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (unsubscribeTx) {
          unsubscribeTx();
          unsubscribeTx = null;
        }
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        setAuthUser(user);
        setAuthChecking(false);

        if (user) {
          // Subscribe to user profile document in Firestore in real-time
          const userDocRef = doc(db, 'users', user.uid);
          unsubscribeUserDoc = onSnapshot(
            userDocRef,
            async (userSnap) => {
              if (userSnap.exists() && userSnap.data()?.isDeleted === true) {
                signOut(auth).catch(() => {});
                setAuthUser(null);
                setProfile(INITIAL_PROFILE);
                alert('Your account has been deleted by Admin. You have been logged out.');
                return;
              }

              if (!userSnap.exists()) {
                // Document does not exist in Firestore yet: auto-create it so user appears in admin list
                try {
                  await setDoc(userDocRef, {
                    uid: user.uid,
                    fullName: user.displayName || user.email?.split('@')[0] || 'BNY Gamer',
                    email: user.email || '',
                    whatsapp: '',
                    walletBalance: 0,
                    totalSpent: 0,
                    createdAt: new Date().toISOString(),
                  }, { merge: true });
                } catch (err) {
                  console.warn('Auto create user doc error:', err);
                }
                return;
              }

              const data = userSnap.data();
              setProfile({
                uid: user.uid,
                name: data.fullName || data.name || user.displayName || 'BNY Gamer',
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
                blocked: !!data.blocked,
              });
            },
            (err) => {
              console.warn('User doc snapshot warning:', err?.message || err);
              setProfile((prev) => ({
                ...prev,
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Gamer User',
                email: user.email || '',
              }));
            }
          );

          // Listen to Firestore transactions for this user
          const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
          unsubscribeTx = onSnapshot(
            q,
            (snapshot) => {
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
                  paymentQrTitle: data.paymentQrTitle || data.paymentMethod || '',
                  requirementsData: data.requirementsData || [],
                  screenshotUrl: data.screenshotUrl,
                  transactionCode: data.transactionCode || '',
                  createdAt: data.createdAt || '',
                };
              });

              loadedTxs.sort((a, b) => {
                const getTime = (tx: Transaction) => {
                  if (tx.createdAt) {
                    const t = new Date(tx.createdAt).getTime();
                    if (!isNaN(t) && t > 0) return t;
                  }
                  if (tx.id && tx.id.startsWith('tx_')) {
                    const num = Number(tx.id.replace('tx_order_', '').replace('tx_', ''));
                    if (!isNaN(num) && num > 0) return num;
                  }
                  return 0;
                };
                return getTime(b) - getTime(a);
              });

              setTransactions(loadedTxs);
              try { localStorage.setItem('bny_transactions', JSON.stringify(loadedTxs)); } catch {}
            },
            (err) => {
              console.warn('Firestore transactions snapshot warning:', err?.message || err);
            }
          );
        } else {
          setProfile(INITIAL_PROFILE);
        }
        setAuthChecking(false);
      },
      (err) => {
        console.warn('Auth state listener error:', err?.message || err);
        setAuthChecking(false);
      }
    );

    return () => {
      if (unsubscribeTx) unsubscribeTx();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      unsubscribeAuth();
    };
  }, []);

  // Listen for real-time updates to games collection in Firestore
  useEffect(() => {
    const qGames = query(collection(db, 'games'));
    const unsubscribeGames = onSnapshot(
      qGames,
      (snapshot) => {
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
            products: Array.isArray(data.products)
              ? data.products.map((p: any, idx: number) => ({
                  id: p.id || `prod_${idx}`,
                  name: p.name || 'Package',
                  price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
                }))
              : [],
            requirements: Array.isArray(data.requirements) ? data.requirements : [],
          };
        });
        setGames(loadedGames);
        try {
          localStorage.setItem('bny_games', JSON.stringify(loadedGames));
        } catch {}

        // Update selected game if currently viewing detail page
        setSelectedGame((prev) => {
          if (!prev) return null;
          const updated = loadedGames.find((g) => g.id === prev.id);
          return updated || prev;
        });

        setIsGamesLoading(false);
      },
      (err) => {
        console.warn('App live games listener warning:', err?.message || err);
        setIsGamesLoading(false);
      }
    );

    return () => unsubscribeGames();
  }, []);

  // Listen for team_members, banners and categories
  useEffect(() => {
    const unsubMembers = onSnapshot(
      collection(db, 'team_members'),
      (snap) => {
        const emails = snap.docs.map((d) => d.data().email).filter(Boolean);
        setTeamMembers(emails);
      },
      (err) => {
        console.warn('Firestore team_members snapshot warning:', err?.message || err);
      }
    );

    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        const list: AppBanner[] = snap.docs.map((d) => ({
          id: d.id,
          imageUrl: d.data().imageUrl || '',
          redirectLink: d.data().redirectLink || '',
          createdAt: d.data().createdAt || '',
        }));
        setBanners(list);
        try { localStorage.setItem('bny_banners', JSON.stringify(list)); } catch {}
      },
      (err) => {
        console.warn('Firestore banners snapshot warning:', err?.message || err);
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || '',
          createdAt: d.data().createdAt || '',
        }));
        setCategories(list);
        try { localStorage.setItem('bny_categories', JSON.stringify(list)); } catch {}
      },
      (err) => {
        console.warn('Firestore categories snapshot warning:', err?.message || err);
      }
    );

    return () => {
      unsubMembers();
      unsubBanners();
      unsubCategories();
    };
  }, []);

  // Handle Auth Success from AuthModal
  const handleAuthSuccess = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setActiveTab('home');
  };

  // Handle Wallet Top-Up Deposit
  const handleAddTransaction = async (amount: number, transactionCode: string, paymentQrTitle?: string) => {
    if (profile.blocked) {
      alert('You have been blocked by Admin. You cannot submit deposit requests.');
      return;
    }

    const orderId = `BNY-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const userEmail = profile.email || authUser?.email || '';
    const qrTitle = (paymentQrTitle && paymentQrTitle.trim().toLowerCase() !== 'payment qr') ? paymentQrTitle.trim() : 'eSewa QR';
    const cleanTxCode = transactionCode.trim();

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      orderId,
      type: 'deposit',
      amount,
      date: 'Just Now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending',
      description: `Wallet Deposit (${qrTitle})`,
      paymentQrTitle: qrTitle,
      transactionCode: cleanTxCode,
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
          description: `Wallet Deposit (${qrTitle})`,
          paymentQrTitle: qrTitle,
          transactionCode: cleanTxCode,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Error adding deposit to Firestore:', err);
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
    if (profile.blocked) {
      alert('You have been blocked by Admin. You cannot place orders.');
      return;
    }

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
        console.warn('Error adding purchase order to Firestore:', err);
      }
    }

    // Clear selected game and go to history tab
    setSelectedGame(null);
    setActiveTab('history');
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
    if (authUser) {
      try {
        const userRef = doc(db, 'users', authUser.uid);
        const dataToUpdate: any = { ...updated };
        if (updated.name) {
          dataToUpdate.fullName = updated.name;
        }
        await setDoc(userRef, dataToUpdate, { merge: true });
      } catch (err) {
        console.warn('Error updating profile in Firestore:', err);
      }
    }
  };

  // If checking auth status
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 border border-slate-700 shadow-xl bg-slate-900 flex items-center justify-center animate-pulse relative">
          <img
            src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
            alt="BNY SHOP Logo"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.app-logo-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
            className="w-full h-full object-cover"
          />
          <div className="app-logo-fallback hidden w-full h-full flex-col items-center justify-center bg-indigo-600 text-white font-black text-xs leading-none">
            <span>BNY</span>
          </div>
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
        isBlocked={!!profile.blocked}
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
            categories={categories}
            isLoading={isGamesLoading}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            onAddTransaction={handleAddTransaction}
            currentBalance={profile.walletBalance}
            isBlocked={!!profile.blocked}
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

      {/* PWA Install Prompt Popup */}
      <InstallPwaModal />
    </div>
  );
}



