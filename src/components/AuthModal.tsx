import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
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
        // Register user with Firebase Auth
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;

        // Update display name
        await updateProfile(user, { displayName: fullName.trim() });

        const newUserProfile: UserProfile = {
          uid: user.uid,
          name: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          avatar: '👤',
          level: 1,
          coins: 100,
          walletBalance: 850,
          totalSpent: 0,
          totalGamesPlayed: 0,
          soundEnabled: true,
          themeColor: 'purple',
        };

        // Save profile to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          walletBalance: 850,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        });

        onSuccess(newUserProfile);
      } else {
        // Login user
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;

        // Fetch user document from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const loadedProfile: UserProfile = {
            uid: user.uid,
            name: data.fullName || user.displayName || 'Gamer User',
            email: data.email || user.email || '',
            whatsapp: data.whatsapp || '',
            avatar: '👤',
            level: 1,
            coins: 100,
            walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 850,
            totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
            totalGamesPlayed: 0,
            soundEnabled: true,
            themeColor: 'purple',
          };
          onSuccess(loadedProfile);
        } else {
          // Fallback if doc doesn't exist
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'Gamer User',
            email: user.email || email.trim(),
            whatsapp: '',
            avatar: '👤',
            level: 1,
            coins: 100,
            walletBalance: 850,
            totalSpent: 0,
            totalGamesPlayed: 0,
            soundEnabled: true,
            themeColor: 'purple',
          };

          await setDoc(userDocRef, {
            uid: user.uid,
            fullName: fallbackProfile.name,
            email: fallbackProfile.email,
            whatsapp: '',
            walletBalance: 850,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
          });

          onSuccess(fallbackProfile);
        }
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let msg = 'Authentication failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in.';
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20 shadow-inner">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Benny Topup Nepal</h1>
          <p className="text-indigo-100 text-xs font-medium mt-1">
            Sign in to manage your gaming topups & wallet balance
          </p>
        </div>

        {/* Tab Selector: Login vs Register */}
        <div className="p-2 bg-slate-100 m-6 mb-2 rounded-2xl flex border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            id="login-tab-btn"
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn size={16} />
            <span>Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            id="register-tab-btn"
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAuthSubmit} className="p-6 pt-4 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Register-only fields */}
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-semibold text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-semibold text-sm outline-none transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-semibold text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 font-semibold text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            id="auth-submit-btn"
            className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-base rounded-2xl shadow-md hover:shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn size={18} />
                <span>Sign In to Account</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Create New Account</span>
              </>
            )}
          </button>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 font-medium pt-2">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              {mode === 'login' ? 'Register Now' : 'Sign In'}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};
