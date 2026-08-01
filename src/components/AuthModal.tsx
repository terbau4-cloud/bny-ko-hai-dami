import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Mail, Lock, User, Phone, LogIn, UserPlus, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onSuccess: (profileData: UserProfile) => void;
}

export const AuthModal: React.FC<Props> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Full Name is required.');
        return;
      }
      if (!whatsapp.trim()) {
        setError('WhatsApp Number is required.');
        return;
      }
      if (!email.trim()) {
        setError('Email Address is required.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please enter your email and password.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;

        await updateProfile(user, { displayName: fullName.trim() });

        const newUserProfile: UserProfile = {
          uid: user.uid,
          name: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          avatar: '👤',
          level: 1,
          coins: 100,
          walletBalance: 0,
          totalSpent: 0,
          totalGamesPlayed: 0,
          soundEnabled: true,
          themeColor: 'purple',
        };

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          walletBalance: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        });

        onSuccess(newUserProfile);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && !userDocSnap.data()?.isDeleted) {
          const data = userDocSnap.data();
          const loadedProfile: UserProfile = {
            uid: user.uid,
            name: data.fullName || user.displayName || 'BNY Gamer',
            email: data.email || user.email || '',
            whatsapp: data.whatsapp || '',
            avatar: '👤',
            level: 1,
            coins: 100,
            walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 0,
            totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
            totalGamesPlayed: 0,
            soundEnabled: true,
            themeColor: 'purple',
            blocked: !!data.blocked,
          };
          onSuccess(loadedProfile);
        } else {
          await signOut(auth);
          setError('This account has been deleted by Admin and cannot be accessed.');
          return;
        }
      }
    } catch (err: any) {
      console.warn('Firebase Auth Warning:', err?.message || err);
      let msg = 'Authentication failed. Please try again.';
      if (err?.message?.includes('Quota limit exceeded') || err?.code?.includes('quota')) {
        msg = 'Database daily quota limit reached. Creating guest session...';
        const fallbackProfile: UserProfile = {
          uid: `user_offline_${Date.now()}`,
          name: fullName.trim() || email.split('@')[0] || 'Gamer User',
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          avatar: '👤',
          level: 1,
          coins: 100,
          walletBalance: 0,
          totalSpent: 0,
          totalGamesPlayed: 0,
          soundEnabled: true,
          themeColor: 'purple',
        };
        onSuccess(fallbackProfile);
        return;
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered with BNY SHOP. Please sign in instead.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10"
      >
        {/* Banner Header with Logo */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          {/* Logo Container */}
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl mx-auto">
              <div className="w-full h-full bg-slate-900 rounded-[14px] overflow-hidden flex items-center justify-center relative">
                <img
                  src="https://i.ibb.co/Qv0ZyF0w/IMG-20260713-WA0032.jpg"
                  alt="BNY SHOP Logo"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.auth-logo-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="auth-logo-fallback hidden w-full h-full flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white font-black">
                  <span className="text-xl tracking-tighter text-indigo-100 leading-none">BNY</span>
                  <span className="text-[9px] text-rose-300 tracking-widest uppercase leading-none mt-1">SHOP</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow-sm">
              <ShieldCheck size={14} />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            BNY <span className="text-indigo-400">SHOP</span>
          </h1>
          <p className="text-indigo-200/80 text-xs font-semibold mt-1">
            Nepal's Premier Game TopUp & Wallet Portal
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-1.5 bg-slate-100 m-5 mb-2 rounded-2xl flex border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            id="login-tab-btn"
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-600 shadow-md border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            id="register-tab-btn"
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-indigo-600 shadow-md border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="p-6 pt-2 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2.5"
            >
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p>{error}</p>
                {mode === 'register' && error.includes('already registered') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    id="switch-to-login-btn"
                    className="inline-flex items-center gap-1 mt-1 text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                  >
                    Click here to Sign In now →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Registration required fields */}
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    id="register-fullname-input"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-bold text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +977 9800000000"
                    id="register-whatsapp-input"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-bold text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                id="auth-email-input"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                id="auth-password-input"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            id="auth-submit-btn"
            className="w-full mt-3 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn size={18} />
                <span>Sign In to BNY SHOP</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Create BNY Account</span>
              </>
            )}
          </button>

          {/* Switch mode link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500 font-medium">
              {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="text-indigo-600 font-black hover:underline cursor-pointer ml-1"
              >
                {mode === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

