import React, { useState } from "react";
import {
  ShieldAlert,
  Lock,
  Copy,
  Check,
  LogOut,
  Send,
  User,
  Mail,
  Key,
  Shield,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { logoutUser } from "../lib/firebase";
import { UserProfile } from "../types";

interface AccessDeniedScreenProps {
  user: UserProfile;
  onRequestAccess: () => Promise<void>;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  user,
  onRequestAccess,
}) => {
  const [copiedUid, setCopiedUid] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const SUPER_ADMIN_UID = "hHUsAQdGi6MN2WQFwyS5VLPXPei1";

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSendRequest = async () => {
    setSendingRequest(true);
    try {
      await onRequestAccess();
      setRequestSent(true);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] text-white flex items-center justify-center p-4 font-['Geist']">
      <div className="max-w-md w-full bg-[#18181B] border border-rose-500/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" /> ACCESS RESTRICTED
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            บัญชีของคุณยังไม่ได้รับอนุญาตให้ใช้งานระบบ
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            ระบบนี้อยู่ในโหมดจำกัดสิทธิ์ (Restricted Access) เฉพาะผู้ใช้ที่ได้รับการอนุมัติจากแอดมินเท่านั้นที่จะสามารถเข้าใช้งานได้
          </p>
        </div>

        {/* Logged in User Card */}
        <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-3 relative z-10">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-rose-400" />
            <span>ข้อมูลบัญชีผู้ใช้ของคุณ:</span>
          </div>

          <div className="flex items-center space-x-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-10 h-10 rounded-lg border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-sm">
                {user.displayName.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user.displayName}</div>
              <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 text-zinc-500" />
                {user.email}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <span className="text-[10px] text-zinc-500 block">UID ประจำตัวของคุณ:</span>
              <span className="text-xs font-mono font-bold text-rose-300 truncate block">
                {user.uid}
              </span>
            </div>
            <button
              onClick={handleCopyUid}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
            >
              {copiedUid ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>คัดลอก UID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Super Admin Info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1 relative z-10">
          <div className="font-bold text-amber-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>ติดต่อแอดมินเพื่อขอเปิดใช้งาน:</span>
          </div>
          <p className="text-amber-200/80 text-[11px] leading-snug">
            ผู้ดูแลระบบหลัก (Super Admin): <br />
            <code className="font-mono text-white bg-black/40 px-1.5 py-0.5 rounded text-[10px] select-all">
              UID: {SUPER_ADMIN_UID}
            </code>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2 relative z-10">
          {requestSent ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>ส่งคำขออนุมัติเรียบร้อยแล้ว แอดมินจะพิจารณาเปิดสิทธิ์ให้คุณ</span>
            </div>
          ) : (
            <button
              onClick={handleSendRequest}
              disabled={sendingRequest}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sendingRequest ? "กำลังส่งคำขอ..." : "ส่งคำขออนุมัติใช้งาน (REQUEST ACCESS)"}</span>
            </button>
          )}

          <button
            onClick={() => logoutUser()}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4 text-zinc-400" />
            <span>สลับบัญชี / ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
