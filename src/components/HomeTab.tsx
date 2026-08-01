import React, { useState, useEffect } from 'react';
import { Game, AppBanner, Category } from '../types';
import { ExternalLink, Layers, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  games: Game[];
  onSelectGame: (game: Game) => void;
  banners?: AppBanner[];
  categories?: Category[];
}

export const HomeTab: React.FC<Props> = ({ games = [], onSelectGame, banners = [], categories = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);

  // Deduplicate banners by id/imageUrl
  const uniqueBanners = banners.filter((b, index, self) =>
    index === self.findIndex((t) => t.id === b.id || (t.imageUrl && t.imageUrl === b.imageUrl))
  );

  // Auto-slide banners every 4 seconds if more than 1 banner exists
  useEffect(() => {
    if (uniqueBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % uniqueBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [uniqueBanners.length]);

  // Reset index if banners length changes
  useEffect(() => {
    if (currentBannerIndex >= uniqueBanners.length) {
      setCurrentBannerIndex(0);
    }
  }, [uniqueBanners.length, currentBannerIndex]);

  // Filter games based on selected category
  const filteredGames = games.filter((game) => {
    if (selectedCategory === 'all') return true;
    const selectedLower = selectedCategory.toLowerCase().trim();
    const gameCatLower = (game.category || '').toLowerCase().trim();
    const gameTitleLower = (game.title || '').toLowerCase().trim();

    return (
      gameCatLower === selectedLower ||
      gameCatLower.includes(selectedLower) ||
      selectedLower.includes(gameCatLower) ||
      gameTitleLower.includes(selectedLower)
    );
  });

  const activeBanner = uniqueBanners[currentBannerIndex] || uniqueBanners[0];

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Featured Banner (Single View Carousel) */}
      {uniqueBanners.length > 0 && activeBanner && (
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200 group bg-slate-900 transition-all">
          <div
            onClick={() => {
              if (activeBanner.redirectLink) {
                window.open(activeBanner.redirectLink, '_blank', 'noopener,noreferrer');
              } else if (games[0]) {
                onSelectGame(games[0]);
              }
            }}
            className="cursor-pointer relative"
          >
            <img
              src={activeBanner.imageUrl}
              alt="App Banner"
              referrerPolicy="no-referrer"
              className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover transform group-hover:scale-103 transition-transform duration-500"
            />
            {activeBanner.redirectLink && (
              <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md border border-white/20 z-10">
                <span>Visit Link</span>
                <ExternalLink size={13} />
              </div>
            )}
          </div>

          {/* Navigation Arrows for Multiple Banners */}
          {uniqueBanners.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentBannerIndex((prev) => (prev - 1 + uniqueBanners.length) % uniqueBanners.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-900/60 hover:bg-slate-900/90 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/20 shadow-md cursor-pointer z-10"
                aria-label="Previous Banner"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentBannerIndex((prev) => (prev + 1) % uniqueBanners.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900/60 hover:bg-slate-900/90 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/20 shadow-md cursor-pointer z-10"
                aria-label="Next Banner"
              >
                <ChevronRight size={20} />
              </button>

              {/* Pagination Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 z-10">
                {uniqueBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentBannerIndex ? 'w-5 bg-indigo-500' : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Category Pills / Chips (Only shown if categories are added in Admin panel) */}
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
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
              <Gamepad2 size={40} className="text-slate-300 mx-auto" />
              <p className="text-slate-700 font-extrabold text-base">
                No items or games available yet
              </p>
              <p className="text-slate-500 text-xs">
                Add games, top-up products, and categories from the Admin Panel.
              </p>
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
                    <div className={`w-full h-full ${game.bgGradient || 'bg-indigo-600'} flex items-center justify-center text-5xl`}>
                      {game.icon || '🎮'}
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



