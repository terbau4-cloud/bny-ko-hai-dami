import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Users,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  Wallet,
  Sliders,
  AlertCircle,
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ListChecks,
  Package,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, Game, GameRequirement, TopupProduct } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query
} from 'firebase/firestore';
import { INITIAL_GAMES } from '../data/initialData';

interface Props {
  adminEmail: string;
}

export const AdminTab: React.FC<Props> = ({ adminEmail }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'pending' | 'users' | 'orders' | 'games'>('overview');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [gamesList, setGamesList] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Selected Game for Drill-Down (Requirements & Products view)
  const [selectedAdminGame, setSelectedAdminGame] = useState<Game | null>(null);

  // Balance adjustment modal
  const [adjustingUser, setAdjustingUser] = useState<UserProfile | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [adjustSuccess, setAdjustSuccess] = useState<string>('');

  // Game Modal States (Add / Edit Game)
  const [isGameModalOpen, setIsGameModalOpen] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameTitleInput, setGameTitleInput] = useState<string>('');
  const [gameLogoInput, setGameLogoInput] = useState<string>('');

  // Requirement Modal States
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState<boolean>(false);
  const [editingRequirement, setEditingRequirement] = useState<GameRequirement | null>(null);
  const [reqNameInput, setReqNameInput] = useState<string>('');
  const [reqTypeInput, setReqTypeInput] = useState<'number' | 'text'>('number');

  // Product Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<TopupProduct | null>(null);
  const [prodNameInput, setProdNameInput] = useState<string>('');
  const [prodPriceInput, setProdPriceInput] = useState<string>('');

  // Fetch Firestore users, transactions & games
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = usersSnap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          name: data.fullName || data.name || 'Gamer User',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          avatar: '👤',
          level: 1,
          coins: 100,
          walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 0,
          totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
          totalGamesPlayed: 0,
          soundEnabled: true,
          themeColor: 'purple',
        };
      });
      setUsersList(fetchedUsers);

      // Fetch Transactions
      const txSnap = await getDocs(collection(db, 'transactions'));
      const fetchedTxs: Transaction[] = txSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          orderId: data.orderId || d.id.substring(0, 10),
          type: data.type || 'purchase',
          amount: data.amount || 0,
          date: data.date || 'Today',
          time: data.time || '',
          status: data.status || 'Pending',
          description: data.description || '',
          gameTitle: data.gameTitle,
          gameIcon: data.gameIcon,
          productName: data.productName,
          quantity: data.quantity,
          playerId: data.playerId,
          screenshotUrl: data.screenshotUrl,
        };
      });
      setTransactionsList(fetchedTxs);

      // Fetch Games
      const gamesSnap = await getDocs(collection(db, 'games'));
      if (!gamesSnap.empty) {
        const fetchedGames: Game[] = gamesSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
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
        setGamesList(fetchedGames);
      } else {
        // Seed Firestore with INITIAL_GAMES if empty
        for (const g of INITIAL_GAMES) {
          await setDoc(doc(db, 'games', g.id), {
            title: g.title,
            publisher: g.publisher || '',
            category: g.category || 'action',
            rating: g.rating || 4.8,
            icon: g.icon || '🎮',
            coverImg: g.coverImg || '',
            color: g.color || 'from-indigo-600 to-purple-600',
            bgGradient: g.bgGradient || 'bg-gradient-to-br from-indigo-600 to-purple-700',
            plays: g.plays || 100,
            description: g.description || '',
            gameType: g.gameType || 'balloon',
            products: g.products || [],
            requirements: g.requirements || [],
          });
        }
        setGamesList(INITIAL_GAMES);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for live updates on transactions
    const qTx = query(collection(db, 'transactions'));
    const unsubscribeTx = onSnapshot(
      qTx,
      (snapshot) => {
        const updatedTxs: Transaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            orderId: data.orderId || d.id.substring(0, 10),
            type: data.type || 'purchase',
            amount: data.amount || 0,
            date: data.date || 'Today',
            time: data.time || '',
            status: data.status || 'Pending',
            description: data.description || '',
            gameTitle: data.gameTitle,
            gameIcon: data.gameIcon,
            productName: data.productName,
            quantity: data.quantity,
            playerId: data.playerId,
            screenshotUrl: data.screenshotUrl,
          };
        });
        setTransactionsList(updatedTxs);
      },
      (err) => console.error('Admin live tx error:', err)
    );

    // Listen for live updates on games
    const qGames = query(collection(db, 'games'));
    const unsubscribeGames = onSnapshot(
      qGames,
      (snapshot) => {
        if (!snapshot.empty) {
          const updatedGames: Game[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
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
          setGamesList(updatedGames);

          // Update selectedAdminGame if it's currently selected
          setSelectedAdminGame((prev) => {
            if (!prev) return null;
            const updated = updatedGames.find((g) => g.id === prev.id);
            return updated || null;
          });
        }
      },
      (err) => console.error('Admin live games error:', err)
    );

    return () => {
      unsubscribeTx();
      unsubscribeGames();
    };
  }, []);

  // Filtered stats
  const totalUsersCount = usersList.length;
  const totalOrdersCount = transactionsList.length;
  const pendingOrdersList = transactionsList.filter((t) => t.status === 'Pending');
  const pendingOrdersCount = pendingOrdersList.length;

  // Handle Approve Order
  const handleApproveOrder = async (tx: Transaction) => {
    try {
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, { status: 'Approved' });

      setTransactionsList((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, status: 'Approved' } : item))
      );

      // If deposit, credit user wallet
      if (tx.type === 'deposit') {
        const usersSnap = await getDocs(collection(db, 'users'));
        const targetUserDoc = usersSnap.docs.find(
          (d) => d.data().email?.toLowerCase() === adminEmail.toLowerCase() || d.id
        );
        if (targetUserDoc) {
          const currentBal = targetUserDoc.data().walletBalance || 0;
          await updateDoc(doc(db, 'users', targetUserDoc.id), {
            walletBalance: currentBal + tx.amount,
          });
        }
      }
    } catch (err) {
      console.error('Error approving order:', err);
    }
  };

  // Handle Reject Order
  const handleRejectOrder = async (txId: string) => {
    try {
      const txRef = doc(db, 'transactions', txId);
      await updateDoc(txRef, { status: 'Rejected' });

      setTransactionsList((prev) =>
        prev.map((item) => (item.id === txId ? { ...item, status: 'Rejected' } : item))
      );
    } catch (err) {
      console.error('Error rejecting order:', err);
    }
  };

  // Handle Update User Balance
  const handleSaveUserBalance = async () => {
    if (!adjustingUser || !adjustingUser.uid) return;
    const num = parseFloat(newBalanceInput);
    if (isNaN(num)) return;

    try {
      const userRef = doc(db, 'users', adjustingUser.uid);
      await updateDoc(userRef, { walletBalance: num });

      setUsersList((prev) =>
        prev.map((u) => (u.uid === adjustingUser.uid ? { ...u, walletBalance: num } : u))
      );

      setAdjustSuccess(`Balance for ${adjustingUser.name} updated to RS ${num}!`);
      setTimeout(() => {
        setAdjustSuccess('');
        setAdjustingUser(null);
      }, 1500);
    } catch (err) {
      console.error('Error updating user balance:', err);
    }
  };

  // ================= GAME CRUD HANDLERS =================
  const handleSaveGame = async () => {
    if (!gameTitleInput.trim()) return;

    try {
      if (editingGame) {
        // Edit existing game
        const updatedDoc: Partial<Game> = {
          title: gameTitleInput.trim(),
          coverImg: gameLogoInput.trim(),
        };
        await updateDoc(doc(db, 'games', editingGame.id), updatedDoc);
      } else {
        // Add new game
        const newId = `game_${Date.now()}`;
        const newGameData: Game = {
          id: newId,
          title: gameTitleInput.trim(),
          coverImg: gameLogoInput.trim(),
          icon: '🎮',
          category: 'action',
          rating: 4.8,
          color: 'from-indigo-600 to-purple-600',
          bgGradient: 'bg-gradient-to-br from-indigo-600 to-purple-700',
          plays: 100,
          description: 'Top up game credits instantly on BNY SHOP.',
          gameType: 'balloon',
          products: [
            { id: `prod_1`, name: '100 Credits', price: 150 }
          ],
          requirements: []
        };
        await setDoc(doc(db, 'games', newId), newGameData);
      }

      setIsGameModalOpen(false);
      setEditingGame(null);
      setGameTitleInput('');
      setGameLogoInput('');
    } catch (err) {
      console.error('Error saving game:', err);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      await deleteDoc(doc(db, 'games', gameId));
      if (selectedAdminGame?.id === gameId) {
        setSelectedAdminGame(null);
      }
    } catch (err) {
      console.error('Error deleting game:', err);
    }
  };

  // ================= REQUIREMENT CRUD HANDLERS =================
  const handleSaveRequirement = async () => {
    if (!selectedAdminGame || !reqNameInput.trim()) return;

    const currentReqs = selectedAdminGame.requirements || [];
    let updatedReqs: GameRequirement[] = [];

    if (editingRequirement) {
      updatedReqs = currentReqs.map((r) =>
        r.id === editingRequirement.id
          ? { ...r, name: reqNameInput.trim(), type: reqTypeInput }
          : r
      );
    } else {
      const newReq: GameRequirement = {
        id: `req_${Date.now()}`,
        name: reqNameInput.trim(),
        type: reqTypeInput,
      };
      updatedReqs = [...currentReqs, newReq];
    }

    try {
      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        requirements: updatedReqs,
      });

      setSelectedAdminGame((prev) => (prev ? { ...prev, requirements: updatedReqs } : null));
      setIsRequirementModalOpen(false);
      setEditingRequirement(null);
      setReqNameInput('');
      setReqTypeInput('number');
    } catch (err) {
      console.error('Error saving requirement:', err);
    }
  };

  const handleDeleteRequirement = async (reqId: string) => {
    if (!selectedAdminGame) return;
    const currentReqs = selectedAdminGame.requirements || [];
    const updatedReqs = currentReqs.filter((r) => r.id !== reqId);

    try {
      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        requirements: updatedReqs,
      });
      setSelectedAdminGame((prev) => (prev ? { ...prev, requirements: updatedReqs } : null));
    } catch (err) {
      console.error('Error deleting requirement:', err);
    }
  };

  // ================= PRODUCT CRUD HANDLERS =================
  const handleSaveProduct = async () => {
    if (!selectedAdminGame || !prodNameInput.trim() || !prodPriceInput.trim()) return;
    const priceNum = parseFloat(prodPriceInput);
    if (isNaN(priceNum)) return;

    const currentProds = selectedAdminGame.products || [];
    let updatedProds: TopupProduct[] = [];

    if (editingProduct) {
      updatedProds = currentProds.map((p) =>
        p.id === editingProduct.id
          ? { ...p, name: prodNameInput.trim(), price: priceNum }
          : p
      );
    } else {
      const newProd: TopupProduct = {
        id: `prod_${Date.now()}`,
        name: prodNameInput.trim(),
        price: priceNum,
      };
      updatedProds = [...currentProds, newProd];
    }

    try {
      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        products: updatedProds,
      });

      setSelectedAdminGame((prev) => (prev ? { ...prev, products: updatedProds } : null));
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProdNameInput('');
      setProdPriceInput('');
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!selectedAdminGame) return;
    const currentProds = selectedAdminGame.products || [];
    const updatedProds = currentProds.filter((p) => p.id !== prodId);

    try {
      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        products: updatedProds,
      });
      setSelectedAdminGame((prev) => (prev ? { ...prev, products: updatedProds } : null));
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Clean White Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 3-Line Hamburger Menu Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              id="admin-hamburger-btn"
              className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer border border-indigo-100 flex items-center justify-center shadow-2xs"
              aria-label="Open Admin Menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  BNY <span className="text-indigo-600">ADMIN</span>
                </h1>
                <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Master
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Dashboard & Management Panel
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            id="admin-refresh-btn"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Slide-over Drawer / Side Navigation */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-slate-200 z-50 p-6 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-200 bg-indigo-50">
                      <img
                        src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
                        alt="BNY Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900 text-base">BNY SHOP</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Admin Controls
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveSection('overview');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-overview"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'overview'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Sliders size={18} />
                    <span>Dashboard Overview</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('pending');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-pending"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'pending'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={18} />
                      <span>Pending Orders</span>
                    </div>
                    {pendingOrdersCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('orders');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-orders"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'orders'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag size={18} />
                      <span>All Orders</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{totalOrdersCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('users');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-users"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'users'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users size={18} />
                      <span>Total Users</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{totalUsersCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('games');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-games"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'games'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gamepad2 size={18} />
                      <span>Games Management</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{gamesList.length}</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Logged in Admin:</p>
                <p className="font-mono text-indigo-600 truncate">{adminEmail}</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top 3 Quick Stat Cards - Only visible on Overview */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setActiveSection('users');
                setSelectedAdminGame(null);
              }}
              className="p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  Total Users
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{totalUsersCount}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Registered gaming profiles
              </p>
            </div>

            <div
              onClick={() => {
                setActiveSection('orders');
                setSelectedAdminGame(null);
              }}
              className="p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600">
                  Total Orders
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{totalOrdersCount}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                All topups & deposits recorded
              </p>
            </div>

            <div
              onClick={() => {
                setActiveSection('pending');
                setSelectedAdminGame(null);
              }}
              className="p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                  <Clock size={14} /> Pending Orders
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600 flex items-center gap-2">
                <span>{pendingOrdersCount}</span>
                {pendingOrdersCount > 0 && (
                  <span className="text-xs font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-700/80 font-semibold mt-1">
                Awaiting admin approval
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1: PENDING ORDERS */}
        {(activeSection === 'overview' || activeSection === 'pending') && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Pending Orders</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Review player topup requests & payment receipts
                  </p>
                </div>
              </div>

              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black px-3 py-1 rounded-full">
                {pendingOrdersCount} Pending
              </span>
            </div>

            {pendingOrdersList.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-slate-400">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
                <p className="font-extrabold text-slate-700 text-sm">No Pending Orders!</p>
                <p className="text-xs text-slate-400">
                  All customer recharge requests have been processed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrdersList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {tx.orderId || 'ORDER'}
                        </span>
                        <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Pending
                        </span>
                        <span className="text-xs font-bold text-slate-400">{tx.time}</span>
                      </div>

                      <div className="text-base font-black text-slate-900">{tx.description}</div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        {tx.playerId && (
                          <span className="bg-white px-2.5 py-1 rounded font-mono font-bold text-slate-700 border border-slate-200 shadow-2xs">
                            Player ID: {tx.playerId}
                          </span>
                        )}
                        <span className="font-black text-emerald-600 text-sm">
                          RS {tx.amount}
                        </span>
                      </div>
                    </div>

                    {tx.screenshotUrl && (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshot(tx.screenshotUrl || null)}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <button
                        onClick={() => handleApproveOrder(tx)}
                        id={`approve-order-${tx.id}`}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleRejectOrder(tx.id)}
                        id={`reject-order-${tx.id}`}
                        className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs px-3.5 py-2.5 rounded-xl border border-rose-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: TOTAL USERS */}
        {(activeSection === 'overview' || activeSection === 'users') && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Registered Users</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage player accounts & wallet balances
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user name or email..."
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl outline-none focus:border-indigo-600 focus:bg-white w-full sm:w-60 shadow-2xs"
                />
              </div>
            </div>

            {usersList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">
                No users found in system.
              </div>
            ) : (
              <div className="space-y-3">
                {usersList
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((usr) => (
                    <div
                      key={usr.uid || usr.email}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{usr.name}</span>
                          {usr.email.toLowerCase() === adminEmail.toLowerCase() && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-200">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{usr.email}</p>
                        {usr.whatsapp && (
                          <p className="text-[11px] text-emerald-600 font-bold">
                            WhatsApp: {usr.whatsapp}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Wallet Balance
                          </span>
                          <span className="font-black text-emerald-600 text-base">
                            RS {usr.walletBalance}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setAdjustingUser(usr);
                            setNewBalanceInput(usr.walletBalance.toString());
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Wallet size={14} />
                          <span>Set Balance</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: ALL ORDERS */}
        {activeSection === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">All System Orders</h3>
                  <p className="text-xs text-slate-500">History of all transactions</p>
                </div>
              </div>
            </div>

            {transactionsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {transactionsList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">
                          {tx.orderId || 'ORD'}
                        </span>
                        <span
                          className={`font-black px-2.5 py-0.5 rounded-full text-[10px] ${
                            tx.status === 'Approved' || tx.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{tx.description}</p>
                      {tx.playerId && (
                        <p className="text-slate-500 font-mono">ID: {tx.playerId}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-600 text-sm block">
                        RS {tx.amount}
                      </span>
                      <span className="text-slate-400 text-[10px] font-semibold">{tx.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: GAMES MANAGEMENT (when selectedAdminGame is null) */}
        {activeSection === 'games' && !selectedAdminGame && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Games Management</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Add new games, configure requirements & recharge packages
                  </p>
                </div>
              </div>

              {/* Add Game Button */}
              <button
                onClick={() => {
                  setEditingGame(null);
                  setGameTitleInput('');
                  setGameLogoInput('');
                  setIsGameModalOpen(true);
                }}
                id="add-game-btn"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Add Game</span>
              </button>
            </div>

            {/* List of Available Games */}
            {gamesList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-sm">
                No games available. Click "+ Add Game" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gamesList.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between gap-3 hover:border-slate-300 transition-all shadow-2xs group"
                  >
                    {/* Game Name & Logo -> Click opens drill-down detail view */}
                    <div
                      onClick={() => setSelectedAdminGame(game)}
                      className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                      id={`admin-game-card-${game.id}`}
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        {game.coverImg ? (
                          <img
                            src={game.coverImg}
                            alt={game.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{game.icon || '🎮'}</span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base truncate group-hover:text-indigo-600 transition-colors">
                          {game.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                          <span>{game.products?.length || 0} Products</span>
                          <span>•</span>
                          <span>{game.requirements?.length || 0} Requirements</span>
                        </div>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingGame(game);
                          setGameTitleInput(game.title);
                          setGameLogoInput(game.coverImg || '');
                          setIsGameModalOpen(true);
                        }}
                        id={`edit-game-${game.id}`}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="Edit Game"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        id={`delete-game-${game.id}`}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="Delete Game"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={() => setSelectedAdminGame(game)}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: GAME DRILL-DOWN DETAIL PAGE (Requirements & Products management) */}
        {selectedAdminGame && (
          <div className="space-y-6">
            {/* Top Navigation Bar for Game Detail */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedAdminGame(null)}
                  id="back-to-games-btn"
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Games</span>
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {selectedAdminGame.coverImg ? (
                      <img
                        src={selectedAdminGame.coverImg}
                        alt={selectedAdminGame.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{selectedAdminGame.icon || '🎮'}</span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 truncate">
                    {selectedAdminGame.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* REQUIREMENTS SECTION */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <ListChecks size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Game Requirements</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Player inputs needed for recharge (e.g. Player ID, Server ID)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingRequirement(null);
                    setReqNameInput('');
                    setReqTypeInput('number');
                    setIsRequirementModalOpen(true);
                  }}
                  id="add-requirement-btn"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                >
                  <Plus size={15} />
                  <span>Add Requirement</span>
                </button>
              </div>

              {/* Available Requirements List */}
              {(!selectedAdminGame.requirements || selectedAdminGame.requirements.length === 0) ? (
                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                  No requirements set. Default is "Player ID". Click "+ Add Requirement" to customize.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedAdminGame.requirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-sm">{req.name}</span>
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                          Type: {req.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRequirement(req);
                            setReqNameInput(req.name);
                            setReqTypeInput(req.type);
                            setIsRequirementModalOpen(true);
                          }}
                          className="p-1.5 bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                          title="Edit Requirement"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequirement(req.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer"
                          title="Delete Requirement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCTS SECTION */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Recharge Packages / Products</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Packages available for users to purchase
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProdNameInput('');
                    setProdPriceInput('');
                    setIsProductModalOpen(true);
                  }}
                  id="add-product-btn"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                >
                  <Plus size={15} />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Available Products List */}
              {(!selectedAdminGame.products || selectedAdminGame.products.length === 0) ? (
                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                  No products added yet. Click "+ Add Product" to add recharge packages.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedAdminGame.products.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {prod.name}
                        </span>
                        <span className="font-black text-emerald-600 text-xs mt-0.5 block">
                          RS {prod.price}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setProdNameInput(prod.name);
                            setProdPriceInput(prod.price.toString());
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT GAME */}
      <AnimatePresence>
        {isGameModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingGame ? 'Edit Game' : 'Add New Game'}
                </h3>
                <button
                  onClick={() => setIsGameModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={gameTitleInput}
                    onChange={(e) => setGameTitleInput(e.target.value)}
                    placeholder="e.g. Free Fire Nepal"
                    id="game-name-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Upload Logo / Image URL
                  </label>
                  <input
                    type="text"
                    value={gameLogoInput}
                    onChange={(e) => setGameLogoInput(e.target.value)}
                    placeholder="e.g. https://example.com/logo.png"
                    id="game-logo-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {gameLogoInput && (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={gameLogoInput}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-500">Image Preview</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsGameModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGame}
                  id="save-game-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Save Game
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT REQUIREMENT */}
      <AnimatePresence>
        {isRequirementModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
                </h3>
                <button
                  onClick={() => setIsRequirementModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Requirement Name
                  </label>
                  <input
                    type="text"
                    value={reqNameInput}
                    onChange={(e) => setReqNameInput(e.target.value)}
                    placeholder="e.g. Player ID, Server ID, Character Name"
                    id="req-name-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Input Type (Number or Text)
                  </label>
                  <select
                    value={reqTypeInput}
                    onChange={(e) => setReqTypeInput(e.target.value as 'number' | 'text')}
                    id="req-type-select"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600"
                  >
                    <option value="number">Number (Numeric ID)</option>
                    <option value="text">Text (Alphanumeric / Username)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsRequirementModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRequirement}
                  id="save-requirement-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Save Requirement
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD / EDIT PRODUCT */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingProduct ? 'Edit Product' : 'Add Product / Package'}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Product Name / Package Title
                  </label>
                  <input
                    type="text"
                    value={prodNameInput}
                    onChange={(e) => setProdNameInput(e.target.value)}
                    placeholder="e.g. 100 Diamonds, Weekly Pass, 325 UC"
                    id="prod-name-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Product Price (RS)
                  </label>
                  <input
                    type="number"
                    value={prodPriceInput}
                    onChange={(e) => setProdPriceInput(e.target.value)}
                    placeholder="e.g. 140"
                    id="prod-price-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  id="save-product-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Save Product
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SCREENSHOT PREVIEW */}
      <AnimatePresence>
        {selectedScreenshot && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-4 space-y-4 text-center shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-sm">Payment Screenshot Receipt</h3>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-black">
                <img
                  src={selectedScreenshot}
                  alt="Payment Screenshot"
                  className="w-full object-contain mx-auto"
                />
              </div>

              <button
                onClick={() => setSelectedScreenshot(null)}
                className="w-full py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: BALANCE ADJUSTMENT */}
      <AnimatePresence>
        {adjustingUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">Adjust User Balance</h3>
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">User Profile:</p>
                <p className="text-sm font-black text-slate-900">{adjustingUser.name}</p>
                <p className="text-xs font-mono text-indigo-600">{adjustingUser.email}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  New Wallet Balance (RS)
                </label>
                <input
                  type="number"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-black text-lg rounded-xl outline-none focus:border-indigo-600"
                />
              </div>

              {adjustSuccess && (
                <p className="text-xs font-bold text-emerald-600 text-center">{adjustSuccess}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserBalance}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Save Balance
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
