import React, { useState, useEffect } from 'react';
import { Game } from '../types';
import { X, RefreshCw, Trophy, Sparkles, Volume2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  game: Game | null;
  onClose: () => void;
  onRewardCoins: (amount: number) => void;
}

export const MiniGamesModal: React.FC<Props> = ({ game, onClose, onRewardCoins }) => {
  if (!game) return null;

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const handleFinishGame = (finalScore: number) => {
    setScore(finalScore);
    setGameOver(true);
    const reward = Math.max(5, Math.floor(finalScore / 2));
    if (!rewardClaimed) {
      onRewardCoins(reward);
      setRewardClaimed(true);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    setRewardClaimed(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-purple-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-4 ${game.bgGradient} text-white flex items-center justify-between shadow-md`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-white/20 p-2 rounded-2xl backdrop-blur-md">{game.icon}</span>
            <div>
              <h2 className="text-xl font-bold font-sans tracking-wide">{game.title}</h2>
              <p className="text-xs text-white/90 font-medium">Game Top-Up Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-game-btn"
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xl transition-all active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* Game Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col items-center justify-center min-h-[360px]">
          {gameOver ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 px-4 w-full"
            >
              <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-300 shadow-inner">
                <Trophy size={44} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-1">Awesome Job! 🎉</h3>
              <p className="text-slate-500 font-medium mb-4">You scored <span className="font-bold text-purple-600 text-xl">{score}</span> points!</p>
              
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
                <Sparkles size={24} className="text-amber-500 animate-spin" />
                <span className="text-amber-800 font-bold text-lg">+RS {Math.max(5, Math.floor(score / 2))} Reward Added To Wallet!</span>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  id="play-again-btn"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-200 flex items-center gap-2 text-base transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={18} /> Play Again
                </button>
                <button
                  onClick={onClose}
                  id="exit-game-btn"
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
                >
                  Back to Games
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {game.gameType === 'balloon' && <BalloonPopGame onFinish={handleFinishGame} />}
              {game.gameType === 'memory' && <MemoryGame onFinish={handleFinishGame} />}
              {game.gameType === 'tictactoe' && <TicTacToeGame onFinish={handleFinishGame} />}
              {game.gameType === 'whack' && <WhackStarGame onFinish={handleFinishGame} />}
              {game.gameType === 'snake' && <SnakeGame onFinish={handleFinishGame} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* 🎈 Balloon Pop Game Component */
const BalloonPopGame: React.FC<{ onFinish: (score: number) => void }> = ({ onFinish }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [balloons, setBalloons] = useState<{ id: number; color: string; left: number; top: number; emoji: string }[]>([]);

  useEffect(() => {
    const colors = ['bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-amber-400', 'bg-emerald-400', 'bg-red-400'];
    const emojis = ['🎈', '🎈', '🎈', '🎉', '⭐'];

    const spawnInterval = setInterval(() => {
      if (timeLeft > 0) {
        setBalloons((prev) => [
          ...prev.slice(-8),
          {
            id: Date.now() + Math.random(),
            color: colors[Math.floor(Math.random() * colors.length)],
            left: Math.floor(Math.random() * 75) + 5,
            top: Math.floor(Math.random() * 65) + 10,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
          },
        ]);
      }
    }, 800);

    return () => clearInterval(spawnInterval);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onFinish(score);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, score, onFinish]);

  const popBalloon = (id: number) => {
    setScore((s) => s + 5);
    setBalloons((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center bg-purple-100 p-3 rounded-2xl mb-4 font-bold text-slate-700">
        <span className="text-base text-purple-800">Score: <span className="text-xl text-purple-600">{score}</span></span>
        <span className="text-base text-amber-800">Time: <span className="text-xl text-amber-600">{timeLeft}s</span></span>
      </div>

      <div className="relative w-full h-64 bg-sky-100 rounded-2xl border-2 border-sky-200 overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        {balloons.map((b) => (
          <button
            key={b.id}
            onClick={() => popBalloon(b.id)}
            style={{ left: `${b.left}%`, top: `${b.top}%` }}
            className={`absolute w-12 h-14 ${b.color} rounded-full text-2xl flex items-center justify-center shadow-lg transform active:scale-125 transition-transform cursor-pointer animate-bounce`}
          >
            {b.emoji}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-2 font-medium">Tap balloons as fast as you can!</p>
    </div>
  );
};

/* 🧩 Memory Matching Game */
const MemoryGame: React.FC<{ onFinish: (score: number) => void }> = ({ onFinish }) => {
  const cardEmojis = ['🦄', '🚀', '🍕', '🍦', '🎮', '⭐'];
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const deck = [...cardEmojis, ...cardEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, flipped: false, matched: false }));
    setCards(deck);
  }, []);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setCards(newCards);
        setFlippedIndices([]);
        const newMatches = matches + 1;
        setMatches(newMatches);
        if (newMatches === cardEmojis.length) {
          setTimeout(() => onFinish(Math.max(10, 50 - moves * 2)), 600);
        }
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards(newCards);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center bg-indigo-100 p-3 rounded-2xl mb-4 font-bold text-slate-700">
        <span className="text-base text-indigo-800">Matches: <span className="text-xl text-indigo-600">{matches}/{cardEmojis.length}</span></span>
        <span className="text-base text-purple-800">Moves: <span className="text-xl text-purple-600">{moves}</span></span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 w-full max-w-xs">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            className={`w-16 h-16 rounded-2xl font-bold text-2xl flex items-center justify-center shadow-md transition-all transform active:scale-95 cursor-pointer border-2 ${
              card.flipped || card.matched
                ? 'bg-white border-purple-400 rotate-0'
                : 'bg-indigo-500 border-indigo-600 text-transparent'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ❌ Tic Tac Toe Game */
const TicTacToeGame: React.FC<{ onFinish: (score: number) => void }> = ({ onFinish }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let line of lines) {
      const [a, bIdx, c] = line;
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    if (b.every((cell) => cell !== null)) return 'Draw';
    return null;
  };

  const handleClick = (idx: number) => {
    if (board[idx] || winner) return;

    const newBoard = [...board];
    newBoard[idx] = '❌';
    setBoard(newBoard);

    const win = checkWinner(newBoard);
    if (win) {
      setWinner(win);
      setTimeout(() => onFinish(win === '❌' ? 30 : 10), 1000);
      return;
    }

    // AI move
    setTimeout(() => {
      const emptyIndices = newBoard
        .map((val, i) => (val === null ? i : null))
        .filter((val): val is number => val !== null);
      if (emptyIndices.length > 0) {
        const aiChoice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        newBoard[aiChoice] = '⭕';
        setBoard(newBoard);
        const aiWin = checkWinner(newBoard);
        if (aiWin) {
          setWinner(aiWin);
          setTimeout(() => onFinish(aiWin === '❌' ? 30 : 10), 1000);
        }
      }
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mb-4 text-lg font-bold text-slate-700 bg-sky-100 px-4 py-2 rounded-xl">
        {winner ? (winner === 'Draw' ? "It's a Tie! 🤝" : `${winner} Wins! 🎉`) : "Your Turn: ❌"}
      </div>

      <div className="grid grid-cols-3 gap-3 bg-sky-200 p-3 rounded-2xl shadow-inner border-2 border-sky-300">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className="w-20 h-20 bg-white rounded-xl text-3xl font-bold flex items-center justify-center shadow-sm hover:bg-sky-50 active:scale-95 transition-all cursor-pointer"
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ⭐ Whack A Star Game */
const WhackStarGame: React.FC<{ onFinish: (score: number) => void }> = ({ onFinish }) => {
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);

  useEffect(() => {
    if (timeLeft <= 0) {
      onFinish(score);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, score, onFinish]);

  useEffect(() => {
    const holeInterval = setInterval(() => {
      setActiveHole(Math.floor(Math.random() * 9));
    }, 650);
    return () => clearInterval(holeInterval);
  }, []);

  const whack = (idx: number) => {
    if (idx === activeHole) {
      setScore((s) => s + 10);
      setActiveHole(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center bg-amber-100 p-3 rounded-2xl mb-4 font-bold text-slate-700">
        <span className="text-base text-amber-900">Score: <span className="text-xl text-amber-600">{score}</span></span>
        <span className="text-base text-orange-900">Time: <span className="text-xl text-orange-600">{timeLeft}s</span></span>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-amber-200 p-4 rounded-3xl border-2 border-amber-300 shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => whack(idx)}
            className="w-20 h-20 bg-amber-900/20 rounded-full relative overflow-hidden flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            {activeHole === idx && (
              <span className="text-4xl animate-bounce">⭐</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 🐍 Hungry Snake Game */
const SnakeGame: React.FC<{ onFinish: (score: number) => void }> = ({ onFinish }) => {
  const [score, setScore] = useState(0);

  return (
    <div className="w-full flex flex-col items-center text-center py-2">
      <p className="text-sm font-semibold text-emerald-800 mb-3 bg-emerald-100 px-3 py-1.5 rounded-xl">Tap the star apples to feed the hungry snake!</p>
      
      <div className="relative w-64 h-64 bg-emerald-950 rounded-2xl p-4 flex flex-col items-center justify-between border-4 border-emerald-600 shadow-xl">
        <div className="text-white text-sm font-bold w-full flex justify-between">
          <span>Score: {score}</span>
          <span>🐍 Snake Length: {3 + Math.floor(score/10)}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 w-full my-auto">
          {Array.from({ length: 15 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setScore((s) => s + 10)}
              className="p-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-xl flex items-center justify-center transition-all cursor-pointer active:scale-110"
            >
              {i === score % 15 ? '🍎' : i % 3 === 0 ? '🟩' : '🟢'}
            </button>
          ))}
        </div>

        <button
          onClick={() => onFinish(score + 20)}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md"
        >
          Finish Game & Claim Reward
        </button>
      </div>
    </div>
  );
};
