import React from "react";
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
} from "lucide-react";
import { loginWithGoogle, logoutUser } from "../lib/firebase";
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
  const tabs = [
    { id: "dashboard", label: "DASHBOARD", icon: LayoutDashboard },
    { id: "subjects", label: "SUBJECTS & WEIGHTS", icon: BookOpen },
    { id: "students", label: "STUDENTS & QR CODE", icon: Users },
    { id: "assignments", label: "ASSIGNMENTS", icon: GraduationCap },
    { id: "grading", label: "SCANNER & GRADING", icon: QrCode },
    { id: "line-notify", label: "LINE NOTIFY API", icon: Bell },
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
                    className="w-7 h-7 rounded-md border border-[#00FF66]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-[#00FF66] flex items-center justify-center text-xs font-extrabold text-black">
                    {user.displayName.charAt(0)}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {user.displayName}
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
                onClick={() => loginWithGoogle()}
                className="inline-flex items-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black px-4 py-2 rounded-md text-xs font-['Geist_Mono'] font-extrabold transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]"
              >
                <LogIn className="w-4 h-4" />
                <span>LOGIN_WITH_GOOGLE</span>
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
    </header>
  );
};

