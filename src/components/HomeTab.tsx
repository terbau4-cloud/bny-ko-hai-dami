import React from 'react';
import { Game, AppBanner } from '../types';
import { ExternalLink } from 'lucide-react';

interface Props {
  games: Game[];
  onSelectGame: (game: Game) => void;
  banners?: AppBanner[];
}

export const HomeTab: React.FC<Props> = ({ games, onSelectGame, banners = [] }) => {
  const activeBanners = banners.length > 0 ? banners : [];

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

      {/* Games Top-Up Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
          Popular Games
        </h3>

        {games.length === 0 ? (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {games.map((game) => (
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


