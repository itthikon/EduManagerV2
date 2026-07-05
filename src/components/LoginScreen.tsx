import React, { useState } from "react";
import {
  QrCode,
  ShieldCheck,
  Crown,
  GraduationCap,
  Sparkles,
  Lock,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { loginWithGoogle, getAuthErrorMessage, SUPER_ADMIN_UID } from "../lib/firebase";

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [authError, setAuthError] = useState<{
    code: string;
    domain: string;
    title: string;
    message: string;
  } | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const parsed = getAuthErrorMessage(err);
      setAuthError(parsed);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyDomain = () => {
    if (authError?.domain) {
      navigator.clipboard.writeText(authError.domain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] text-white flex flex-col justify-between p-4 md:p-8 font-['Geist'] relative overflow-hidden">
      {/* Background Lighting Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#00FF66]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,102,0.15)]">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wider font-['Space_Grotesk'] text-white flex items-center gap-2">
              <span>QR TRACKER & LINE NOTIFY</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 uppercase">
                v2.5
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              ระบบตรวจติดตามการส่งงานและให้คะแนนผ่าน QR Code
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
          <span>FIRESTONE DB ONLINE</span>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" /> SINGLE SIGN-ON AUTHENTICATION
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
            เข้าสู่ระบบเพื่อใช้งานระบบ
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อเข้าสู่หน้าจัดการข้อมูลของคุณ หรือ เข้าสู่หน้าแอดมินผู้ดูแลระบบ
          </p>
        </div>

        {/* Auth Error Notice */}
        {authError && (
          <div className="max-w-xl mx-auto bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-2xl animate-in fade-in">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-rose-300">{authError.title}</div>
                <div className="text-zinc-300 leading-relaxed">{authError.message}</div>
                {authError.domain && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Domain: <code className="text-rose-300 font-bold">{authError.domain}</code>
                    </span>
                    <button
                      onClick={handleCopyDomain}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] flex items-center gap-1 font-mono transition-all"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? "คัดลอกแล้ว" : "คัดลอกโดเมน"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Role Portal Selection Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Card 1: Teacher Portal */}
          <div className="bg-[#18181B] border border-white/10 hover:border-[#00FF66]/50 rounded-2xl p-5 space-y-3 transition-all group relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>พื้นที่ครูผู้สอน (Teacher)</span>
                <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/20">
                  USER ROLE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                จัดการวิชาเรียน, รายชื่อนักเรียน, พิมพ์สติกเกอร์ QR Code, สแกนตรวจงานอัตโนมัติ และแจ้งเตือนผ่าน LINE
              </p>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>แยกเก็บข้อมูลเฉพาะบัญชีตัวเอง</span>
            </div>
          </div>

          {/* Card 2: Admin Portal */}
          <div className="bg-[#18181B] border border-white/10 hover:border-amber-500/50 rounded-2xl p-5 space-y-3 transition-all group relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>ระบบแอดมิน (Admin Control)</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  ADMIN ROLE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                อนุมัติสิทธิ์การเข้าใช้งานระบบ, สลับโหมดความปลอดภัย Restricted/Public และจัดการผู้ใช้งานทั้งหมด
              </p>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>สิทธิ์การเข้าถึงสำหรับผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>

        {/* Single Big Google Login Button */}
        <div className="max-w-md mx-auto space-y-3 pt-2">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 px-6 bg-[#00FF66] hover:bg-[#00e65c] text-black font-extrabold text-sm rounded-2xl uppercase tracking-wider flex items-center justify-center space-x-3 transition-all shadow-[0_0_30px_rgba(0,255,102,0.25)] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>กำลังเชื่อมต่อกับ GOOGLE...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-['Space_Grotesk'] tracking-widest text-sm">
                  เข้าสู่ระบบด้วย GOOGLE ACCOUNT
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-[11px] text-[#00FF66] text-center font-mono font-semibold flex items-center justify-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <span>เข้าใช้งานได้อย่างปลอดภัย ไม่ต้องจำรหัสผ่าน</span>
          </p>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 border-t border-white/5 z-10 text-[11px] font-mono text-zinc-500 space-y-1">
        <div>
          SUPER ADMIN CONTACT UID: <code className="text-zinc-400 select-all">{SUPER_ADMIN_UID}</code>
        </div>
        <div>
          QR CODE GRADE TRACKER & LINE MESSAGING API SYSTEM • POWERED BY GOOGLE FIREBASE
        </div>
      </footer>
    </div>
  );
};
