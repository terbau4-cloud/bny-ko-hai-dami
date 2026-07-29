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
  ShieldCheck,
  Eye,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Props {
  adminEmail: string;
}

export const AdminTab: React.FC<Props> = ({ adminEmail }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'pending' | 'users' | 'orders'>('overview');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Balance adjustment modal
  const [adjustingUser, setAdjustingUser] = useState<UserProfile | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [adjustSuccess, setAdjustSuccess] = useState<string>('');

  // Fetch Firestore users and transactions
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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for live updates on transactions
    const q = query(collection(db, 'transactions'));
    const unsubscribe = onSnapshot(
      q,
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

    return () => unsubscribe();
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

      // Local state update
      setTransactionsList((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, status: 'Approved' } : item))
      );

      // If deposit, credit user wallet in Firestore
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-28">
      {/* Top Admin Navigation Bar with 3-Line Menu Button */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Top-Left 3-Line Hamburger Menu Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              id="admin-hamburger-menu-btn"
              className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer border border-indigo-500/30 flex items-center justify-center"
              aria-label="Open Admin Drawer Menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  BNY <span className="text-indigo-400">ADMIN</span>
                </h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Master
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Dashboard & Management Panel
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            id="admin-refresh-btn"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
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
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-slate-950 border-r border-slate-800 z-50 p-6 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/50 bg-slate-900">
                      <img
                        src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
                        alt="BNY Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="font-black text-white text-base">BNY SHOP</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Admin Controls
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveSection('overview');
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-overview"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      activeSection === 'overview'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Sliders size={18} />
                    <span>Dashboard Overview</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('pending');
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-pending"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      activeSection === 'pending'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={18} />
                      <span>Pending Orders</span>
                    </div>
                    {pendingOrdersCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('orders');
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-orders"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      activeSection === 'orders'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag size={18} />
                      <span>All Orders</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{totalOrdersCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('users');
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-users"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      activeSection === 'users'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users size={18} />
                      <span>Total Users</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{totalUsersCount}</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">Logged in Admin:</p>
                <p className="font-mono text-indigo-400 truncate">{adminEmail}</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top 3 Stat Cards (Total Users, Total Orders, Pending Orders) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Users Card */}
          <div
            onClick={() => setActiveSection('users')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              activeSection === 'users'
                ? 'bg-gradient-to-br from-indigo-900/60 to-slate-900 border-indigo-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                Total Users
              </span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Users size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{totalUsersCount}</div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Registered gaming profiles
            </p>
          </div>

          {/* Total Orders Card */}
          <div
            onClick={() => setActiveSection('orders')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              activeSection === 'orders'
                ? 'bg-gradient-to-br from-indigo-900/60 to-slate-900 border-indigo-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                Total Orders
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <ShoppingBag size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{totalOrdersCount}</div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              All topups & deposits recorded
            </p>
          </div>

          {/* Pending Orders Card */}
          <div
            onClick={() => setActiveSection('pending')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              activeSection === 'pending'
                ? 'bg-gradient-to-br from-amber-950/80 to-slate-900 border-amber-500 shadow-lg ring-2 ring-amber-500/30'
                : 'bg-slate-950/80 border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock size={14} /> Pending Orders
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <AlertCircle size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 flex items-center gap-2">
              <span>{pendingOrdersCount}</span>
              {pendingOrdersCount > 0 && (
                <span className="text-xs font-bold text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full animate-bounce">
                  Action Needed
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-200/80 font-semibold mt-1">
              Awaiting admin approval
            </p>
          </div>
        </div>

        {/* SECTION: Pending Orders List */}
        {(activeSection === 'overview' || activeSection === 'pending') && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Pending Orders</h3>
                  <p className="text-xs text-slate-400">
                    Review player topup requests & payment screenshots
                  </p>
                </div>
              </div>

              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-3 py-1 rounded-full">
                {pendingOrdersCount} Pending
              </span>
            </div>

            {pendingOrdersList.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-slate-500">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-60" />
                <p className="font-extrabold text-slate-300">No Pending Orders!</p>
                <p className="text-xs text-slate-500">
                  All customer recharge requests have been processed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrdersList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                          {tx.orderId || 'ORDER'}
                        </span>
                        <span className="text-xs font-extrabold text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                          Pending
                        </span>
                        <span className="text-xs font-bold text-slate-400">{tx.time}</span>
                      </div>

                      <div className="text-base font-black text-white">{tx.description}</div>

                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        {tx.playerId && (
                          <span className="bg-slate-800 px-2 py-1 rounded font-mono font-bold text-emerald-400 border border-slate-700">
                            Player ID: {tx.playerId}
                          </span>
                        )}
                        <span className="font-black text-emerald-400 text-sm">
                          RS {tx.amount}
                        </span>
                      </div>
                    </div>

                    {/* Screenshot thumbnail if deposit */}
                    {tx.screenshotUrl && (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshot(tx.screenshotUrl || null)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    )}

                    {/* Approve / Reject Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <button
                        onClick={() => handleApproveOrder(tx)}
                        id={`approve-order-${tx.id}`}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleRejectOrder(tx.id)}
                        id={`reject-order-${tx.id}`}
                        className="flex-1 sm:flex-initial bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-black text-xs px-3.5 py-2.5 rounded-xl border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
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

        {/* SECTION: Total Users List */}
        {(activeSection === 'overview' || activeSection === 'users') && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Registered Users</h3>
                  <p className="text-xs text-slate-400">
                    Manage player accounts & wallet balances
                  </p>
                </div>
              </div>

              {/* Search user */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user name or email..."
                  className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold text-white rounded-xl outline-none focus:border-indigo-500 w-full sm:w-56"
                />
              </div>
            </div>

            {usersList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
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
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">{usr.name}</span>
                          {usr.email.toLowerCase() === adminEmail.toLowerCase() && (
                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/40">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{usr.email}</p>
                        {usr.whatsapp && (
                          <p className="text-[11px] text-emerald-400 font-bold">
                            WhatsApp: {usr.whatsapp}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Wallet Balance
                          </span>
                          <span className="font-black text-emerald-400 text-base">
                            RS {usr.walletBalance}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setAdjustingUser(usr);
                            setNewBalanceInput(usr.walletBalance.toString());
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
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

        {/* SECTION: All Orders List */}
        {activeSection === 'orders' && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">All System Orders</h3>
                  <p className="text-xs text-slate-400">History of all transactions</p>
                </div>
              </div>
            </div>

            {transactionsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {transactionsList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400">
                          {tx.orderId || 'ORD'}
                        </span>
                        <span
                          className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                            tx.status === 'Approved' || tx.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.status === 'Pending'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="font-bold text-white text-sm mt-0.5">{tx.description}</p>
                      {tx.playerId && (
                        <p className="text-slate-400 font-mono">ID: {tx.playerId}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-400 text-sm block">
                        RS {tx.amount}
                      </span>
                      <span className="text-slate-500 text-[10px]">{tx.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screenshot Lightbox Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-black text-white text-sm">Payment Screenshot Receipt</h3>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 bg-black">
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

      {/* Balance Adjustment Modal */}
      <AnimatePresence>
        {adjustingUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-white text-base">Adjust User Balance</h3>
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">User Profile:</p>
                <p className="text-sm font-black text-white">{adjustingUser.name}</p>
                <p className="text-xs font-mono text-indigo-400">{adjustingUser.email}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  New Wallet Balance (RS)
                </label>
                <input
                  type="number"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 text-white font-black text-lg rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              {adjustSuccess && (
                <p className="text-xs font-bold text-emerald-400 text-center">{adjustSuccess}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserBalance}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
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
