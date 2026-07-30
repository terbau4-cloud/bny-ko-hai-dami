import React from 'react';
import { Game, AppBanner } from '../types';
import { Flame, ArrowRight, ExternalLink } from 'lucide-react';
import gameBannerImg from '../assets/images/game_app_banner_1785291400841.jpg';

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
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200 group bg-slate-900">
          <img
            src={gameBannerImg}
            alt="Game TopUp Banner"
            referrerPolicy="no-referrer"
            className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover transform group-hover:scale-105 transition-transform duration-500 opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/85 via-slate-900/50 to-transparent flex flex-col justify-center p-6 sm:p-8 text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-900 rounded-full font-extrabold text-xs w-fit mb-2 shadow-xs">
              <Flame size={14} className="fill-slate-900" /> INSTANT TOP-UP
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-white">
              BNY Game Top-Up
            </h2>
            <p className="text-indigo-100 text-sm font-medium opacity-90 mb-4">
              Direct ID Recharge & Fast Diamond Delivery.
            </p>
            <button
              onClick={() => games[0] && onSelectGame(games[0])}
              className="bg-white text-indigo-600 px-5 py-2 rounded-full font-bold text-sm shadow-sm w-fit hover:bg-slate-100 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Top Up Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Games Top-Up Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
          Popular Games
        </h3>

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

              {/* Title only - publisher removed as requested */}
              <div className="p-4 bg-slate-900 text-white">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                  {game.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


