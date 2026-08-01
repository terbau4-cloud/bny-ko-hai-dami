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
  ChevronRight,
  Lock,
  Unlock,
  Ban,
  Copy,
  Check,
  Image as ImageIcon,
  UserPlus,
  Upload,
  Link as LinkIcon,
  Shield,
  ExternalLink,
  FileText,
  QrCode,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, Game, GameRequirement, TopupProduct, AppBanner, TeamMember, Category } from '../types';
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
  teamMembers?: string[];
}

interface PaymentQR {
  id: string;
  title: string;
  imageUrl: string;
  createdAt?: string;
}

// Canvas utility for compressing images before uploading to Firestore base64
const compressImage = (file: File, maxWidth = 500, quality = 0.65): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AdminTab: React.FC<Props> = ({ adminEmail, teamMembers = [] }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'orders' | 'deposits' | 'categories' | 'games' | 'banner' | 'members' | 'game_description' | 'payment'>('overview');

  const normalizedEmail = (adminEmail || '').toLowerCase().trim();
  const isMasterAdmin = normalizedEmail === 'bnyeshop@gmail.com';

  // Ensure added team members can ONLY access 'orders' or 'deposits'
  useEffect(() => {
    if (!isMasterAdmin) {
      if (activeSection !== 'orders' && activeSection !== 'deposits') {
        setActiveSection('orders');
      }
    }
  }, [isMasterAdmin, activeSection]);

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [gamesList, setGamesList] = useState<Game[]>(() => {
    try {
      const cached = localStorage.getItem('bny_games');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedScreenshotTx, setSelectedScreenshotTx] = useState<Transaction | null>(null);
  const [copyToast, setCopyToast] = useState<string>('');

  // Categories state & modal
  const [categoriesList, setCategoriesList] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('bny_categories');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState<string>('');
  const [categoryLoading, setCategoryLoading] = useState<boolean>(false);

  // Banners, Team Members & Payment QRs state
  const [bannersList, setBannersList] = useState<AppBanner[]>(() => {
    try {
      const cached = localStorage.getItem('bny_banners');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [teamMembersList, setTeamMembersList] = useState<TeamMember[]>([]);
  const [paymentQRsList, setPaymentQRsList] = useState<PaymentQR[]>(() => {
    try {
      const cached = localStorage.getItem('bny_payment_qrs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Add/Edit Banner Modal state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<AppBanner | null>(null);
  const [bannerImageUrlInput, setBannerImageUrlInput] = useState<string>('');
  const [bannerRedirectInput, setBannerRedirectInput] = useState<string>('');
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);

  // Add/Edit Payment QR Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [editingPaymentQR, setEditingPaymentQR] = useState<PaymentQR | null>(null);
  const [paymentTitleInput, setPaymentTitleInput] = useState<string>('');
  const [paymentImgInput, setPaymentImgInput] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

  // Add Member state
  const [memberEmailInput, setMemberEmailInput] = useState<string>('');
  const [memberMsg, setMemberMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberAddLoading, setMemberAddLoading] = useState<boolean>(false);

  // Firestore listeners for banners, team_members & payment_qrs
  useEffect(() => {
    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        const list: AppBanner[] = snap.docs.map((d) => ({
          id: d.id,
          imageUrl: d.data().imageUrl || '',
          redirectLink: d.data().redirectLink || '',
          createdAt: d.data().createdAt || '',
        }));
        setBannersList(list);
      },
      (err) => {
        console.error('Admin banners snapshot error:', err);
      }
    );

    const unsubMembers = onSnapshot(
      collection(db, 'team_members'),
      (snap) => {
        const list: TeamMember[] = snap.docs.map((d) => ({
          id: d.id,
          email: d.data().email || '',
          createdAt: d.data().createdAt || '',
        }));
        setTeamMembersList(list);
      },
      (err) => {
        console.error('Admin team_members snapshot error:', err);
      }
    );

    const unsubQRs = onSnapshot(
      collection(db, 'payment_qrs'),
      (snap) => {
        const list: PaymentQR[] = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || 'Payment QR',
          imageUrl: d.data().imageUrl || '',
          createdAt: d.data().createdAt || '',
        }));
        setPaymentQRsList(list);
      },
      (err) => {
        console.error('Admin payment_qrs snapshot error:', err);
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
        setCategoriesList(list);
      },
      (err) => {
        console.error('Admin categories snapshot error:', err);
      }
    );

    return () => {
      unsubBanners();
      unsubMembers();
      unsubQRs();
      unsubCategories();
    };
  }, []);

  // Category Save / Delete Handlers
  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) return;
    setCategoryLoading(true);
    const catId = editingCategory ? editingCategory.id : `cat_${Date.now()}`;
    const newCategory: Category = {
      id: catId,
      name: categoryNameInput.trim(),
      createdAt: editingCategory?.createdAt || new Date().toISOString(),
    };

    let updatedList: Category[] = [];
    if (editingCategory) {
      updatedList = categoriesList.map((c) => (c.id === catId ? newCategory : c));
    } else {
      updatedList = [newCategory, ...categoriesList];
    }

    setCategoriesList(updatedList);
    try {
      localStorage.setItem('bny_categories', JSON.stringify(updatedList));
    } catch {}

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryLoading(false);

    try {
      await setDoc(doc(db, 'categories', catId), {
        name: newCategory.name,
        createdAt: newCategory.createdAt,
      });
    } catch (err) {
      console.warn('Save category to Firestore warning (saved locally):', err);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    const updatedList = categoriesList.filter((c) => c.id !== catId);
    setCategoriesList(updatedList);
    try {
      localStorage.setItem('bny_categories', JSON.stringify(updatedList));
    } catch {}

    try {
      await deleteDoc(doc(db, 'categories', catId));
    } catch (err) {
      console.warn('Delete category from Firestore warning:', err);
    }
  };

  // Game Description States & Handlers
  const [selectedDescGame, setSelectedDescGame] = useState<Game | null>(null);
  const [descInput, setDescInput] = useState<string>('');
  const [descLoading, setDescLoading] = useState<boolean>(false);
  const [descToast, setDescToast] = useState<string>('');

  const handleSaveGameDescription = async () => {
    if (!selectedDescGame) return;
    setDescLoading(true);
    try {
      const cleanDesc = descInput.trim();
      await updateDoc(doc(db, 'games', selectedDescGame.id), {
        description: cleanDesc,
      });
      setDescToast('Game description saved successfully!');
      setSelectedDescGame((prev) => (prev ? { ...prev, description: cleanDesc } : null));
      setTimeout(() => setDescToast(''), 3000);
    } catch (err) {
      console.error('Save game description error:', err);
      alert('Failed to save game description');
    } finally {
      setDescLoading(false);
    }
  };

  const handleDeleteGameDescription = async () => {
    if (!selectedDescGame) return;
    if (!window.confirm('Are you sure you want to delete/clear this game description?')) return;
    setDescLoading(true);
    try {
      await updateDoc(doc(db, 'games', selectedDescGame.id), {
        description: '',
      });
      setDescInput('');
      setSelectedDescGame((prev) => (prev ? { ...prev, description: '' } : null));
      setDescToast('Game description deleted successfully!');
      setTimeout(() => setDescToast(''), 3000);
    } catch (err) {
      console.error('Delete game description error:', err);
      alert('Failed to delete game description');
    } finally {
      setDescLoading(false);
    }
  };

  const getRequirementsList = (tx: Transaction) => {
    if (tx.requirementsData && tx.requirementsData.length > 0) {
      return tx.requirementsData;
    }
    if (tx.playerId) {
      const rawId = tx.playerId.trim();
      if (rawId.includes(':')) {
        const parts = rawId.split('|');
        return parts.map((part) => {
          const colIdx = part.indexOf(':');
          if (colIdx !== -1) {
            const k = part.substring(0, colIdx).trim();
            const v = part.substring(colIdx + 1).trim();
            return { name: k || 'Player ID', value: v || part.trim() };
          }
          return { name: 'Player ID', value: part.trim() };
        });
      }

      const allGames = gamesList;
      const matchedGame = allGames.find(
        (g) => (tx.gameTitle && g.title.toLowerCase().includes(tx.gameTitle.toLowerCase())) ||
               (tx.gameTitle && tx.gameTitle.toLowerCase().includes(g.title.toLowerCase())) ||
               g.id === tx.gameId
      );

      if (matchedGame && matchedGame.requirements && matchedGame.requirements.length > 0) {
        if (matchedGame.requirements.length === 1) {
          return [{ name: matchedGame.requirements[0].name, value: rawId }];
        }
        return matchedGame.requirements.map((req, idx) => ({
          name: req.name,
          value: idx === 0 ? rawId : '-',
        }));
      }

      return [{ name: 'Player ID', value: rawId }];
    }
    return [];
  };

  // Filter tabs & search for Orders
  const [ordersStatusTab, setOrdersStatusTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState<string>('');

  // Filter tabs & search for Deposits
  const [depositsStatusTab, setDepositsStatusTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [depositsSearchTerm, setDepositsSearchTerm] = useState<string>('');

  // Add Balance Modal State
  const [addBalanceUser, setAddBalanceUser] = useState<UserProfile | null>(null);
  const [addBalanceAmountInput, setAddBalanceAmountInput] = useState<string>('');
  const [addBalanceSuccess, setAddBalanceSuccess] = useState<string>('');

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
  const [gameCategoryInput, setGameCategoryInput] = useState<string>('');

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

  // Bulk Product Paste State
  const [bulkListInput, setBulkListInput] = useState<string>('');
  const [bulkImportLoading, setBulkImportLoading] = useState<boolean>(false);

  // Single consolidated Firestore listener effect
  useEffect(() => {
    setLoading(true);

    // Listen for live updates on users
    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users')),
      (snapshot) => {
        const fetchedUsers: UserProfile[] = snapshot.docs.map((d) => {
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
            blocked: Boolean(data.blocked),
          };
        });
        setUsersList(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        console.warn('Admin live users listener warning:', err?.message || err);
        setLoading(false);
      }
    );

    // Listen for live updates on transactions
    const unsubscribeTx = onSnapshot(
      query(collection(db, 'transactions')),
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
            gameId: data.gameId,
            gameTitle: data.gameTitle,
            gameIcon: data.gameIcon,
            productName: data.productName,
            productPrice: data.productPrice,
            quantity: data.quantity,
            playerId: data.playerId,
            userEmail: data.userEmail || '',
            paymentQrTitle: data.paymentQrTitle || data.paymentMethod || '',
            requirementsData: data.requirementsData || [],
            screenshotUrl: data.screenshotUrl,
          };
        });
        setTransactionsList(updatedTxs);
        setLoading(false);
      },
      (err) => {
        console.warn('Admin live tx listener warning:', err?.message || err);
        setLoading(false);
      }
    );

    // Listen for live updates on games
    const unsubscribeGames = onSnapshot(
      query(collection(db, 'games')),
      (snapshot) => {
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
        setSelectedAdminGame((prev) => {
          if (!prev) return null;
          const updated = updatedGames.find((g) => g.id === prev.id);
          return updated || null;
        });
        setLoading(false);
      },
      (err) => {
        console.warn('Admin live games listener warning:', err?.message || err);
        setLoading(false);
      }
    );

    // Listen for live updates on payment_qrs
    const unsubscribePaymentQRs = onSnapshot(
      query(collection(db, 'payment_qrs')),
      (snapshot) => {
        const qrs: PaymentQR[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Payment QR Code',
            imageUrl: data.imageUrl || '',
            createdAt: data.createdAt,
          };
        });
        if (qrs.length > 0) {
          setPaymentQRsList(qrs);
          try { localStorage.setItem('bny_payment_qrs', JSON.stringify(qrs)); } catch {}
        }
      },
      (err) => {
        console.warn('Admin live payment_qrs warning:', err?.message || 'Quota or network error');
        setLoading(false);
      }
    );

    // Listen for live updates on banners
    const unsubscribeBanners = onSnapshot(
      query(collection(db, 'banners')),
      (snapshot) => {
        const bannersData: AppBanner[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            imageUrl: data.imageUrl || '',
            redirectLink: data.redirectLink || data.redirectUrl || '',
            createdAt: data.createdAt || '',
          };
        });
        if (bannersData.length > 0) {
          setBannersList(bannersData);
          try { localStorage.setItem('bny_banners', JSON.stringify(bannersData)); } catch {}
        }
      },
      (err) => {
        console.warn('Admin live banners warning:', err?.message || 'Quota or network error');
        setLoading(false);
      }
    );

    // Listen for live updates on team_members
    const unsubscribeMembers = onSnapshot(
      query(collection(db, 'team_members')),
      (snapshot) => {
        const list: TeamMember[] = snapshot.docs.map((d) => ({
          id: d.id,
          email: d.data().email || '',
          createdAt: d.data().createdAt || '',
        }));
        setTeamMembersList(list);
      },
      (err) => {
        console.warn('Admin live team_members warning:', err?.message || 'Quota or network error');
        setLoading(false);
      }
    );

    // Listen for live updates on categories
    const unsubscribeCategories = onSnapshot(
      query(collection(db, 'categories')),
      (snapshot) => {
        const list: Category[] = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || '',
          createdAt: d.data().createdAt || '',
        }));
        if (list.length > 0) {
          setCategoriesList(list);
          try { localStorage.setItem('bny_categories', JSON.stringify(list)); } catch {}
        }
      },
      (err) => {
        console.warn('Admin live categories warning:', err?.message || 'Quota or network error');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeTx();
      unsubscribeGames();
      unsubscribePaymentQRs();
      unsubscribeBanners();
      unsubscribeMembers();
      unsubscribeCategories();
    };
  }, []);

  // Filtered stats
  const totalUsersCount = usersList.length;
  const totalOrdersCount = transactionsList.filter((t) => t.type !== 'deposit').length;
  const pendingOrdersList = transactionsList.filter((t) => t.type !== 'deposit' && t.status === 'Pending');
  const pendingOrdersCount = pendingOrdersList.length;

  const totalRevenueAmount = transactionsList
    .filter((t) => t.type !== 'deposit' && (t.status === 'Approved' || t.status === 'Completed'))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalDepositsCount = transactionsList.filter((t) => t.type === 'deposit').length;
  const pendingDepositsCount = transactionsList.filter((t) => t.type === 'deposit' && t.status === 'Pending').length;

  // Overview Analytics Chart Data Helpers (7-day Chronological Trend)
  const getGraphData = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    // Generate last 7 days array in chronological order (6 days ago -> today)
    const days: { key: string; date: string; sales: number; orders: number; deposits: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : dayNames[d.getDay()];
      days.push({ key, date: label, sales: 0, orders: 0, deposits: 0 });
    }

    const todayKey = days[6].key;

    transactionsList.forEach((tx) => {
      let txKey = '';
      if (tx.createdAt) {
        txKey = tx.createdAt.split('T')[0];
      } else if (tx.date && tx.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        txKey = tx.date.substring(0, 10);
      } else {
        txKey = todayKey;
      }

      let bucket = days.find((d) => d.key === txKey);
      if (!bucket) {
        bucket = days[6]; // Today bucket fallback
      }

      if (tx.type === 'deposit') {
        if (tx.status === 'Approved' || tx.status === 'Completed' || tx.status === 'Pending') {
          bucket.deposits += Number(tx.amount || 0);
        }
      } else {
        bucket.orders += 1;
        if (tx.status === 'Approved' || tx.status === 'Completed' || tx.status === 'Pending') {
          bucket.sales += Number(tx.amount || 0);
        }
      }
    });

    return days;
  };

  // Handle Approve Order / Deposit
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
        let targetDocId = '';
        let currentBal = 0;

        for (const userDoc of usersSnap.docs) {
          const uData = userDoc.data();
          if (
            userDoc.id === (tx as any).userId ||
            (uData.email && (tx as any).userEmail && uData.email.toLowerCase() === (tx as any).userEmail.toLowerCase())
          ) {
            targetDocId = userDoc.id;
            currentBal = typeof uData.walletBalance === 'number' ? uData.walletBalance : 0;
            break;
          }
        }

        if (targetDocId) {
          const newBal = currentBal + tx.amount;
          await updateDoc(doc(db, 'users', targetDocId), { walletBalance: newBal });
          setUsersList((prev) =>
            prev.map((u) => (u.uid === targetDocId ? { ...u, walletBalance: newBal } : u))
          );
        }
      }
    } catch (err) {
      console.error('Error approving order:', err);
    }
  };

  // Handle Reject Order / Deposit
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

  // Handle User Add Balance
  const handleConfirmAddBalance = async () => {
    if (!addBalanceUser || !addBalanceUser.uid) return;
    const amountToAdd = parseFloat(addBalanceAmountInput);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      const currentBal = addBalanceUser.walletBalance || 0;
      const newBal = currentBal + amountToAdd;
      await updateDoc(doc(db, 'users', addBalanceUser.uid), { walletBalance: newBal });

      setUsersList((prev) =>
        prev.map((u) => (u.uid === addBalanceUser.uid ? { ...u, walletBalance: newBal } : u))
      );

      setAddBalanceSuccess(`Added RS ${amountToAdd} to ${addBalanceUser.name}!`);
      setTimeout(() => {
        setAddBalanceSuccess('');
        setAddBalanceUser(null);
        setAddBalanceAmountInput('');
      }, 1500);
    } catch (err) {
      console.error('Error adding user balance:', err);
      alert('Failed to add balance.');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: UserProfile) => {
    if (!user.uid) return;
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"? This cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid));
      setUsersList((prev) => prev.filter((u) => u.uid !== user.uid));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    }
  };

  // Handle Block / Unblock User
  const handleToggleBlockUser = async (user: UserProfile) => {
    if (!user.uid) return;
    const newBlocked = !user.blocked;

    try {
      await updateDoc(doc(db, 'users', user.uid), { blocked: newBlocked });
      setUsersList((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, blocked: newBlocked } : u))
      );
    } catch (err) {
      console.error('Error toggling block state:', err);
      alert('Failed to update block state.');
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

    const selectedCategory = gameCategoryInput.trim() || categoriesList[0]?.name || 'Popular Games';
    let nextGamesList: Game[] = [];
    let savedGameObj: Game | null = null;

    if (editingGame) {
      nextGamesList = gamesList.map((g) => {
        if (g.id === editingGame.id) {
          const updated = {
            ...g,
            title: gameTitleInput.trim(),
            coverImg: gameLogoInput.trim(),
            category: selectedCategory,
          };
          savedGameObj = updated;
          return updated;
        }
        return g;
      });
    } else {
      const newId = `game_${Date.now()}`;
      savedGameObj = {
        id: newId,
        title: gameTitleInput.trim(),
        coverImg: gameLogoInput.trim(),
        icon: '🎮',
        category: selectedCategory,
        rating: 4.8,
        color: 'from-indigo-600 to-purple-600',
        bgGradient: 'bg-gradient-to-br from-indigo-600 to-purple-700',
        plays: 100,
        description: 'Top up game credits instantly on BNY SHOP.',
        gameType: 'balloon',
        products: [],
        requirements: [],
      };
      nextGamesList = [savedGameObj, ...gamesList];
    }

    setGamesList(nextGamesList);
    try {
      localStorage.setItem('bny_games', JSON.stringify(nextGamesList));
    } catch {}

    setIsGameModalOpen(false);
    setEditingGame(null);
    setGameTitleInput('');
    setGameLogoInput('');
    setGameCategoryInput('');

    try {
      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), {
          title: gameTitleInput.trim(),
          coverImg: gameLogoInput.trim(),
          category: selectedCategory,
        });
      } else if (savedGameObj) {
        await setDoc(doc(db, 'games', savedGameObj.id), savedGameObj);
      }
    } catch (err) {
      console.warn('Error saving game to Firestore (saved locally):', err);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    const nextGamesList = gamesList.filter((g) => g.id !== gameId);
    setGamesList(nextGamesList);
    try {
      localStorage.setItem('bny_games', JSON.stringify(nextGamesList));
    } catch {}

    if (selectedAdminGame?.id === gameId) {
      setSelectedAdminGame(null);
    }

    try {
      await deleteDoc(doc(db, 'games', gameId));
    } catch (err) {
      console.warn('Error deleting game from Firestore:', err);
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

  const handleDeleteAllProducts = async () => {
    if (!selectedAdminGame) return;
    const currentProds = selectedAdminGame.products || [];
    if (currentProds.length === 0) {
      alert('There are no products to delete.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete ALL ${currentProds.length} products for "${selectedAdminGame.title}"? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        products: [],
      });
      setSelectedAdminGame((prev) => (prev ? { ...prev, products: [] } : null));
      setCopyToast('Deleted all products successfully!');
      setTimeout(() => setCopyToast(''), 2500);
    } catch (err) {
      console.error('Error deleting all products:', err);
      alert('Failed to delete all products.');
    }
  };

  // Helper function to clean product name
  const cleanProductName = (str: string): string => {
    if (!str) return '';
    let cleaned = str.trim();

    let prev = '';
    while (cleaned !== prev) {
      prev = cleaned;
      cleaned = cleaned
        // Strip leading emojis, pointers, bullet symbols, and punctuation
        .replace(/^[👉💸✨🔥💎📌🔹🔸▪️▫️▶️➡️➢•·~*#\-_=\+|:,\t@—–\s]+/g, '')
        .replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2010-\u2017]|\uD83E[\uDD10-\uDDFF])+/g, '')
        // Strip trailing currency indicators (case-insensitive)
        .replace(/(?:\b(?:Rs\.?|RS\.?|NRs\.?|NPR\.?|INR\.?|Tk\.?|₹|\$)\b|Rs\.?|RS\.?|NRs\.?|NPR\.?|INR\.?|Tk\.?|₹|\$)\s*$/gi, '')
        // Strip trailing emojis, separators and punctuation
        .replace(/[👉💸✨🔥💎📌🔹🔸▪️▫️▶️➡️➢•·~*#\-_=\+|:,\t@—–\s]+$/g, '')
        .replace(/(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2010-\u2017]|\uD83E[\uDD10-\uDDFF])+\s*$/g, '')
        .trim();
    }

    return cleaned;
  };

  // Bulk parse product list helper
  const parsePastedProductList = (rawText: string): { name: string; price: number }[] => {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/);
    const results: { name: string; price: number }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip header / title lines with no price numbers
      if (!/\d/.test(line)) continue;

      let matchedName = '';
      let matchedPrice = 0;

      // 1. Try matching line ending with last numeric value (integer or decimal)
      const lastNumMatch = line.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*$/);
      if (lastNumMatch) {
        const textBefore = lastNumMatch[1];
        const priceVal = parseFloat(lastNumMatch[2]);
        const cleaned = cleanProductName(textBefore);

        if (cleaned && !isNaN(priceVal) && priceVal > 0) {
          matchedName = cleaned;
          matchedPrice = priceVal;
        }
      }

      // 2. Fallback: match line ending with optional currency marker and digits/decimal price
      if (!matchedPrice) {
        const match = line.match(/(.*?)(?:\s*(?:Rs\.?|RS\.?|NRs\.?|NPR\.?|INR\.?|Tk\.?|₹|\$|@|=|:|-|—|–|💸)\s*|\s+)(\d+(?:\.\d+)?)\D*$/i);
        if (match && match[1] && match[2]) {
          const pNum = parseFloat(match[2]);
          const cleanedName = cleanProductName(match[1]);

          if (cleanedName && !isNaN(pNum) && pNum > 0) {
            matchedName = cleanedName;
            matchedPrice = pNum;
          }
        }
      }

      // 3. Fallback: split by common separators (-, =, :, |, tab, comma, —, –)
      if (!matchedPrice) {
        const parts = line.split(/[-=|:\t,—–]/);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1].trim();
          const firstParts = parts.slice(0, parts.length - 1).join(' - ').trim();
          const cleanPriceStr = lastPart.replace(/[^0-9.]/g, '');
          const pNum = parseFloat(cleanPriceStr);

          if (!isNaN(pNum) && pNum > 0 && firstParts.length > 0) {
            matchedName = cleanProductName(firstParts);
            matchedPrice = pNum;
          }
        }
      }

      if (matchedName && matchedPrice > 0) {
        results.push({ name: matchedName, price: matchedPrice });
      }
    }

    return results;
  };

  const handleDetectAndAddProducts = async () => {
    if (!selectedAdminGame || !bulkListInput.trim()) return;
    const detectedItems = parsePastedProductList(bulkListInput);

    if (detectedItems.length === 0) {
      alert('Could not detect any valid product names and prices from the list. Example format:\n100 Diamonds - Rs 140\n210 Diamonds - 280\n500 Diamonds = 650');
      return;
    }

    setBulkImportLoading(true);
    try {
      const currentProds = selectedAdminGame.products || [];
      const newProds: TopupProduct[] = detectedItems.map((item, idx) => ({
        id: `prod_${Date.now()}_${idx}`,
        name: item.name,
        price: item.price,
      }));

      const updatedProds = [...currentProds, ...newProds];

      await updateDoc(doc(db, 'games', selectedAdminGame.id), {
        products: updatedProds,
      });

      setSelectedAdminGame((prev) => (prev ? { ...prev, products: updatedProds } : null));
      setBulkListInput('');
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProdNameInput('');
      setProdPriceInput('');
      setCopyToast(`Successfully detected and added ${newProds.length} products!`);
      setTimeout(() => setCopyToast(''), 3000);
    } catch (err) {
      console.error('Error adding detected bulk products:', err);
      alert('Failed to save bulk products. Please try again.');
    } finally {
      setBulkImportLoading(false);
    }
  };

  // Game Logo Upload handler using image compressor
  const handleGameLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 600, 0.85);
      setGameLogoInput(compressedDataUrl);
    } catch (err) {
      console.error('Error compressing game logo image:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setGameLogoInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ================= BANNER HANDLERS =================
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 1200, 0.85);
      setBannerImageUrlInput(compressedDataUrl);
    } catch (err) {
      console.error('Error compressing banner image:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setBannerImageUrlInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerImageUrlInput.trim()) return;
    setBannerLoading(true);
    const bannerId = editingBanner ? editingBanner.id : `banner_${Date.now()}`;
    const newBanner: AppBanner = {
      id: bannerId,
      imageUrl: bannerImageUrlInput.trim(),
      redirectLink: bannerRedirectInput.trim(),
      createdAt: editingBanner?.createdAt || new Date().toISOString(),
    };

    let updatedBanners: AppBanner[] = [];
    if (editingBanner) {
      updatedBanners = bannersList.map((b) => (b.id === bannerId ? newBanner : b));
    } else {
      updatedBanners = [newBanner, ...bannersList];
    }

    setBannersList(updatedBanners);
    try { localStorage.setItem('bny_banners', JSON.stringify(updatedBanners)); } catch {}

    setIsBannerModalOpen(false);
    setEditingBanner(null);
    setBannerImageUrlInput('');
    setBannerRedirectInput('');
    setBannerLoading(false);

    try {
      await setDoc(doc(db, 'banners', bannerId), {
        imageUrl: newBanner.imageUrl,
        redirectLink: newBanner.redirectLink,
        createdAt: newBanner.createdAt,
      });
    } catch (err) {
      console.warn('Error saving banner to Firestore (saved locally):', err);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    const updatedBanners = bannersList.filter((b) => b.id !== bannerId);
    setBannersList(updatedBanners);
    try { localStorage.setItem('bny_banners', JSON.stringify(updatedBanners)); } catch {}

    try {
      await deleteDoc(doc(db, 'banners', bannerId));
    } catch (err) {
      console.warn('Error deleting banner from Firestore:', err);
    }
  };

  // ================= PAYMENT QR HANDLERS =================
  const handlePaymentQRFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 500, 0.65);
      setPaymentImgInput(compressedDataUrl);
    } catch (err) {
      console.error('Error compressing payment QR image:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPaymentImgInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePaymentQR = async () => {
    if (!paymentImgInput.trim()) {
      alert('Please upload or provide a Payment QR image!');
      return;
    }
    setPaymentLoading(true);
    const title = paymentTitleInput.trim() || 'Payment QR Code';
    let finalImg = paymentImgInput.trim();

    if (finalImg.length > 900000) {
      alert('The uploaded image is too large. Please select a smaller QR code image.');
      setPaymentLoading(false);
      return;
    }

    const qrId = editingPaymentQR ? editingPaymentQR.id : `qr_${Date.now()}`;
    const newQR: PaymentQR = {
      id: qrId,
      title,
      imageUrl: finalImg,
      createdAt: editingPaymentQR?.createdAt || new Date().toISOString(),
    };

    let updatedQRs: PaymentQR[] = [];
    if (editingPaymentQR) {
      updatedQRs = paymentQRsList.map((q) => (q.id === qrId ? newQR : q));
    } else {
      updatedQRs = [newQR, ...paymentQRsList];
    }

    setPaymentQRsList(updatedQRs);
    try { localStorage.setItem('bny_payment_qrs', JSON.stringify(updatedQRs)); } catch {}

    setIsPaymentModalOpen(false);
    setEditingPaymentQR(null);
    setPaymentTitleInput('');
    setPaymentImgInput('');
    setPaymentLoading(false);
    setCopyToast('Payment QR saved successfully!');
    setTimeout(() => setCopyToast(''), 2500);

    try {
      await setDoc(doc(db, 'payment_qrs', qrId), {
        title: newQR.title,
        imageUrl: newQR.imageUrl,
        createdAt: newQR.createdAt,
      });
    } catch (err: any) {
      console.warn('Error saving payment QR to Firestore (saved locally):', err);
    }
  };

  const handleDeletePaymentQR = async (qrId: string) => {
    if (!confirm('Are you sure you want to delete this Payment QR code?')) return;
    const updatedQRs = paymentQRsList.filter((q) => q.id !== qrId);
    setPaymentQRsList(updatedQRs);
    try { localStorage.setItem('bny_payment_qrs', JSON.stringify(updatedQRs)); } catch {}
    setCopyToast('Payment QR deleted!');
    setTimeout(() => setCopyToast(''), 2000);

    try {
      await deleteDoc(doc(db, 'payment_qrs', qrId));
    } catch (err) {
      console.warn('Error deleting payment QR from Firestore:', err);
    }
  };

  // ================= ADD MEMBER HANDLERS =================
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberMsg(null);
    const rawEmail = memberEmailInput.trim().toLowerCase();

    if (!rawEmail || !rawEmail.includes('@')) {
      setMemberMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    const exists = teamMembersList.some((m) => m.email.toLowerCase() === rawEmail);
    if (exists) {
      setMemberMsg({ type: 'error', text: 'This email is already added as a team member.' });
      return;
    }

    setMemberAddLoading(true);
    try {
      const memberId = `member_${Date.now()}`;
      await setDoc(doc(db, 'team_members', memberId), {
        email: rawEmail,
        createdAt: new Date().toISOString(),
      });
      setMemberEmailInput('');
      setMemberMsg({ type: 'success', text: `Member ${rawEmail} added successfully!` });
    } catch (err) {
      console.error('Error adding team member:', err);
      setMemberMsg({ type: 'error', text: 'Failed to add team member. Please try again.' });
    } finally {
      setMemberAddLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from team members?`)) return;
    try {
      await deleteDoc(doc(db, 'team_members', memberId));
    } catch (err) {
      console.error('Error deleting member:', err);
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
                  {isMasterAdmin ? 'Master' : 'Staff'}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                {isMasterAdmin ? 'Dashboard & Management Panel' : 'Orders & Deposits Management'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            }}
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
                  {isMasterAdmin && (
                    <>
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
                          <span>Users</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {totalUsersCount}
                        </span>
                      </button>
                    </>
                  )}

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
                      <span>Orders</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      pendingOrdersCount > 0
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {pendingOrdersCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('deposits');
                      setSelectedAdminGame(null);
                      setDrawerOpen(false);
                    }}
                    id="drawer-nav-deposits"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                      activeSection === 'deposits'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet size={18} />
                      <span>Deposits</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      pendingDepositsCount > 0
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {pendingDepositsCount}
                    </span>
                  </button>

                  {isMasterAdmin && (
                    <>
                      {/* Category Option - Right above Games Management */}
                      <button
                        onClick={() => {
                          setActiveSection('categories');
                          setSelectedAdminGame(null);
                          setDrawerOpen(false);
                        }}
                        id="drawer-nav-categories"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                          activeSection === 'categories'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Layers size={18} />
                          <span>Category</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {categoriesList.length}
                        </span>
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
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {gamesList.length}
                        </span>
                      </button>

                      {/* Banner Navigation Option */}
                      <button
                        onClick={() => {
                          setActiveSection('banner');
                          setSelectedAdminGame(null);
                          setDrawerOpen(false);
                        }}
                        id="drawer-nav-banner"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                          activeSection === 'banner'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ImageIcon size={18} />
                          <span>Banner</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {bannersList.length}
                        </span>
                      </button>

                      {/* Payment Setting Navigation Option */}
                      <button
                        onClick={() => {
                          setActiveSection('payment');
                          setSelectedAdminGame(null);
                          setDrawerOpen(false);
                        }}
                        id="drawer-nav-payment"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                          activeSection === 'payment'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <QrCode size={18} />
                          <span>Payment Setting</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {paymentQRsList.length}
                        </span>
                      </button>

                      {/* Add Member Navigation Option */}
                      <button
                        onClick={() => {
                          setActiveSection('members');
                          setSelectedAdminGame(null);
                          setDrawerOpen(false);
                        }}
                        id="drawer-nav-members"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                          activeSection === 'members'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserPlus size={18} />
                          <span>Add Member</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {teamMembersList.length}
                        </span>
                      </button>

                      {/* Game Description Navigation Option - Right below Add Member */}
                      <button
                        onClick={() => {
                          setActiveSection('game_description');
                          setSelectedAdminGame(null);
                          setSelectedDescGame(null);
                          setDrawerOpen(false);
                        }}
                        id="drawer-nav-game-description"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                          activeSection === 'game_description'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={18} />
                          <span>Game Description</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {gamesList.length}
                        </span>
                      </button>
                    </>
                  )}
                </nav>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">{isMasterAdmin ? 'Logged in Admin:' : 'Logged in Staff Member:'}</p>
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
                All topups recorded
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
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <DollarSign size={15} /> Total Revenue
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Wallet size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                RS {totalRevenueAmount}
              </div>
              <p className="text-[11px] text-emerald-700/80 font-semibold mt-1">
                Completed sales volume
              </p>
            </div>
          </div>
        )}

        {/* SECTION: OVERVIEW ANALYTICS GRAPH & PIE CHART */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Sales & Orders Trend Graph */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Revenue & Sales Trend</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Daily topup sales volume & total orders overview
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSection('orders')}
                  className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  View All Orders →
                </button>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getGraphData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="sales" name="Topup Sales (RS)" stroke="#6366f1" strokeWidth={3} fillOpacity={0.6} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="deposits" name="Deposits (RS)" stroke="#a855f7" strokeWidth={2.5} fillOpacity={0.4} fill="url(#colorDeposits)" />
                    <Area type="monotone" dataKey="orders" name="Orders Count" stroke="#10b981" strokeWidth={2} fillOpacity={0.3} fill="url(#colorOrders)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: USERS MANAGEMENT */}
        {activeSection === 'users' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Registered Users</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    View user profiles, add balance, block or delete users
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, email, whatsapp..."
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl outline-none focus:border-indigo-600 focus:bg-white w-full sm:w-64 shadow-2xs"
                />
              </div>
            </div>

            {usersList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                No users found in system.
              </div>
            ) : (
              <div className="space-y-3">
                {usersList
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (u.whatsapp && u.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((usr) => (
                    <div
                      key={usr.uid || usr.email}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        usr.blocked
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{usr.name}</span>
                          {usr.email.toLowerCase() === adminEmail.toLowerCase() && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-200">
                              Admin
                            </span>
                          )}
                          {usr.blocked && (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                              <Ban size={12} /> Blocked
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                          <span className="font-mono text-slate-700">✉️ {usr.email || 'No Email'}</span>
                          <span className="font-mono text-emerald-700">📱 WhatsApp: {usr.whatsapp || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200/80 pt-3 md:pt-0 shrink-0">
                        <div className="text-left md:text-right pr-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Balance
                          </span>
                          <span className="font-black text-emerald-600 text-lg">
                            RS {usr.walletBalance}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Add Balance Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setAddBalanceUser(usr);
                              setAddBalanceAmountInput('');
                            }}
                            id={`add-bal-${usr.uid}`}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Plus size={14} />
                            <span>Add Balance</span>
                          </button>

                          {/* Block / Unblock Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlockUser(usr)}
                            id={`block-user-${usr.uid}`}
                            className={`font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                              usr.blocked
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                            }`}
                          >
                            {usr.blocked ? <Unlock size={14} /> : <Lock size={14} />}
                            <span>{usr.blocked ? 'Unblock' : 'Block'}</span>
                          </button>

                          {/* Delete User Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(usr)}
                            id={`delete-user-${usr.uid}`}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-2.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: ORDERS MANAGEMENT */}
        {activeSection === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Orders</h3>
                  <p className="text-xs text-slate-500 font-semibold">Filter and manage all customer topup orders</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={ordersSearchTerm}
                  onChange={(e) => setOrdersSearchTerm(e.target.value)}
                  placeholder="Search Order ID, Game, Player ID..."
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl outline-none focus:border-indigo-600 focus:bg-white w-full shadow-2xs"
                />
              </div>
            </div>

            {/* Status Filter Tabs (Pending, Completed, Rejected) */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              {(['Pending', 'Approved', 'Rejected'] as const).map((status) => {
                const label = status === 'Approved' ? 'Completed' : status;
                const count = transactionsList.filter(
                  (t) =>
                    t.type !== 'deposit' &&
                    (status === 'Approved' ? t.status === 'Approved' || t.status === 'Completed' : t.status === status)
                ).length;

                return (
                  <button
                    key={status}
                    onClick={() => setOrdersStatusTab(status)}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      ordersStatusTab === status
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        ordersStatusTab === status
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of Orders */}
            {(() => {
              const filteredOrders = transactionsList.filter((tx) => {
                if (tx.type === 'deposit') return false;

                // Status match
                const matchesStatus =
                  ordersStatusTab === 'Approved'
                    ? tx.status === 'Approved' || tx.status === 'Completed'
                    : tx.status === ordersStatusTab;

                if (!matchesStatus) return false;

                // Search match
                if (!ordersSearchTerm.trim()) return true;
                const q = ordersSearchTerm.toLowerCase();
                return (
                  (tx.orderId && tx.orderId.toLowerCase().includes(q)) ||
                  (tx.description && tx.description.toLowerCase().includes(q)) ||
                  (tx.gameTitle && tx.gameTitle.toLowerCase().includes(q)) ||
                  (tx.productName && tx.productName.toLowerCase().includes(q)) ||
                  (tx.playerId && tx.playerId.toLowerCase().includes(q))
                );
              });

              if (filteredOrders.length === 0) {
                return (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">
                    No {ordersStatusTab === 'Approved' ? 'Completed' : ordersStatusTab} orders found.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredOrders.map((tx) => {
                    const reqs = getRequirementsList(tx);
                    return (
                      <div
                        key={tx.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                              {tx.orderId || 'ORDER'}
                            </span>
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                                tx.status === 'Approved' || tx.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : tx.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}
                            >
                              {tx.status === 'Approved' ? 'Completed' : tx.status}
                            </span>
                            <span className="text-xs font-bold text-slate-400">{tx.time}</span>
                            {tx.userEmail && (
                              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/50">
                                ✉️ {tx.userEmail}
                              </span>
                            )}
                          </div>

                          <div className="text-base font-black text-slate-900 flex items-center gap-2">
                            <span>{tx.gameTitle ? `${tx.gameTitle} - ` : ''}{tx.productName || tx.description}</span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                            <span className="bg-white px-2.5 py-1 rounded font-bold text-slate-700 border border-slate-200 shadow-2xs">
                              Price: RS {tx.productPrice || tx.amount}
                            </span>
                            <span className="bg-white px-2.5 py-1 rounded font-bold text-slate-700 border border-slate-200 shadow-2xs">
                              Qty: {tx.quantity || 1}
                            </span>
                            <span className="font-black text-emerald-600 text-sm">
                              Total: RS {tx.amount}
                            </span>
                          </div>

                          {reqs.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-200/60">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Game Requirements:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {reqs.map((req, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200/80 px-2.5 py-1 rounded-xl text-xs font-mono font-bold"
                                  >
                                    <span className="text-indigo-600">{req.name}:</span>
                                    <span className="text-slate-900 font-black">{req.value}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(req.value);
                                        setCopyToast(`Copied ${req.name}!`);
                                        setTimeout(() => setCopyToast(''), 1500);
                                      }}
                                      className="ml-1 bg-white hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 text-[10px] font-sans font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                      title={`Copy ${req.name}`}
                                    >
                                      <Copy size={11} />
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for Pending orders */}
                        {tx.status === 'Pending' && (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* SECTION: DEPOSITS MANAGEMENT */}
        {activeSection === 'deposits' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Wallet Deposits</h3>
                  <p className="text-xs text-slate-500 font-semibold">Review and approve manual QR wallet deposits</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={depositsSearchTerm}
                  onChange={(e) => setDepositsSearchTerm(e.target.value)}
                  placeholder="Search Order ID or details..."
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl outline-none focus:border-indigo-600 focus:bg-white w-full shadow-2xs"
                />
              </div>
            </div>

            {/* Status Filter Tabs (Pending, Completed, Rejected) */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              {(['Pending', 'Approved', 'Rejected'] as const).map((status) => {
                const label = status === 'Approved' ? 'Completed' : status;
                const count = transactionsList.filter(
                  (t) =>
                    t.type === 'deposit' &&
                    (status === 'Approved' ? t.status === 'Approved' || t.status === 'Completed' : t.status === status)
                ).length;

                return (
                  <button
                    key={status}
                    onClick={() => setDepositsStatusTab(status)}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      depositsStatusTab === status
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        depositsStatusTab === status
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of Deposits */}
            {(() => {
              const filteredDeposits = transactionsList.filter((tx) => {
                if (tx.type !== 'deposit') return false;

                // Status match
                const matchesStatus =
                  depositsStatusTab === 'Approved'
                    ? tx.status === 'Approved' || tx.status === 'Completed'
                    : tx.status === depositsStatusTab;

                if (!matchesStatus) return false;

                // Search match
                if (!depositsSearchTerm.trim()) return true;
                const q = depositsSearchTerm.toLowerCase();
                return (
                  (tx.orderId && tx.orderId.toLowerCase().includes(q)) ||
                  (tx.description && tx.description.toLowerCase().includes(q)) ||
                  (tx.paymentQrTitle && tx.paymentQrTitle.toLowerCase().includes(q)) ||
                  tx.amount.toString().includes(q)
                );
              });

              if (filteredDeposits.length === 0) {
                return (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">
                    No {depositsStatusTab === 'Approved' ? 'Completed' : depositsStatusTab} deposits found.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredDeposits.map((tx) => {
                    let rawQr = tx.paymentQrTitle?.trim();
                    if (!rawQr || rawQr.toLowerCase() === 'payment qr' || rawQr.toLowerCase() === 'qr payment') {
                      const match = tx.description?.match(/\(([^)]+)\)/)?.[1]?.trim();
                      if (match && match.toLowerCase() !== 'payment qr' && match.toLowerCase() !== 'qr payment') {
                        rawQr = match;
                      }
                    }
                    if (!rawQr || rawQr.toLowerCase() === 'payment qr' || rawQr.toLowerCase() === 'qr payment') {
                      const activeAdminQr = paymentQRsList.find((p) => p.title && p.title.trim().toLowerCase() !== 'payment qr')?.title?.trim();
                      rawQr = activeAdminQr || 'eSewa QR';
                    }
                    const detectedQr = rawQr;
                    return (
                      <div
                        key={tx.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                              {tx.orderId || 'DEP'}
                            </span>
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                                tx.status === 'Approved' || tx.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : tx.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}
                            >
                              {tx.status === 'Approved' ? 'Completed' : tx.status}
                            </span>
                            <span className="text-xs font-bold text-slate-400">{tx.time}</span>
                            {tx.userEmail && (
                              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/50">
                                ✉️ {tx.userEmail}
                              </span>
                            )}
                          </div>

                          <div className="text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>Wallet Deposit</span>
                            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 border border-purple-200/80 font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
                              <QrCode size={13} className="text-purple-600" />
                              <span>Paid via QR: {detectedQr}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="font-black text-emerald-600 text-base">
                              RS {tx.amount}
                            </span>
                          </div>
                        </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        {tx.screenshotUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScreenshotTx(tx);
                              setSelectedScreenshot(tx.screenshotUrl || null);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Receipt</span>
                          </button>
                        )}

                        {tx.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApproveOrder(tx)}
                              id={`approve-deposit-${tx.id}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={16} />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleRejectOrder(tx.id)}
                              id={`reject-deposit-${tx.id}`}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs px-3 py-2 rounded-xl border border-rose-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <XCircle size={16} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              );
            })()}
          </div>
        )}

        {/* SECTION: CATEGORY MANAGEMENT */}
        {activeSection === 'categories' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Category Management</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Add and manage categories for games and topup items
                  </p>
                </div>
              </div>

              {/* Add Category Option / Button */}
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryNameInput('');
                  setIsCategoryModalOpen(true);
                }}
                id="add-category-btn"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Add Category</span>
              </button>
            </div>

            {/* Below Available Categories with Edit and Delete Options */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Available Categories ({categoriesList.length})
              </h4>

              {categoriesList.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <Layers size={36} className="text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-bold text-sm">No categories added yet.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click "Add Category" above to create your first game top-up category.
                  </p>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryNameInput('');
                      setIsCategoryModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add First Category</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categoriesList.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                          <Layers size={16} />
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryNameInput(cat.name);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  setGameCategoryInput(categoriesList[0]?.name || '');
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
                          setGameCategoryInput(game.category || categoriesList[0]?.name || '');
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

                <div className="flex items-center gap-2">
                  {selectedAdminGame.products && selectedAdminGame.products.length > 0 && (
                    <button
                      onClick={handleDeleteAllProducts}
                      id="delete-all-products-btn"
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    >
                      <Trash2 size={15} />
                      <span>Delete All Products</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProdNameInput('');
                      setProdPriceInput('');
                      setBulkListInput('');
                      setIsProductModalOpen(true);
                    }}
                    id="add-product-btn"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                  >
                    <Plus size={15} />
                    <span>Add Product</span>
                  </button>
                </div>
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

        {/* SECTION 6: BANNER MANAGEMENT */}
        {activeSection === 'banner' && isMasterAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ImageIcon className="text-indigo-600" size={22} />
                  <span>Banner Management</span>
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Manage promotional banners displayed at the top of the Home page
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingBanner(null);
                  setBannerImageUrlInput('');
                  setBannerRedirectInput('');
                  setIsBannerModalOpen(true);
                }}
                id="add-banner-btn"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
              >
                <Plus size={16} />
                <span>Add Banner</span>
              </button>
            </div>

            {/* Banners List */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 px-1">
                Available Banners ({bannersList.length})
              </h3>

              {bannersList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
                  <ImageIcon className="mx-auto text-slate-300" size={40} />
                  <p className="text-sm font-bold text-slate-700">No Banners Added Yet</p>
                  <p className="text-xs text-slate-400">
                    Click "Add Banner" above to upload an image banner for the home tab.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bannersList.map((banner) => (
                    <div
                      key={banner.id}
                      className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between"
                    >
                      <div className="relative h-44 sm:h-48 bg-slate-900 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt="Banner Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                            <ImageIcon size={20} />
                            <span>No Image</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {banner.redirectLink ? (
                          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 truncate">
                            <ExternalLink size={14} className="shrink-0 text-indigo-500" />
                            <a
                              href={banner.redirectLink}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate hover:underline"
                            >
                              {banner.redirectLink}
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No redirect link set</p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setEditingBanner(banner);
                              setBannerImageUrlInput(banner.imageUrl);
                              setBannerRedirectInput(banner.redirectLink || '');
                              setIsBannerModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 8: PAYMENT SETTING */}
        {activeSection === 'payment' && isMasterAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <QrCode className="text-indigo-600" size={22} />
                  <span>Payment Setting</span>
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Manage payment QR codes (eSewa, Khalti, Bank) displayed in the user Deposit tab
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPaymentQR(null);
                  setPaymentTitleInput('');
                  setPaymentImgInput('');
                  setIsPaymentModalOpen(true);
                }}
                id="add-payment-qr-btn"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
              >
                <Plus size={16} />
                <span>Add Payment QR</span>
              </button>
            </div>

            {/* List of Recent QRs */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 px-1">
                Recent Payment QRs ({paymentQRsList.length})
              </h3>

              {paymentQRsList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
                  <QrCode className="mx-auto text-slate-300" size={40} />
                  <p className="text-sm font-bold text-slate-700">No Payment QR Codes Added Yet</p>
                  <p className="text-xs text-slate-400">
                    Click "Add Payment QR" above to upload payment QR codes for manual deposit.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {paymentQRsList.map((qr) => (
                    <div
                      key={qr.id}
                      className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-sm">{qr.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">QR Code</span>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-center h-48 overflow-hidden">
                          {qr.imageUrl ? (
                            <img
                              src={qr.imageUrl}
                              alt={qr.title}
                              className="w-full h-full object-contain rounded-xl"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">No Image</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setEditingPaymentQR(qr);
                            setPaymentTitleInput(qr.title);
                            setPaymentImgInput(qr.imageUrl);
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-100"
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeletePaymentQR(qr.id)}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-rose-100"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 7: ADD TEAM MEMBER */}
        {activeSection === 'members' && isMasterAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={22} />
                <span>Add Team Member</span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Add email address of members who can access Orders and Deposits in Admin Panel
              </p>
            </div>

            {/* Form Card */}
            <form
              onSubmit={handleAddMemberSubmit}
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Member Email Address
                </label>
                <input
                  type="email"
                  value={memberEmailInput}
                  onChange={(e) => setMemberEmailInput(e.target.value)}
                  placeholder="e.g. staff@gmail.com"
                  id="add-member-email-input"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  required
                />
              </div>

              {memberMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold ${
                    memberMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {memberMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={memberAddLoading}
                id="add-member-submit-btn"
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <UserPlus size={16} />
                <span>{memberAddLoading ? 'Adding...' : 'Add Member'}</span>
              </button>
            </form>

            {/* List of Added Team Members */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 px-1">
                Authorized Members List ({teamMembersList.length})
              </h3>

              {teamMembersList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
                  <Shield className="mx-auto text-slate-300" size={36} />
                  <p className="text-sm font-bold text-slate-700">No Team Members Added</p>
                  <p className="text-xs text-slate-400">
                    Only the master admin account has access right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {teamMembersList.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black shrink-0">
                          {m.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-sm truncate">{m.email}</p>
                          <span className="inline-block mt-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
                            Orders & Deposits Access
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMember(m.id, m.email)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer border border-rose-200 shrink-0"
                        title="Remove Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 8: GAME DESCRIPTION MANAGEMENT */}
        {activeSection === 'game_description' && isMasterAdmin && (
          <div className="space-y-6">
            {!selectedDescGame ? (
              /* All Available Games List */
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xs">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Game Descriptions</h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Select a game below to write, edit, or delete its description displayed on the topup page.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gamesList.map((game) => {
                    const hasDesc = !!(game.description && game.description.trim().length > 0);
                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          setSelectedDescGame(game);
                          setDescInput(game.description || '');
                        }}
                        id={`select-desc-game-${game.id}`}
                        className="bg-slate-50 border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-md group"
                      >
                        <div className="flex items-center gap-3">
                          {game.coverImg ? (
                            <img
                              src={game.coverImg}
                              alt={game.title}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                              {game.icon || '🎮'}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                              {game.title}
                            </h4>
                            <span
                              className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                                hasDesc
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {hasDesc ? '✓ Description Set' : 'No Description'}
                            </span>
                          </div>
                        </div>

                        {hasDesc && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-3 pt-2 border-t border-slate-200/60 font-medium">
                            {game.description}
                          </p>
                        )}

                        <button className="mt-3 w-full py-2 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">
                          <Edit2 size={13} />
                          <span>{hasDesc ? 'Edit Description' : 'Write Description'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single Game Description Editor Page */
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xs">
                {/* Header with Back button */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setSelectedDescGame(null)}
                    className="flex items-center gap-2 text-indigo-600 font-extrabold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to All Games</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedDescGame.coverImg && (
                      <img
                        src={selectedDescGame.coverImg}
                        alt={selectedDescGame.title}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                      />
                    )}
                    <span className="font-black text-slate-900 text-base">
                      {selectedDescGame.title}
                    </span>
                  </div>
                </div>

                {/* Description Textarea Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                      Write Description
                    </label>
                    <p className="text-xs text-slate-500 mb-3 font-semibold">
                      This description will be shown to users above the "Select Recharge Package" section on the game page.
                    </p>
                    <textarea
                      rows={6}
                      value={descInput}
                      onChange={(e) => setDescInput(e.target.value)}
                      placeholder="Write game instructions, notes, delivery times, or product description here..."
                      id="game-desc-editor-textarea"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-slate-900 font-semibold text-sm outline-none transition-all shadow-xs"
                    />
                  </div>

                  {descToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                      <Check size={16} />
                      <span>{descToast}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleDeleteGameDescription}
                      disabled={descLoading || !selectedDescGame.description}
                      id="delete-desc-btn"
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                      <span>Delete Description</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDescGame(null)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveGameDescription}
                        disabled={descLoading}
                        id="save-desc-btn"
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <Check size={15} />
                        <span>{descLoading ? 'Saving...' : 'Save Description'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    Category
                  </label>
                  {categoriesList.length > 0 ? (
                    <select
                      value={gameCategoryInput}
                      onChange={(e) => setGameCategoryInput(e.target.value)}
                      id="game-category-select"
                      className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      <option value="">-- Select Category --</option>
                      {categoriesList.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={gameCategoryInput}
                      onChange={(e) => setGameCategoryInput(e.target.value)}
                      placeholder="e.g. Popular Games, Direct Topup"
                      id="game-category-input"
                      className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Upload Game Logo Image
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-all text-center">
                    <Upload size={22} className="text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Click to Upload Game Logo</span>
                    <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or WEBP from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGameLogoFileUpload}
                      id="game-logo-file-input"
                      className="hidden"
                    />
                  </label>
                </div>

                {gameLogoInput && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={gameLogoInput}
                        alt="Game Logo Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Game Logo Uploaded</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Ready to Save</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGameLogoInput('')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 bg-rose-50 rounded-lg cursor-pointer"
                    >
                      Remove
                    </button>
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
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingProduct ? 'Edit Product' : 'Add Product / Package'}
                </h3>
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setBulkListInput('');
                  }}
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

                {/* BULK LIST PASTE OPTION BELOW PRODUCT PRICE */}
                {!editingProduct && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider block flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-600" />
                        <span>Or Paste Product List (Bulk Import)</span>
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Fast Import
                      </span>
                    </div>

                    <textarea
                      value={bulkListInput}
                      onChange={(e) => setBulkListInput(e.target.value)}
                      placeholder={`Paste product list here, e.g.:\n100 Diamonds - Rs 140\n210 Diamonds - 280\n500 Diamonds = 650\nWeekly Membership : 210`}
                      id="bulk-product-list-textarea"
                      rows={4}
                      className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white resize-y"
                    />

                    {/* LIVE DETECTED PREVIEW & ACTION */}
                    {bulkListInput.trim() && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-extrabold text-indigo-950">
                          <span>Detected Products Preview</span>
                          <span className="bg-indigo-600 text-white font-mono px-2 py-0.5 rounded-full text-[11px]">
                            {parsePastedProductList(bulkListInput).length} items found
                          </span>
                        </div>

                        {parsePastedProductList(bulkListInput).length > 0 ? (
                          <div className="max-h-32 overflow-y-auto space-y-1 divide-y divide-indigo-100/60 pr-1">
                            {parsePastedProductList(bulkListInput).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs pt-1 first:pt-0">
                                <span className="font-bold text-slate-800 truncate">{item.name}</span>
                                <span className="font-mono font-black text-indigo-700 shrink-0 ml-2">RS {item.price}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 font-medium italic">
                            No valid products detected yet. Ensure each line has product title and price (e.g. 100 Diamonds - Rs 140).
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleDetectAndAddProducts}
                          disabled={bulkImportLoading || parsePastedProductList(bulkListInput).length === 0}
                          id="detect-add-products-btn"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                        >
                          <Sparkles size={14} />
                          <span>
                            {bulkImportLoading
                              ? 'Adding Products...'
                              : `Detect & Add Products (${parsePastedProductList(bulkListInput).length})`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setBulkListInput('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={!prodNameInput.trim() || !prodPriceInput.trim()}
                  id="save-product-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  Save Single Product
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT BANNER */}
      <AnimatePresence>
        {isBannerModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </h3>
                <button
                  onClick={() => setIsBannerModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Upload Banner File */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Upload Banner Image
                  </label>
                  <label className="flex flex-col items-center justify-center p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-all text-center">
                    <Upload size={24} className="text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Click to Upload Banner Image</span>
                    <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or WEBP from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFileUpload}
                      id="banner-file-upload-input"
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Banner Image URL Option */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Or Banner Image URL
                  </label>
                  <input
                    type="text"
                    value={bannerImageUrlInput}
                    onChange={(e) => setBannerImageUrlInput(e.target.value)}
                    placeholder="e.g. https://example.com/banner.jpg"
                    id="banner-url-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Redirect Link (Optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Redirect / Target Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={bannerRedirectInput}
                    onChange={(e) => setBannerRedirectInput(e.target.value)}
                    placeholder="e.g. https://chat.whatsapp.com/..."
                    id="banner-redirect-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Live Banner Preview */}
                {bannerImageUrlInput && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                    <p className="text-xs font-bold text-indigo-300">Live Banner Preview:</p>
                    <div className="relative rounded-xl overflow-hidden h-36 border border-slate-800 flex items-center justify-center">
                      <img
                        src={bannerImageUrlInput}
                        alt="Banner Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={bannerLoading || !bannerImageUrlInput.trim()}
                  id="save-banner-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50 transition-all"
                >
                  {bannerLoading ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT PAYMENT QR */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingPaymentQR ? 'Edit Payment QR Code' : 'Add New Payment QR Code'}
                </h3>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Payment Provider Title
                  </label>
                  <input
                    type="text"
                    value={paymentTitleInput}
                    onChange={(e) => setPaymentTitleInput(e.target.value)}
                    placeholder="e.g. eSewa QR, Khalti QR, Bank Deposit QR"
                    id="payment-qr-title-input"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-2xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Upload QR Image
                  </label>
                  <label className="flex flex-col items-center justify-center p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-all text-center">
                    <Upload size={24} className="text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Click to Upload QR Image</span>
                    <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or WEBP from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePaymentQRFileUpload}
                      id="payment-qr-file-input"
                      className="hidden"
                    />
                  </label>
                </div>

                {paymentImgInput && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-xs font-extrabold text-slate-700">QR Image Preview:</p>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center h-48 overflow-hidden">
                      <img
                        src={paymentImgInput}
                        alt="Payment QR Preview"
                        className="h-full w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePaymentQR}
                  disabled={paymentLoading || !paymentImgInput.trim()}
                  id="save-payment-qr-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50 transition-all"
                >
                  {paymentLoading ? 'Saving...' : 'Save Payment QR'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SCREENSHOT PREVIEW WITH DETAILS & APPROVE/REJECT */}
      <AnimatePresence>
        {(selectedScreenshotTx || selectedScreenshot) && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 text-center shadow-2xl flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-white text-left">
                <div>
                  <h3 className="font-black text-white text-base">Payment Screenshot Receipt</h3>
                  {selectedScreenshotTx && (
                    <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">
                      User: {selectedScreenshotTx.userEmail || 'User'} | Amount: RS {selectedScreenshotTx.amount}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedScreenshot(null);
                    setSelectedScreenshotTx(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition-all"
                  title="Close Preview"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Image Container */}
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-black flex items-center justify-center p-2">
                <img
                  src={selectedScreenshotTx?.screenshotUrl || selectedScreenshot!}
                  alt="Payment Screenshot Receipt"
                  className="max-h-[65vh] w-auto object-contain mx-auto rounded-lg shadow-lg"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {selectedScreenshotTx && selectedScreenshotTx.status === 'Pending' ? (
                  <>
                    <button
                      onClick={() => {
                        handleApproveOrder(selectedScreenshotTx);
                        setSelectedScreenshotTx(null);
                        setSelectedScreenshot(null);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md active:scale-95"
                    >
                      <CheckCircle2 size={18} />
                      <span>Approve Deposit</span>
                    </button>
                    <button
                      onClick={() => {
                        handleRejectOrder(selectedScreenshotTx.id);
                        setSelectedScreenshotTx(null);
                        setSelectedScreenshot(null);
                      }}
                      className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 font-black py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
                    >
                      <XCircle size={18} />
                      <span>Reject Deposit</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedScreenshot(null);
                      setSelectedScreenshotTx(null);
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl cursor-pointer transition-all"
                  >
                    Close Preview {selectedScreenshotTx ? `(${selectedScreenshotTx.status})` : ''}
                  </button>
                )}
              </div>
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

      {/* MODAL 6: ADD BALANCE POPUP */}
      <AnimatePresence>
        {addBalanceUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">Add Balance to User</h3>
                <button
                  onClick={() => setAddBalanceUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
                <p className="text-[11px] font-extrabold uppercase text-indigo-500">Target User</p>
                <p className="text-sm font-black text-slate-900">{addBalanceUser.name}</p>
                <p className="text-xs font-mono text-slate-600">{addBalanceUser.email}</p>
                <p className="text-xs font-bold text-emerald-600 mt-1">
                  Current Balance: RS {addBalanceUser.walletBalance}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Amount to Add (RS)
                </label>
                <input
                  type="number"
                  value={addBalanceAmountInput}
                  onChange={(e) => setAddBalanceAmountInput(e.target.value)}
                  placeholder="e.g. 500"
                  id="add-balance-amount-input"
                  className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-black text-lg rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAddBalanceUser(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddBalance}
                  id="confirm-add-balance-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: ADD / EDIT BANNER */}
      <AnimatePresence>
        {isBannerModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </h3>
                <button
                  onClick={() => setIsBannerModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Banner Image (Upload or URL)
                  </label>
                  <input
                    type="text"
                    value={bannerImageUrlInput}
                    onChange={(e) => setBannerImageUrlInput(e.target.value)}
                    placeholder="https://example.com/banner.jpg or upload below"
                    id="banner-image-url-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />

                  <div className="pt-1">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl cursor-pointer transition-all border border-indigo-100">
                      <Upload size={14} />
                      <span>Upload Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {bannerImageUrlInput && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">
                      Preview
                    </label>
                    <div className="h-40 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                      <img
                        src={bannerImageUrlInput}
                        alt="Banner Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Redirect Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={bannerRedirectInput}
                    onChange={(e) => setBannerRedirectInput(e.target.value)}
                    placeholder="https://example.com or /topup/freefire"
                    id="banner-redirect-link-input"
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsBannerModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBanner}
                  disabled={bannerLoading || !bannerImageUrlInput.trim()}
                  id="save-banner-submit-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  {bannerLoading ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT CATEGORY */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="e.g. Popular Games, Gift Cards, Direct Topup..."
                  id="category-name-modal-input"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!categoryNameInput.trim() || categoryLoading}
                  id="save-category-modal-btn"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  {categoryLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* COPY TOAST FLOATING NOTIFICATION */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Check size={12} />
            </div>
            <span>{copyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
