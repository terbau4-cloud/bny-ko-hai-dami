import React, { useState } from 'react';
import { Game, AppBanner, Category } from '../types';
import { ExternalLink, Layers, Gamepad2 } from 'lucide-react';

interface Props {
  games: Game[];
  onSelectGame: (game: Game) => void;
  banners?: AppBanner[];
  categories?: Category[];
}

export const HomeTab: React.FC<Props> = ({ games, onSelectGame, banners = [], categories = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const activeBanners = banners.length > 0 ? banners : [];

  // Filter games based on selected category
  const filteredGames = games.filter((game) => {
    if (selectedCategory === 'all') return true;
    if (!game.category) return true; // show by default if no category tagged
    return game.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
  });

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Featured Banner(s) */}
      {activeBanners.length > 0 ? (
        <div className="space-y-4">
          {activeBanners.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                if (b.redirectLink) {
                  window.open(b.redirectLink, '_blank', 'noopener,noreferrer');
                } else if (games[0]) {
                  onSelectGame(games[0]);
                }
              }}
              className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200 group bg-slate-900 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <img
                src={b.imageUrl}
                alt="App Banner"
                referrerPolicy="no-referrer"
                className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              {b.redirectLink && (
                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md border border-white/20">
                  <span>Visit Link</span>
                  <ExternalLink size={13} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-800 bg-slate-900 h-48 sm:h-64 md:h-80 lg:h-96 animate-pulse flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading BNY SHOP Banner...</span>
          </div>
        </div>
      )}

      {/* Category Pills / Chips (from Admin added categories) */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              <span>Categories</span>
            </h4>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-102'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Gamepad2 size={14} />
              <span>All Items</span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-102'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Layers size={14} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Games Top-Up Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
          <span>
            {selectedCategory === 'all'
              ? 'Popular Games'
              : `${selectedCategory}`}
          </span>
        </h3>

        {filteredGames.length === 0 ? (
          games.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border-2 border-slate-800 animate-pulse flex flex-col justify-between"
                >
                  <div className="aspect-square bg-slate-800" />
                  <div className="p-4 bg-slate-900 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
              <Gamepad2 size={36} className="text-slate-300 mx-auto" />
              <p className="text-slate-700 font-extrabold text-sm">
                No games currently in "{selectedCategory}"
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                View All Items
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => onSelectGame(game)}
                id={`topup-card-${game.id}`}
                className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border-2 border-slate-800 hover:border-amber-400 transition-all group cursor-pointer flex flex-col justify-between hover:scale-[1.03] active:scale-95"
              >
                {/* Cover image or logo graphic */}
                <div className="relative aspect-square overflow-hidden bg-slate-800 flex items-center justify-center">
                  {game.coverImg ? (
                    <img
                      src={game.coverImg}
                      alt={game.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full ${game.bgGradient} flex items-center justify-center text-5xl`}>
                      {game.icon}
                    </div>
                  )}
                  {/* Subtle Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70" />
                </div>

                {/* Title only */}
                <div className="p-4 bg-slate-900 text-white">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                    {game.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


