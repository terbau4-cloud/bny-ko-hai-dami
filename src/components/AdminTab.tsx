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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, Game, GameRequirement, TopupProduct, AppBanner, TeamMember } from '../types';
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

export const AdminTab: React.FC<Props> = ({ adminEmail, teamMembers = [] }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'orders' | 'deposits' | 'games' | 'banner' | 'members'>('overview');

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
  const [gamesList, setGamesList] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedScreenshotTx, setSelectedScreenshotTx] = useState<Transaction | null>(null);
  const [copyToast, setCopyToast] = useState<string>('');

  // Banners & Team Members state
  const [bannersList, setBannersList] = useState<AppBanner[]>([]);
  const [teamMembersList, setTeamMembersList] = useState<TeamMember[]>([]);

  // Add/Edit Banner Modal state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<AppBanner | null>(null);
  const [bannerImageUrlInput, setBannerImageUrlInput] = useState<string>('');
  const [bannerRedirectInput, setBannerRedirectInput] = useState<string>('');
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);

  // Add Member state
  const [memberEmailInput, setMemberEmailInput] = useState<string>('');
  const [memberMsg, setMemberMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberAddLoading, setMemberAddLoading] = useState<boolean>(false);

  // Firestore listeners for banners & team_members
  useEffect(() => {
    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      const list: AppBanner[] = snap.docs.map((d) => ({
        id: d.id,
        imageUrl: d.data().imageUrl || '',
        redirectLink: d.data().redirectLink || '',
        createdAt: d.data().createdAt || '',
      }));
      setBannersList(list);
    });

    const unsubMembers = onSnapshot(collection(db, 'team_members'), (snap) => {
      const list: TeamMember[] = snap.docs.map((d) => ({
        id: d.id,
        email: d.data().email || '',
        createdAt: d.data().createdAt || '',
      }));
      setTeamMembersList(list);
    });

    return () => {
      unsubBanners();
      unsubMembers();
    };
  }, []);

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

      const allGames = gamesList.length > 0 ? gamesList : INITIAL_GAMES;
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
          blocked: Boolean(data.blocked),
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
          gameId: data.gameId,
          gameTitle: data.gameTitle,
          gameIcon: data.gameIcon,
          productName: data.productName,
          productPrice: data.productPrice,
          quantity: data.quantity,
          playerId: data.playerId,
          userEmail: data.userEmail || '',
          requirementsData: data.requirementsData || [],
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

    // Listen for live updates on users
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(
      qUsers,
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
      },
      (err) => console.error('Admin live users error:', err)
    );

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
            gameId: data.gameId,
            gameTitle: data.gameTitle,
            gameIcon: data.gameIcon,
            productName: data.productName,
            productPrice: data.productPrice,
            quantity: data.quantity,
            playerId: data.playerId,
            userEmail: data.userEmail || '',
            requirementsData: data.requirementsData || [],
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
      unsubscribeUsers();
      unsubscribeTx();
      unsubscribeGames();
    };
  }, []);

  // Filtered stats
  const totalUsersCount = usersList.length;
  const totalOrdersCount = transactionsList.filter((t) => t.type !== 'deposit').length;
  const pendingOrdersList = transactionsList.filter((t) => t.type !== 'deposit' && t.status === 'Pending');
  const pendingOrdersCount = pendingOrdersList.length;

  const totalDepositsCount = transactionsList.filter((t) => t.type === 'deposit').length;
  const pendingDepositsCount = transactionsList.filter((t) => t.type === 'deposit' && t.status === 'Pending').length;

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

  // ================= BANNER HANDLERS =================
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setBannerImageUrlInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async () => {
    if (!bannerImageUrlInput.trim()) return;
    setBannerLoading(true);
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), {
          imageUrl: bannerImageUrlInput.trim(),
          redirectLink: bannerRedirectInput.trim(),
        });
      } else {
        const bannerId = `banner_${Date.now()}`;
        await setDoc(doc(db, 'banners', bannerId), {
          imageUrl: bannerImageUrlInput.trim(),
          redirectLink: bannerRedirectInput.trim(),
          createdAt: new Date().toISOString(),
        });
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      setBannerImageUrlInput('');
      setBannerRedirectInput('');
    } catch (err) {
      console.error('Error saving banner:', err);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', bannerId));
    } catch (err) {
      console.error('Error deleting banner:', err);
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
                    {pendingOrdersCount > 0 ? (
                      <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                        {pendingOrdersCount}
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {totalOrdersCount}
                      </span>
                    )}
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
                    {pendingDepositsCount > 0 ? (
                      <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                        {pendingDepositsCount}
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {totalDepositsCount}
                      </span>
                    )}
                  </button>

                  {isMasterAdmin && (
                    <>
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
                    </>
                  )}
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

        {/* SECTION: OVERVIEW PENDING ORDERS QUICK VIEW */}
        {activeSection === 'overview' && (
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
                {pendingOrdersList.map((tx) => {
                  const reqs = getRequirementsList(tx);
                  return (
                    <div
                      key={tx.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {tx.orderId || 'ORDER'}
                          </span>
                          <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Pending
                          </span>
                          <span className="text-xs font-bold text-slate-400">{tx.time}</span>
                          {tx.userEmail && (
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/50">
                              ✉️ {tx.userEmail}
                            </span>
                          )}
                        </div>

                        <div className="text-base font-black text-slate-900">
                          {tx.gameTitle ? `${tx.gameTitle} - ` : ''}
                          {tx.productName || tx.description}
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

                      {tx.screenshotUrl && (
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScreenshotTx(tx);
                              setSelectedScreenshot(tx.screenshotUrl || null);
                            }}
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
                  );
                })}
              </div>
            )}
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
                  {filteredDeposits.map((tx) => (
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

                        <div className="text-base font-black text-slate-900">
                          {tx.description === 'Wallet Deposit via QR Payment' ? 'Wallet Deposit' : (tx.description?.replace(/via QR Payment/gi, '').trim() || 'Wallet Deposit')}
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
                  ))}
                </div>
              );
            })()}
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
                      <div className="relative aspect-[21/9] bg-slate-100 overflow-hidden border-b border-slate-100">
                        <img
                          src={banner.imageUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
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
                    <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={bannerImageUrlInput}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
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
