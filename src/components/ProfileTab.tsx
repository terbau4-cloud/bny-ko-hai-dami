import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Wallet, CreditCard, Mail, User, Phone, LogOut, Key, Lock, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  profile: UserProfile;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onSignOut?: () => void;
}

export const ProfileTab: React.FC<Props> = ({ profile, onSignOut }) => {
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onSignOut) onSignOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Wrong password');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Password didn't match");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      const emailToUse = user?.email || profile.email;

      if (!user || !emailToUse) {
        setErrorMsg('User session not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(emailToUse, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      setSuccessMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setShowPasswordModal(false);
        setSuccessMsg('');
      }, 1600);
    } catch (err: any) {
      const errCode = err?.code || '';
      if (
        errCode === 'auth/wrong-password' ||
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/invalid-password' ||
        errCode.includes('password') ||
        errCode.includes('credential')
      ) {
        setErrorMsg('Wrong password');
      } else {
        setErrorMsg('Wrong password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
        {/* Circle Avatar / Logo */}
        <div className="w-28 h-28 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md border-4 border-indigo-100">
          <User size={56} className="stroke-[2.5]" />
        </div>

        {/* Name */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
          
          {/* Email */}
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 mt-1">
            <Mail size={15} className="text-slate-400" />
            <span>{profile.email || 'user@example.com'}</span>
          </div>

          {/* WhatsApp if available */}
          {profile.whatsapp && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit mx-auto mt-2 border border-emerald-200">
              <Phone size={13} />
              <span>WhatsApp: {profile.whatsapp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards: Wallet Balance & Total Spent */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wallet Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <Wallet size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Wallet Balance</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              RS {profile.walletBalance}
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Spent</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              RS {profile.totalSpent || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Change Password & Sign Out */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(true);
          }}
          id="change-password-btn"
          className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-2xl border border-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Key size={18} />
          <span>Change Password</span>
        </button>

        <button
          onClick={handleSignOut}
          id="profile-signout-btn"
          className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-2xl border border-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <LogOut size={18} />
          <span>Sign Out of Account</span>
        </button>
      </div>

      {/* CHANGE PASSWORD POPUP MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Change Password</h3>
                    <p className="text-[11px] font-medium text-slate-400">Update your account security</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Success / Error Messages */}
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-left">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Enter current password"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPassword(val);
                        if (confirmPassword && val !== confirmPassword) {
                          setErrorMsg("Password didn't match");
                        } else if (val && val.length < 6) {
                          setErrorMsg("New password must be at least 6 characters.");
                        } else {
                          setErrorMsg('');
                        }
                      }}
                      placeholder="Enter new password"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfirmPassword(val);
                        if (val && val !== newPassword) {
                          setErrorMsg("Password didn't match");
                        } else if (newPassword && newPassword.length < 6) {
                          setErrorMsg("New password must be at least 6 characters.");
                        } else {
                          setErrorMsg('');
                        }
                      }}
                      placeholder="Re-enter new password"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

