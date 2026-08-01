import { Game, Transaction, UserProfile, Category, AppBanner } from '../types';

export const INITIAL_GAMES: Game[] = [
  {
    id: 'game_ff',
    title: 'Free Fire Topup',
    publisher: 'Garena',
    category: 'Direct Topup',
    rating: 4.9,
    icon: '🔥',
    coverImg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    plays: 12500,
    description: 'Instant Free Fire Diamonds Topup via Player ID for Nepal.',
    gameType: 'balloon',
    products: [
      { id: 'ff_p1', name: '100+10 Diamonds', price: 110 },
      { id: 'ff_p2', name: '210+21 Diamonds', price: 210 },
      { id: 'ff_p3', name: '530+53 Diamonds', price: 510 },
      { id: 'ff_p4', name: '1080+108 Diamonds', price: 1020 },
      { id: 'ff_p5', name: 'Weekly Membership', price: 210 },
      { id: 'ff_p6', name: 'Monthly Membership', price: 1050 },
    ],
    requirements: [
      { id: 'ff_r1', name: 'Player ID (UID)', type: 'number' },
    ],
  },
  {
    id: 'game_pubg',
    title: 'PUBG Mobile UC',
    publisher: 'Tencent Games',
    category: 'Direct Topup',
    rating: 4.8,
    icon: '🪖',
    coverImg: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80',
    color: 'from-amber-600 to-yellow-600',
    bgGradient: 'bg-gradient-to-br from-amber-600 to-yellow-600',
    plays: 9800,
    description: 'Instant PUBG Mobile UC Topup via Player ID.',
    gameType: 'balloon',
    products: [
      { id: 'pubg_p1', name: '60 UC', price: 135 },
      { id: 'pubg_p2', name: '325 UC', price: 680 },
      { id: 'pubg_p3', name: '660 UC', price: 1350 },
      { id: 'pubg_p4', name: '1800 UC', price: 3500 },
    ],
    requirements: [
      { id: 'pubg_r1', name: 'Character ID', type: 'number' },
    ],
  },
  {
    id: 'game_mlbb',
    title: 'Mobile Legends MLBB',
    publisher: 'Moonton',
    category: 'Popular Games',
    rating: 4.9,
    icon: '⚔️',
    coverImg: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80',
    color: 'from-blue-600 to-indigo-700',
    bgGradient: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    plays: 8400,
    description: 'Instant Mobile Legends Diamonds & Weekly Pass Topup.',
    gameType: 'balloon',
    products: [
      { id: 'ml_p1', name: '86 Diamonds', price: 180 },
      { id: 'ml_p2', name: '172 Diamonds', price: 350 },
      { id: 'ml_p3', name: '257 Diamonds', price: 520 },
      { id: 'ml_p4', name: 'Weekly Diamond Pass', price: 210 },
    ],
    requirements: [
      { id: 'ml_r1', name: 'User ID', type: 'number' },
      { id: 'ml_r2', name: 'Zone / Server ID', type: 'number' },
    ],
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_PROFILE: UserProfile = {
  name: 'BNY Gamer',
  email: 'mandipmahato717@gmail.com',
  avatar: '👤',
  level: 1,
  coins: 100,
  walletBalance: 0,
  totalSpent: 0,
  soundEnabled: true,
  themeColor: 'purple',
  totalGamesPlayed: 0,
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Direct Topup' },
  { id: 'cat_2', name: 'Popular Games' },
];

export const INITIAL_BANNERS: AppBanner[] = [
  {
    id: 'ban_1',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80',
    redirectLink: '',
    createdAt: new Date().toISOString(),
  },
];



