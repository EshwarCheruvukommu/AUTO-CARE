import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Palette,
  Car,
  FileText,
  Wrench,
  Fuel,
  Receipt,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  ShieldCheck,
  MessageSquareHeart,
  HelpCircle,
  Download,
  HardDrive,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { useTheme } from '../../context/ThemeContext';
import { SectionVisualHeader } from '../common/SectionVisualHeader';
import { exportFullAccountBackupJSON, exportServicesToCSV, exportFuelToCSV, exportExpensesToCSV } from '../../utils/exportReport';

export const ProfileView: React.FC = () => {
  const { userProfile, currentUser, updateUserProfile, resetPassword, changePassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { 
    vehicles, 
    documents, 
    services, 
    fuelRecords, 
    expenses, 
    allReminders, 
    customRules,
    selectedVehicle 
  } = useVehicle();

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      setExportErrorMessage(null);
      exportFullAccountBackupJSON({
        userEmail: currentUser?.email,
        vehicles,
        services,
        fuelRecords,
        expenses,
        documents,
        reminders: allReminders,
        customRules,
      });
      setExportSuccessMessage(`Backup exported successfully (${vehicles.length} vehicles, ${services.length} services, ${fuelRecords.length} fuel logs).`);
      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportErrorMessage(err?.message || 'Failed to export backup file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Profile Form States
  const [displayName, setDisplayName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [requiresRelogin, setRequiresRelogin] = useState(false);

  // Password Reset Email States
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Logout State
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification Preference State
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('autocare_notifications_enabled') !== 'false';
  });

  // Account Data Statistics (from Firestore)
  const [stats, setStats] = useState<{
    vehicles: number;
    documents: number;
    services: number;
    fuel: number;
    expenses: number;
    reminders: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Sync display name if userProfile changes
  useEffect(() => {
    if (userProfile?.name) {
      setDisplayName(userProfile.name);
    } else if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [userProfile, currentUser]);

  // Load real account statistics from Firestore for currently authenticated user
  useEffect(() => {
    let isMounted = true;

    const loadAccountStats = async () => {
      if (!currentUser) return;
      setLoadingStats(true);

      const fetchCount = async (collectionName: string) => {
        try {
          const q = query(collection(db, collectionName), where('userId', '==', currentUser.uid));
          const snapshot = await getCountFromServer(q);
          return snapshot.data().count;
        } catch (e) {
          try {
            const q = query(collection(db, collectionName), where('userId', '==', currentUser.uid));
            const snapshot = await getDocs(q);
            return snapshot.size;
          } catch {
            return 0;
          }
        }
      };

      try {
        const [vehicles, documents, services, fuel, expenses, reminders] = await Promise.all([
          fetchCount('vehicles'),
          fetchCount('documents'),
          fetchCount('serviceRecords'),
          fetchCount('fuelRecords'),
          fetchCount('expenses'),
          fetchCount('reminders'),
        ]);

        if (isMounted) {
          setStats({
            vehicles,
            documents,
            services,
            fuel,
            expenses,
            reminders,
          });
        }
      } catch (err) {
        console.error('Error loading account statistics:', err);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    loadAccountStats();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // 1. Handle Update Display Name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      setProfileError('');
      setProfileSuccess('');

      await updateUserProfile(trimmed);

      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err: any) {
      setProfileError('Unable to update profile name. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 2. Handle In-App Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setRequiresRelogin(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify and try again.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(newPassword);
      setPasswordSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 6000);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setRequiresRelogin(true);
        setPasswordError('This security action requires recent authentication. Please sign out and log back in, or use the Password Reset Email below.');
      } else if (err?.code === 'auth/weak-password') {
        setPasswordError('Password is too weak. Please choose a stronger password.');
      } else {
        setPasswordError('Failed to change password. Please verify your connection or try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 3. Handle Send Password Reset Email
  const handleSendResetEmail = async () => {
    if (!currentUser?.email) return;
    try {
      setIsSendingReset(true);
      setResetError('');
      setResetSuccess('');
      await resetPassword(currentUser.email);
      setResetSuccess(`Password reset email sent to ${currentUser.email}. Please check your inbox.`);
      setTimeout(() => setResetSuccess(''), 7000);
    } catch (err: any) {
      setResetError('Could not send password reset email. Please try again later.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // 4. Handle Sign Out
  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      setIsLoggingOut(false);
      console.error('Logout error:', err);
    }
  };

  // 5. Handle Toggle In-App Notifications
  const handleToggleNotifications = () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    localStorage.setItem('autocare_notifications_enabled', String(nextState));
    window.dispatchEvent(new CustomEvent('autocare:notifications_toggle', { detail: nextState }));
  };

  // Format Account Creation Date
  const memberSinceText = React.useMemo(() => {
    if (currentUser?.metadata?.creationTime) {
      try {
        const d = new Date(currentUser.metadata.creationTime);
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        // Fallback
      }
    }
    if (userProfile?.createdAt) {
      try {
        const d = new Date(userProfile.createdAt);
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        // Fallback
      }
    }
    return 'Recently Joined';
  }, [currentUser, userProfile]);

  const fallbackDisplayName = userProfile?.name || currentUser?.displayName || 'AutoCare User';
  const initialLetter = (fallbackDisplayName.charAt(0) || currentUser?.email?.charAt(0) || 'A').toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 3D Section Visual Header */}
      <SectionVisualHeader
        sectionId="profile"
        customTitle="Account, Security & Data Vault"
        customTagline="Manage personal credentials, preferences, complete account backup, and security rules."
        rightAction={
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D232B] hover:bg-red-500/20 text-gray-300 hover:text-red-400 font-semibold text-xs border border-[#252C35] hover:border-red-500/40 transition-all cursor-pointer btn-3d"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        }
      />

      {/* ================================================== */}
      {/* 1. PROFILE HERO / IDENTITY CARD */}
      {/* ================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-[#0d131f] via-[#101726] to-[#0d131f] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Profile Avatar / Initial */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#0c101a] flex items-center justify-center text-3xl font-black text-cyan-300">
              {initialLetter}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Vehicle Owner
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Authenticated</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              {fallbackDisplayName}
            </h2>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentUser?.email || 'No email attached'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>Member since {memberSinceText}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. ACCOUNT DATA SUMMARY (Real Firestore Counts) */}
      {/* ================================================== */}
      <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Account Data Summary</h3>
          </div>
          <span className="text-xs text-gray-400">Isolated to your user ID</span>
        </div>

        {loadingStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-900/70 border border-gray-800"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Vehicles */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Car className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.vehicles ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Vehicles
              </div>
            </div>

            {/* Documents */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-blue-950/60 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.documents ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Documents
              </div>
            </div>

            {/* Services */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-purple-950/60 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.services ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Services
              </div>
            </div>

            {/* Fuel Entries */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Fuel className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.fuel ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Fuel Stops
              </div>
            </div>

            {/* Expenses */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.expenses ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Expenses
              </div>
            </div>

            {/* Reminders */}
            <div className="p-3.5 rounded-2xl bg-[#0a0d14] border border-gray-800 text-center flex flex-col justify-between">
              <div className="w-7 h-7 mx-auto rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-black text-white font-mono">
                {stats?.reminders ?? 0}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Reminders
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* 3. EDIT PROFILE INFORMATION */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Personal Information</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Update your public profile display name across AutoCare.
          </p>
        </div>

        {profileSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Display Name <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full bg-[#0a0d14] border border-gray-700/80 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              This name will be displayed in the vehicle header, reports, and greeting messages.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#0a0d14] border border-gray-800 text-gray-400 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="font-mono text-gray-300 truncate">{currentUser?.email}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Primary Email</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Email is managed securely via Firebase Authentication and cannot be edited directly here.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ================================================== */}
      {/* 4. ACCOUNT SECURITY */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Account Security</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your credentials and password security using Firebase Authentication.
          </p>
        </div>

        {/* Change Password Form */}
        <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Change Password</span>
            </div>
            <span className="text-[11px] text-gray-400">Minimum 6 characters</span>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#0d1017] border border-gray-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#0d1017] border border-gray-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold border border-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Send Password Reset Email */}
        <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Alternative: Send Password Reset Email</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Receive an official Firebase password reset link sent to <strong>{currentUser?.email}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isSendingReset}
              className="px-4 py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Send Reset Email</span>
              )}
            </button>
          </div>

          {resetSuccess && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {resetError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* 5. AUTOCARE PREFERENCES */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>AutoCare Preferences</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure application theme and in-app alert presentation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Theme Preference (Accessible, Simple, Not 3D) */}
          <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Application Theme
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {theme === 'dark' ? 'Dark Automotive' : 'Clean Light'}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Choose between dark automotive theme for night viewing or high-contrast clean light theme.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>🌙 Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>☀️ Light Mode</span>
              </button>
            </div>
          </div>

          {/* In-App Notifications Preference */}
          <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-cyan-400" />
                  <span>In-App Notifications</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    notificationsEnabled
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {notificationsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Controls in-app alert badges and banner visibility for overdue or due-soon vehicle deadlines.
              </p>
            </div>
            <div className="text-[11px] text-gray-500">
              Operates 100% in-app on Spark tier (no push notifications or SMS).
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 6. DATA & PRIVACY */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Data &amp; Privacy</h3>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm leading-relaxed">
          <p className="font-semibold text-emerald-200">
            "Your vehicle data is stored securely in your AutoCare account and is associated with your authenticated user."
          </p>
          <p className="mt-2 text-xs text-emerald-400/80">
            All vehicles, maintenance logs, fuel stops, documents, and expenses are protected by Firestore security rules. No external third parties or other accounts can access your vehicle records.
          </p>
        </div>
      </div>

      {/* ================================================== */}
      {/* 7. EXPORT & BACKUP (Bug #6 & Requirement 3) */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Export &amp; Backup</h3>
              <p className="text-xs text-gray-400">
                Download an offline backup of your vehicles, service history, fuel records, expenses, and reminders.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Offline JSON Backup
          </span>
        </div>

        {/* Success Message Banner */}
        {exportSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {exportErrorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{exportErrorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Main JSON Full Backup Card */}
          <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Complete AutoCare Data Backup (JSON)</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Includes all registered vehicles, service history, fuel stops, expenses, documents, reminders, and custom maintenance rules strictly isolated to your authenticated account.
              </p>
              <div className="text-[11px] text-gray-500 font-mono pt-1">
                Output: AutoCare_Backup_YYYY-MM-DD.json
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer self-start disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExporting ? 'Generating Backup...' : 'Download JSON Backup'}</span>
            </button>
          </div>

          {/* Active Vehicle CSV Exports Card */}
          <div className="p-5 rounded-2xl bg-[#0a0d14] border border-gray-800 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Active Vehicle Spreadsheets (CSV)</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Download spreadsheet-ready CSV files for {selectedVehicle ? selectedVehicle.name : 'your active vehicle'} to open in Microsoft Excel, Apple Numbers, or Google Sheets.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => selectedVehicle && exportServicesToCSV(selectedVehicle, services)}
                disabled={!selectedVehicle || services.length === 0}
                className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700/80 text-[11px] font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
              >
                Services CSV
              </button>
              <button
                type="button"
                onClick={() => selectedVehicle && exportFuelToCSV(selectedVehicle, fuelRecords)}
                disabled={!selectedVehicle || fuelRecords.length === 0}
                className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700/80 text-[11px] font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
              >
                Fuel CSV
              </button>
              <button
                type="button"
                onClick={() => selectedVehicle && exportExpensesToCSV(selectedVehicle, expenses)}
                disabled={!selectedVehicle || expenses.length === 0}
                className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700/80 text-[11px] font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
              >
                Expenses CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 8. SUPPORT, FAQ & FEEDBACK */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Support &amp; Community</h3>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Need assistance or want to suggest improvements? Browse our guide or help us improve AutoCare.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Frequently Asked Questions</span>
              </div>
              <p className="text-xs text-gray-400">
                Detailed guides on fuel calculations, maintenance reminders, document vaults, and multi-vehicle setups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('autocare:open_faq'))}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer self-start flex items-center gap-1.5"
            >
              <span>View FAQ &amp; Guide</span>
              <span>→</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MessageSquareHeart className="w-4 h-4 text-pink-400" />
                <span>Product Feedback Form</span>
              </div>
              <p className="text-xs text-gray-400">
                Tell us which features you find most useful and what tools you would love to see next in AutoCare.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('autocare:open_feedback'))}
              className="px-4 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:text-white text-xs font-bold transition-all cursor-pointer self-start flex items-center gap-1.5"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Share Feedback</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 8. APPLICATION INFORMATION (About AutoCare) */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">About AutoCare</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono font-bold">
            Version MVP
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-gray-400 leading-relaxed">
          <div className="text-white font-bold text-sm">
            AutoCare — Your Vehicle's Personal Maintenance Manager
          </div>
          <p>
            Manage vehicles, documents, maintenance, fuel, expenses and reminders from one place.
          </p>
          <p className="text-gray-500 pt-1">
            Running on Google AI Studio with Firebase Authentication &amp; Firestore on Spark Tier.
          </p>
        </div>
      </div>

      {/* ================================================== */}
      {/* 8. DANGER ZONE (Delete Account) */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-red-500/20 space-y-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-lg font-bold">Danger Zone</h3>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white">Delete Account</div>
            <p className="text-xs text-gray-400">
              Account deletion is not currently available in this version.
            </p>
            <p className="text-[11px] text-gray-500">
              You may manage or remove individual vehicles, expenses, and logs directly from their respective tabs.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="px-4 py-2.5 rounded-xl bg-gray-800/80 text-gray-500 border border-gray-700/60 text-xs font-semibold cursor-not-allowed shrink-0"
          >
            Delete Account (Disabled)
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 9. SIGN OUT */}
      {/* ================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Sign Out</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Securely end your current session on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="px-6 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out of AutoCare'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
