import { Game, Transaction, UserProfile, Category, AppBanner } from '../types';

export const INITIAL_GAMES: Game[] = [
  {
    id: 'game_ff',
    title: 'Free Fire',
    publisher: 'Garena',
    category: 'Topup',
    rating: 4.9,
    icon: '🔥',
    coverImg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    color: 'from-orange-600 to-amber-600',
    bgGradient: 'bg-gradient-to-br from-orange-600 to-amber-700',
    plays: 12500,
    description: 'Instant Free Fire Diamonds Topup in Nepal. Fast & Automated Delivery.',
    gameType: 'topup',
    products: [
      { id: 'ff_100', name: '115 Diamonds', price: 120 },
      { id: 'ff_240', name: '240 Diamonds', price: 240 },
      { id: 'ff_610', name: '610 Diamonds', price: 580 },
      { id: 'ff_1080', name: '1090 Diamonds', price: 1050 },
      { id: 'ff_weekly', name: 'Weekly Membership', price: 220 },
      { id: 'ff_monthly', name: 'Monthly Membership', price: 950 },
    ],
    requirements: [{ id: 'req_1', name: 'Player ID (UID)', type: 'number' }],
  },
  {
    id: 'game_pubg',
    title: 'PUBG Mobile',
    publisher: 'Tencent Games',
    category: 'Topup',
    rating: 4.8,
    icon: '🪂',
    coverImg: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    color: 'from-amber-500 to-yellow-600',
    bgGradient: 'bg-gradient-to-br from-amber-500 to-yellow-700',
    plays: 9800,
    description: 'Official PUBG Mobile Unknown Cash (UC) Reload. Instant Delivery.',
    gameType: 'topup',
    products: [
      { id: 'pubg_60', name: '60 UC', price: 135 },
      { id: 'pubg_325', name: '325 UC', price: 650 },
      { id: 'pubg_660', name: '660 UC', price: 1280 },
      { id: 'pubg_1800', name: '1800 UC', price: 3400 },
    ],
    requirements: [{ id: 'req_1', name: 'Character ID', type: 'number' }],
  },
  {
    id: 'game_mlbb',
    title: 'Mobile Legends',
    publisher: 'Moonton',
    category: 'Topup',
    rating: 4.7,
    icon: '⚔️',
    coverImg: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    color: 'from-blue-600 to-indigo-600',
    bgGradient: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    plays: 7400,
    description: 'Mobile Legends Bang Bang Diamonds Topup. Fast & Reliable.',
    gameType: 'topup',
    products: [
      { id: 'ml_86', name: '86 Diamonds', price: 180 },
      { id: 'ml_172', name: '172 Diamonds', price: 350 },
      { id: 'ml_257', name: '257 Diamonds', price: 520 },
      { id: 'ml_pass', name: 'Weekly Diamond Pass', price: 230 },
    ],
    requirements: [
      { id: 'req_1', name: 'User ID', type: 'number' },
      { id: 'req_2', name: 'Zone ID', type: 'number' },
    ],
  },
  {
    id: 'game_roblox',
    title: 'Roblox Robux',
    publisher: 'Roblox Corp',
    category: 'Vouchers',
    rating: 4.9,
    icon: '🧱',
    coverImg: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    color: 'from-rose-600 to-red-600',
    bgGradient: 'bg-gradient-to-br from-rose-600 to-red-700',
    plays: 6200,
    description: 'Roblox Robux digital codes & direct topup for gamers.',
    gameType: 'topup',
    products: [
      { id: 'rb_80', name: '80 Robux', price: 160 },
      { id: 'rb_400', name: '400 Robux', price: 750 },
      { id: 'rb_800', name: '800 Robux', price: 1450 },
    ],
    requirements: [{ id: 'req_1', name: 'Roblox Username', type: 'text' }],
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
  { id: 'cat_topup', name: 'Topup', createdAt: new Date().toISOString() },
  { id: 'cat_vouchers', name: 'Vouchers', createdAt: new Date().toISOString() },
  { id: 'cat_giftcards', name: 'Gift Cards', createdAt: new Date().toISOString() },
];

export const INITIAL_BANNERS: AppBanner[] = [
  {
    id: 'banner_1',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    redirectLink: '',
    createdAt: new Date().toISOString(),
  },
];

