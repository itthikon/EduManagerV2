import React, { useState } from "react";
import {
  BookOpen,
  Users,
  QrCode,
  Bell,
  LayoutDashboard,
  LogOut,
  LogIn,
  GraduationCap,
  Calendar,
  Settings2,
  AlertTriangle,
  X,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { loginWithGoogle, logoutUser, getAuthErrorMessage, SUPER_ADMIN_UID } from "../lib/firebase";
import { UserProfile } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  loadingAuth: boolean;
  selectedTerm: string;
  setSelectedTerm: (term: string) => void;
  selectedAcademicYear: string;
  setSelectedAcademicYear: (year: string) => void;
  academicYears: string[];
  onOpenYearManager: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  loadingAuth,
  selectedTerm,
  setSelectedTerm,
  selectedAcademicYear,
  setSelectedAcademicYear,
  academicYears,
  onOpenYearManager,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<{
    title: string;
    message: string;
    code: string;
    domain: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const isAdmin = user && (user.uid === SUPER_ADMIN_UID || user.role === "admin");

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login Error Catch:", err);
      const errDetail = getAuthErrorMessage(err);
      setAuthError(errDetail);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const tabs = [
    { id: "dashboard", label: "DASHBOARD", icon: LayoutDashboard },
    { id: "subjects", label: "SUBJECTS & WEIGHTS", icon: BookOpen },
    { id: "students", label: "STUDENTS & QR CODE", icon: Users },
    { id: "assignments", label: "ASSIGNMENTS", icon: GraduationCap },
    { id: "grading", label: "SCANNER & GRADING", icon: QrCode },
    { id: "line-notify", label: "LINE NOTIFY API", icon: Bell },
    ...(isAdmin ? [{ id: "admin-users", label: "ADMIN (จัดการสิทธิ์)", icon: Crown }] : []),
  ];

  return (
    <header className="bg-black border-b border-white/10 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3 md:gap-0">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#00FF66] text-black font-extrabold flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-['Syne'] font-extrabold text-lg text-white tracking-tight uppercase">
                  ระบบตรวจงาน & คะแนน
                </h1>
                <span className="font-['Geist_Mono'] text-[10px] px-2 py-0.5 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 uppercase tracking-wider">
                  [QR_TRACKER_SYS]
                </span>
                {isAdmin && (
                  <span className="font-['Geist_Mono'] text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1 font-bold">
                    <Crown className="w-3 h-3 text-amber-400" /> ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40 font-['Geist_Mono']">
                QR CODE 40x40MM • LINE MESSAGING API • FIRESTORE DB
              </p>
            </div>
          </div>

          {/* Academic Year Selector & User Google Auth */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Term & Year Selector Pill */}
            <div className="flex items-center bg-[#18181B] border border-white/15 rounded-lg p-1 space-x-1 font-['Geist_Mono'] flex-wrap">
              <div className="flex items-center text-xs text-[#00FF66] pl-2 pr-1 space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-bold hidden sm:inline">ภาค/ปี:</span>
              </div>

              {/* Term Selector */}
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-[#111113] text-[#00FF66] text-xs font-bold border border-white/20 rounded px-2 py-1 focus:border-[#00FF66] focus:outline-none"
                title="เลือกภาคเรียน"
              >
                <option value="1">เทอม 1</option>
                <option value="2">เทอม 2</option>
                <option value="3">เทอม 3 (ฤดูร้อน)</option>
                <option value="ALL">-- ทุกเทอม (ALL) --</option>
              </select>

              {/* Year Selector */}
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="bg-[#111113] text-white text-xs font-bold border border-white/20 rounded px-2 py-1 focus:border-[#00FF66] focus:outline-none"
                title="เลือกปีการศึกษา"
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    ปี {yr}
                  </option>
                ))}
                <option value="ALL">-- ทุกปี (ALL) --</option>
              </select>

              <button
                onClick={onOpenYearManager}
                title="จัดการภาคเรียน / ปีการศึกษา & ลบข้อมูลในฐานข้อมูล"
                className="p-1.5 bg-white/5 hover:bg-[#00FF66]/20 text-white/70 hover:text-[#00FF66] rounded transition-colors text-xs flex items-center space-x-1"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[10px]">จัดการ/ลบ</span>
              </button>
            </div>

            {/* Auth Button */}
            {loadingAuth ? (
              <div className="text-xs text-white/40 font-['Geist_Mono'] animate-pulse">
                INITIALIZING_AUTH...
              </div>
            ) : user ? (
              <div className="flex items-center space-x-3 bg-[#18181B] px-3 py-1.5 rounded-lg border border-white/10">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className={`w-7 h-7 rounded-md border ${isAdmin ? "border-amber-400" : "border-[#00FF66]"}`}
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold text-black ${isAdmin ? "bg-amber-400" : "bg-[#00FF66]"}`}>
                    {user.displayName.charAt(0)}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px] flex items-center gap-1">
                    <span>{user.displayName}</span>
                    {isAdmin && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-white/40 font-['Geist_Mono'] truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={() => logoutUser()}
                  title="LOGOUT"
                  className="p-1.5 text-white/50 hover:text-rose-400 hover:bg-white/5 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black px-4 py-2 rounded-md text-xs font-['Geist_Mono'] font-extrabold transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoggingIn ? "CONNECTING..." : "LOGIN_WITH_GOOGLE"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-white/10 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-['Geist_Mono'] tracking-wider uppercase whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-[#00FF66] text-black border-[#00FF66] font-bold"
                    : "bg-[#18181B] text-white/60 border-white/10 hover:border-[#00FF66]/50 hover:text-[#00FF66]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-white/50"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Auth Error Diagnostic Modal */}
      {authError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-rose-500/50 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setAuthError(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{authError.title}</h3>
                <p className="text-xs text-rose-300 font-['Geist_Mono']">
                  ERROR_CODE: {authError.code}
                </p>
              </div>
            </div>

            <div className="bg-[#111113] p-4 border border-white/10 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between text-white/70">
                <span className="font-['Geist_Mono'] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#00FF66]" /> โดเมนปัจจุบันที่คุณกำลังใช้งาน:
                </span>
              </div>
              <div className="flex items-center justify-between bg-black/60 p-2.5 rounded border border-white/10 font-['Geist_Mono'] text-[#00FF66] font-bold">
                <span className="truncate mr-2">{authError.domain}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(authError.domain)}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] flex items-center space-x-1 flex-shrink-0"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3 h-3 text-[#00FF66]" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอกชื่อโดเมน</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-white/80 whitespace-pre-line leading-relaxed pt-2 border-t border-white/10">
                {authError.message}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end font-['Geist_Mono'] text-xs">
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-extrabold rounded flex items-center justify-center space-x-1.5"
              >
                <span>เปิด Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-bold"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};


