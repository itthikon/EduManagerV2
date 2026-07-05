import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Crown,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Mail,
  UserPlus,
  Globe,
  Sliders,
  AlertCircle,
  Sparkles,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { UserProfile, SystemAccessControl, AccessRequest } from "../types";

interface AdminUserManagementProps {
  currentUser: UserProfile;
}

export const SUPER_ADMIN_UID = "hHUsAQdGi6MN2WQFwyS5VLPXPei1";

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  currentUser,
}) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [accessControl, setAccessControl] = useState<SystemAccessControl>({
    restrictedMode: true,
    admins: [SUPER_ADMIN_UID],
    allowedUids: [SUPER_ADMIN_UID],
    allowedEmails: [],
    allowedDomains: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // New Whitelist Input State
  const [newWhitelistingInput, setNewWhitelistingInput] = useState("");
  const [whitelistType, setWhitelistType] = useState<"uid" | "email" | "domain">("email");

  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string>("");

  // Realtime subscription to System Access Settings
  useEffect(() => {
    const unsubAccess = onSnapshot(
      doc(db, "systemSettings", "accessControl"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemAccessControl;
          setAccessControl({
            restrictedMode: data.restrictedMode ?? true,
            admins: Array.from(new Set([...(data.admins || []), SUPER_ADMIN_UID])),
            allowedUids: Array.from(new Set([...(data.allowedUids || []), SUPER_ADMIN_UID])),
            allowedEmails: data.allowedEmails || [],
            allowedDomains: data.allowedDomains || [],
          });
        } else {
          // Initialize default setting
          const defaultSettings: SystemAccessControl = {
            restrictedMode: true,
            admins: [SUPER_ADMIN_UID],
            allowedUids: [SUPER_ADMIN_UID],
            allowedEmails: [],
            allowedDomains: [],
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid,
          };
          setDoc(doc(db, "systemSettings", "accessControl"), defaultSettings).catch(console.error);
        }
      },
      (error) => {
        console.error("Access Control Snapshot error:", error);
        handleFirestoreError(error, OperationType.GET, "systemSettings/accessControl");
      }
    );

    // Realtime subscription to Users Collection
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: UserProfile[] = snapshot.docs.map((d) => {
          const u = d.data() as UserProfile;
          return {
            ...u,
            uid: d.id,
            // Force Super Admin role and status
            ...(d.id === SUPER_ADMIN_UID
              ? { role: "admin", status: "allowed" }
              : {}),
          };
        });
        setUsersList(list);
        setLoading(false);
      },
      (error) => {
        console.error("Users Snapshot error:", error);
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, "users");
      }
    );

    // Realtime subscription to Access Requests
    const unsubRequests = onSnapshot(
      collection(db, "accessRequests"),
      (snapshot) => {
        const reqs: AccessRequest[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AccessRequest, "id">),
        }));
        setAccessRequests(reqs);
      },
      (error) => {
        console.error("Access Requests Snapshot error:", error);
        handleFirestoreError(error, OperationType.GET, "accessRequests");
      }
    );

    return () => {
      unsubAccess();
      unsubUsers();
      unsubRequests();
    };
  }, [currentUser.uid]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 3500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Toggle Restricted System Mode
  const handleToggleRestrictedMode = async () => {
    const nextMode = !accessControl.restrictedMode;
    try {
      await setDoc(
        doc(db, "systemSettings", "accessControl"),
        {
          restrictedMode: nextMode,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.uid,
        },
        { merge: true }
      );
      showSuccessNotice(
        nextMode
          ? "🔒 เปลี่ยนเป็น [โหมดจำกัดสิทธิ์ (Restricted Mode)] เฉพาะผู้ได้รับการอนุมัติเท่านั้น"
          : "🌐 เปลี่ยนเป็น [โหมดเปิดเสรี (Public Mode)] ให้ทุกคนเข้าใช้งานได้"
      );
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการอัปเดตการตั้งค่าระบบ");
    }
  };

  // Approve User Access
  const handleApproveUser = async (userToApprove: UserProfile) => {
    try {
      const userRef = doc(db, "users", userToApprove.uid);
      await setDoc(
        userRef,
        {
          uid: userToApprove.uid,
          email: userToApprove.email,
          displayName: userToApprove.displayName,
          photoURL: userToApprove.photoURL || "",
          status: "allowed",
          role: userToApprove.role || "teacher",
        },
        { merge: true }
      );

      // Add to allowedUids list in systemSettings
      const updatedAllowedUids = Array.from(
        new Set([...accessControl.allowedUids, userToApprove.uid])
      );
      await setDoc(
        doc(db, "systemSettings", "accessControl"),
        { allowedUids: updatedAllowedUids },
        { merge: true }
      );

      // Delete access request if exists
      try {
        await deleteDoc(doc(db, "accessRequests", userToApprove.uid));
      } catch (e) {
        // Ignore if request doesn't exist
      }

      showSuccessNotice(`✅ อนุมัติสิทธิ์เข้าใช้งานให้ ${userToApprove.displayName} เรียบร้อยแล้ว`);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการอนุมัติสิทธิ์");
    }
  };

  // Block User Access
  const handleBlockUser = async (userToBlock: UserProfile) => {
    if (userToBlock.uid === SUPER_ADMIN_UID) {
      alert("⚠️ ไม่สามารถระงับสิทธิ์ Super Admin หลักได้");
      return;
    }

    if (!confirm(`ยืนยันการระงับสิทธิ์เข้าใช้งานของ ${userToBlock.displayName}?`)) {
      return;
    }

    try {
      const userRef = doc(db, "users", userToBlock.uid);
      await setDoc(userRef, { status: "blocked" }, { merge: true });

      // Remove from allowedUids
      const updatedAllowedUids = accessControl.allowedUids.filter((id) => id !== userToBlock.uid);
      await setDoc(
        doc(db, "systemSettings", "accessControl"),
        { allowedUids: updatedAllowedUids },
        { merge: true }
      );

      showSuccessNotice(`🚫 ระงับสิทธิ์เข้าใช้งานของ ${userToBlock.displayName} เรียบร้อยแล้ว`);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการระงับสิทธิ์");
    }
  };

  // Toggle Admin Role
  const handleToggleAdminRole = async (targetUser: UserProfile) => {
    if (targetUser.uid === SUPER_ADMIN_UID) {
      alert("⚠️ บัญชีนี้เป็น Super Admin หลักของระบบ");
      return;
    }

    const isCurrentAdmin = targetUser.role === "admin";
    const newRole = isCurrentAdmin ? "teacher" : "admin";

    if (
      !confirm(
        isCurrentAdmin
          ? `ถอดสิทธิ์ Admin ของ ${targetUser.displayName}?`
          : `มอบสิทธิ์ Admin ให้แก่ ${targetUser.displayName}?`
      )
    ) {
      return;
    }

    try {
      const userRef = doc(db, "users", targetUser.uid);
      await setDoc(
        userRef,
        {
          role: newRole,
          status: "allowed",
        },
        { merge: true }
      );

      // Update admins array in systemSettings
      let updatedAdmins = [...accessControl.admins];
      if (newRole === "admin") {
        updatedAdmins = Array.from(new Set([...updatedAdmins, targetUser.uid]));
      } else {
        updatedAdmins = updatedAdmins.filter((id) => id !== targetUser.uid);
      }

      await setDoc(
        doc(db, "systemSettings", "accessControl"),
        { admins: updatedAdmins },
        { merge: true }
      );

      showSuccessNotice(
        newRole === "admin"
          ? `👑 แต่งตั้ง ${targetUser.displayName} เป็น Admin เรียบร้อยแล้ว`
          : `ถอดสิทธิ์ Admin ของ ${targetUser.displayName} เรียบร้อยแล้ว`
      );
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการเปลี่ยนบทบาทผู้ใช้");
    }
  };

  // Delete User Doc
  const handleDeleteUserDoc = async (targetUser: UserProfile) => {
    if (targetUser.uid === SUPER_ADMIN_UID) {
      alert("⚠️ ไม่สามารถลบ Super Admin หลักได้");
      return;
    }

    if (!confirm(`คุณต้องการลบข้อมูลผู้ใช้ ${targetUser.displayName} ออกจากระบบถาวรใช่หรือไม่?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", targetUser.uid));
      showSuccessNotice(`ลบข้อมูลผู้ใช้ ${targetUser.displayName} เรียบร้อยแล้ว`);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการลบข้อมูลผู้ใช้");
    }
  };

  // Add Whitelist Value Manually (Email / UID / Domain)
  const handleAddWhitelistValue = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newWhitelistingInput.trim();
    if (!val) return;

    try {
      if (whitelistType === "email") {
        const updatedEmails = Array.from(new Set([...accessControl.allowedEmails, val.toLowerCase()]));
        await setDoc(
          doc(db, "systemSettings", "accessControl"),
          { allowedEmails: updatedEmails },
          { merge: true }
        );
        showSuccessNotice(`เพิ่มอีเมลอนุมัติล่วงหน้า: ${val}`);
      } else if (whitelistType === "uid") {
        const updatedUids = Array.from(new Set([...accessControl.allowedUids, val]));
        await setDoc(
          doc(db, "systemSettings", "accessControl"),
          { allowedUids: updatedUids },
          { merge: true }
        );
        showSuccessNotice(`เพิ่ม UID อนุมัติล่วงหน้า: ${val}`);
      } else if (whitelistType === "domain") {
        const domainClean = val.startsWith("@") ? val : `@${val}`;
        const updatedDomains = Array.from(new Set([...accessControl.allowedDomains, domainClean.toLowerCase()]));
        await setDoc(
          doc(db, "systemSettings", "accessControl"),
          { allowedDomains: updatedDomains },
          { merge: true }
        );
        showSuccessNotice(`เพิ่มโดเมนองค์กรอนุมัติล่วงหน้า: ${domainClean}`);
      }

      setNewWhitelistingInput("");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  // Remove item from Whitelist arrays
  const handleRemoveWhitelistItem = async (
    type: "email" | "uid" | "domain",
    valToRemove: string
  ) => {
    if (type === "uid" && valToRemove === SUPER_ADMIN_UID) {
      alert("⚠️ ไม่สามารถลบ UID ของ Super Admin หลักได้");
      return;
    }

    try {
      if (type === "email") {
        const next = accessControl.allowedEmails.filter((item) => item !== valToRemove);
        await setDoc(doc(db, "systemSettings", "accessControl"), { allowedEmails: next }, { merge: true });
      } else if (type === "uid") {
        const next = accessControl.allowedUids.filter((item) => item !== valToRemove);
        await setDoc(doc(db, "systemSettings", "accessControl"), { allowedUids: next }, { merge: true });
      } else if (type === "domain") {
        const next = accessControl.allowedDomains.filter((item) => item !== valToRemove);
        await setDoc(doc(db, "systemSettings", "accessControl"), { allowedDomains: next }, { merge: true });
      }
      showSuccessNotice(`ลบรายการอนุมัติเรียบร้อยแล้ว`);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Users List
  const filteredUsers = usersList.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      u.displayName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.uid?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterStatus === "PENDING") return u.status === "pending";
    if (filterStatus === "ALLOWED") return u.status === "allowed" || u.uid === SUPER_ADMIN_UID;
    if (filterStatus === "BLOCKED") return u.status === "blocked";
    if (filterStatus === "ADMIN") return u.role === "admin" || u.uid === SUPER_ADMIN_UID;

    return true;
  });

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Top Admin Banner */}
      <div className="bg-[#18181B] p-5 md:p-6 border border-amber-500/30 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Crown className="w-3.5 h-3.5" /> SYSTEM ACCESS CONTROL & SECURITY
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk'] flex items-center gap-2">
              <span>ศูนย์ควบคุมและจัดการสิทธิ์ผู้ใช้งาน</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              ผู้จัดการสิทธิ์ระบบสามารถกำหนดให้ใครเข้าใช้งานได้บ้าง ควบคุมโหมดความปลอดภัย และอนุมัติบัญชีครูผู้สอน
            </p>
          </div>

          {/* Super Admin Status Badge */}
          <div className="bg-black/60 border border-amber-500/40 p-3 rounded-xl flex items-center space-x-3 shadow-inner">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-mono">SUPER ADMIN ACTIVE</div>
              <div className="text-xs font-bold text-amber-300 font-mono">
                UID: {SUPER_ADMIN_UID.substring(0, 10)}...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* System Mode Switch & Security Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Security Mode Toggle */}
        <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">โหมดควบคุมการเข้าใช้งานระบบ</h3>
                <p className="text-[11px] text-zinc-400">กำหนดเงื่อนไขการเข้าถึงเมื่อผู้ใช้เข้าสู่ระบบด้วย Google</p>
              </div>
            </div>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {accessControl.restrictedMode ? (
                    <span className="text-rose-400 flex items-center gap-1 font-mono">
                      <ShieldAlert className="w-4 h-4" /> 🔴 โหมดจำกัดสิทธิ์ (Restricted Access)
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <Unlock className="w-4 h-4" /> 🟢 โหมดเปิดเสรี (Public Access)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {accessControl.restrictedMode
                    ? "เปิดใช้งานโหมดปลอดภัย: เฉพาะผู้ใช้งานที่อยู่ในรายชื่ออนุมัติหรือมีสิทธิ์ Admin เท่านั้นที่จะเข้าใช้ระบบได้"
                    : "ปิดโหมดจำกัดสิทธิ์: ทุกคนที่มีบัญชี Google สามารถเข้ามาใช้งานระบบได้ทันที"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleRestrictedMode}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-2 ${
                  accessControl.restrictedMode
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                {accessControl.restrictedMode ? "เปิดเสรีให้ทุกคนเข้าใช้" : "สลับเป็นโหมดจำกัดสิทธิ์"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Whitelist Form */}
        <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">อนุมัติผู้ใช้งานล่วงหน้า (Whitelist)</h3>
                <p className="text-[11px] text-zinc-400">ระบุอีเมล, UID หรือ โดเมนโรงเรียนเพื่อเปิดสิทธิ์ให้อัตโนมัติ</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddWhitelistValue} className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWhitelistType("email")}
                className={`py-1.5 rounded-lg border text-center transition-all ${
                  whitelistType === "email"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                }`}
              >
                📧 อีเมล (Email)
              </button>
              <button
                type="button"
                onClick={() => setWhitelistType("uid")}
                className={`py-1.5 rounded-lg border text-center transition-all ${
                  whitelistType === "uid"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                }`}
              >
                🔑 UID
              </button>
              <button
                type="button"
                onClick={() => setWhitelistType("domain")}
                className={`py-1.5 rounded-lg border text-center transition-all ${
                  whitelistType === "domain"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                }`}
              >
                🌐 โดเมนโรงเรียน
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWhitelistingInput}
                onChange={(e) => setNewWhitelistingInput(e.target.value)}
                placeholder={
                  whitelistType === "email"
                    ? "ระบุอีเมล e.g. teacher@gmail.com"
                    : whitelistType === "uid"
                    ? "ระบุ UID e.g. hHUsAQdGi6MN2WQFwyS5VLPXPei1"
                    : "ระบุโดเมน e.g. @school.ac.th"
                }
                className="flex-1 px-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-amber-500 text-white rounded-xl focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอนุมัติ</span>
              </button>
            </div>
          </form>

          {/* Active Whitelist Badges */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
            {accessControl.allowedEmails.map((em) => (
              <span
                key={em}
                className="inline-flex items-center gap-1 text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg"
              >
                <Mail className="w-3 h-3" /> {em}
                <button
                  type="button"
                  onClick={() => handleRemoveWhitelistItem("email", em)}
                  className="hover:text-rose-400 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}

            {accessControl.allowedDomains.map((dm) => (
              <span
                key={dm}
                className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-lg"
              >
                <Globe className="w-3 h-3" /> {dm}
                <button
                  type="button"
                  onClick={() => handleRemoveWhitelistItem("domain", dm)}
                  className="hover:text-rose-400 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Access Requests Table / Alert Card */}
      {accessRequests.length > 0 && (
        <div className="bg-[#18181B] border border-amber-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              คำขออนุมัติใช้งานระบบที่รอการอนุมัติ ({accessRequests.length} รายการ)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accessRequests.map((req) => (
              <div
                key={req.id}
                className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">{req.displayName}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{req.email}</div>
                  <div className="text-[9px] font-mono text-amber-300/80 truncate">UID: {req.uid}</div>
                </div>

                <button
                  onClick={() =>
                    handleApproveUser({
                      uid: req.uid,
                      email: req.email,
                      displayName: req.displayName,
                      photoURL: req.photoURL || "",
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-lg shadow-md active:scale-95 whitespace-nowrap"
                >
                  ✓ อนุมัติทันที
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Users Management Directory */}
      <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              รายชื่อผู้เข้าใช้งานระบบทั้งหมด ({usersList.length} คน)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              สามารถให้สิทธิ์การใช้งาน, กำหนดบทบาทแอดมิน หรือ ระงับการเข้าใช้งานได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter Tabs */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "ALL" ? "bg-white/20 text-white font-bold" : "text-zinc-400"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilterStatus("ALLOWED")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "ALLOWED" ? "bg-emerald-500/30 text-emerald-300 font-bold" : "text-zinc-400"
                }`}
              >
                อนุมัติแล้ว
              </button>
              <button
                onClick={() => setFilterStatus("PENDING")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "PENDING" ? "bg-amber-500/30 text-amber-300 font-bold" : "text-zinc-400"
                }`}
              >
                รออนุมัติ
              </button>
              <button
                onClick={() => setFilterStatus("BLOCKED")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "BLOCKED" ? "bg-rose-500/30 text-rose-300 font-bold" : "text-zinc-400"
                }`}
              >
                ระงับสิทธิ์
              </button>
              <button
                onClick={() => setFilterStatus("ADMIN")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "ADMIN" ? "bg-purple-500/30 text-purple-300 font-bold" : "text-zinc-400"
                }`}
              >
                แอดมิน
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ / อีเมล / UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 text-white rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/60 text-zinc-400 font-bold border-b border-white/10 uppercase">
              <tr>
                <th className="px-4 py-3">ผู้ใช้งาน (User Info)</th>
                <th className="px-3 py-3">UID</th>
                <th className="px-3 py-3 text-center">บทบาท (Role)</th>
                <th className="px-3 py-3 text-center">สถานะสิทธิ์ (Status)</th>
                <th className="px-4 py-3 text-right">จัดการสิทธิ์ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-500 font-sans">
                    ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuperAdmin = u.uid === SUPER_ADMIN_UID;
                  const isAdmin = u.role === "admin" || isSuperAdmin;
                  const isAllowed = u.status === "allowed" || isSuperAdmin;
                  const isBlocked = u.status === "blocked";

                  return (
                    <tr
                      key={u.uid}
                      className={`transition-colors hover:bg-white/5 ${
                        isSuperAdmin ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-8 h-8 rounded-full border border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center">
                              {u.displayName?.charAt(0) || "U"}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white font-sans flex items-center gap-1.5">
                              <span>{u.displayName || "ไม่ระบุชื่อ"}</span>
                              {isSuperAdmin && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                                  SUPER ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] text-zinc-400 truncate max-w-[120px]">
                            {u.uid}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.uid)}
                            title="คัดลอก UID"
                            className="p-1 text-zinc-500 hover:text-white transition-colors"
                          >
                            {copiedUid === u.uid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        {isAdmin ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" /> ADMIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 text-[10px]">
                            TEACHER
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {isAllowed ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> อนุมัติแล้ว
                          </span>
                        ) : isBlocked ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <UserX className="w-3 h-3" /> ระงับสิทธิ์
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold animate-pulse inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> รออนุมัติ
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isSuperAdmin && (
                            <>
                              {!isAllowed && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveUser(u)}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] rounded-lg transition-all"
                                >
                                  ✓ อนุมัติ
                                </button>
                              )}

                              {isAllowed && !isBlocked && (
                                <button
                                  type="button"
                                  onClick={() => handleBlockUser(u)}
                                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 font-bold text-[11px] rounded-lg transition-all"
                                >
                                  🚫 ระงับ
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleAdminRole(u)}
                                title={isAdmin ? "ถอดสิทธิ์ Admin" : "มอบสิทธิ์ Admin"}
                                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 rounded-lg transition-all"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUserDoc(u)}
                                title="ลบผู้ใช้"
                                className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
