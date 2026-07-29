export type TabType = 'home' | 'wallet' | 'history' | 'profile';

export interface TopupProduct {
  id: string;
  name: string;
  price: number;
  badge?: string;
}

export interface Game {
  id: string;
  title: string;
  publisher?: string;
  category: 'arcade' | 'puzzle' | 'action' | 'sports';
  rating: number;
  icon: string;
  coverImg?: string;
  color: string;
  bgGradient: string;
  plays: number;
  description: string;
  gameType: 'memory' | 'balloon' | 'tictactoe' | 'whack' | 'snake';
  products?: TopupProduct[];
}

export interface Transaction {
  id: string;
  orderId?: string; // e.g. BNY-84920183
  type: 'deposit' | 'game_reward' | 'purchase';
  amount: number;
  date: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Approved' | 'Rejected';
  screenshotUrl?: string;
  description: string;
  gameTitle?: string;
  gameIcon?: string;
  gameCoverImg?: string;
  productName?: string;
  productPrice?: number;
  quantity?: number;
  playerId?: string;
}

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  whatsapp?: string;
  avatar: string;
  level: number;
  coins: number;
  walletBalance: number;
  totalSpent: number;
  totalGamesPlayed: number;
  soundEnabled: boolean;
  themeColor: 'purple' | 'blue' | 'emerald' | 'amber';
}

