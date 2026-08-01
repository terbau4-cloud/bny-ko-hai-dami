import { Game, Transaction, UserProfile, Category, AppBanner } from '../types';

export const INITIAL_GAMES: Game[] = [];

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

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_BANNERS: AppBanner[] = [];
