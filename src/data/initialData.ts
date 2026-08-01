import { Game, Transaction, UserProfile, Category, AppBanner } from '../types';

export const INITIAL_GAMES: Game[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_101',
    orderId: 'BNY-91823746',
    type: 'purchase',
    amount: 210,
    date: 'Today',
    time: '10:30 AM',
    status: 'Pending',
    description: 'Weekly Diamond Pass x 1',
    gameTitle: 'Weekly Diamond Pass MLBB',
    gameIcon: '💎',
    gameCoverImg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80',
    productName: '1x Weekly Pass',
    productPrice: 210,
    quantity: 1,
    playerId: '98471920',
  },
];

export const INITIAL_PROFILE: UserProfile = {
  name: 'Alex Gamer',
  email: 'mandipmahato717@gmail.com',
  avatar: '👤',
  level: 5,
  coins: 125,
  walletBalance: 0,
  totalSpent: 1280,
  soundEnabled: true,
  themeColor: 'purple',
  totalGamesPlayed: 48,
};

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_BANNERS: AppBanner[] = [];


