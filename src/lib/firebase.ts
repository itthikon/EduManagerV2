import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigData);

export const auth = getAuth(app);

// Initialize Firestore with specific database ID if present
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testFirestoreConnection();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const getAuthErrorMessage = (error: any): { title: string; message: string; code: string; domain: string } => {
  const code = error?.code || "unknown_error";
  const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";

  if (code === "auth/unauthorized-domain") {
    return {
      code,
      domain: currentDomain,
      title: "โดเมนเว็บไซต์นี้ยังไม่ได้รับอนุญาต (Unauthorized Domain)",
      message: `โดเมน "${currentDomain}" ยังไม่ได้ถูกเพิ่มใน Authorized Domains ของ Firebase Console\n\nวิธีแก้ไข:\n1. เข้าไปที่ Firebase Console (https://console.firebase.google.com/)\n2. ไปที่ Authentication > Settings > Authorized domains\n3. กด 'Add domain' แล้วใส่ "${currentDomain}"`,
    };
  }

  if (code === "auth/operation-not-allowed") {
    return {
      code,
      domain: currentDomain,
      title: "ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase",
      message: `ระบบเข้าสู่ระบบด้วย Google ยังไม่ได้ถูกเปิดใช้งานใน Firebase Console\n\nวิธีแก้ไข:\n1. ไปที่ Firebase Console > Authentication > Sign-in method\n2. คลิก 'Google' -> สับสวิตช์เปิด 'Enable'\n3. บันทึกข้อมูลและลองใหม่อีกครั้ง`,
    };
  }

  if (code === "auth/popup-blocked") {
    return {
      code,
      domain: currentDomain,
      title: "เบราว์เซอร์บล็อกหน้าต่าง Pop-up",
      message: `เบราว์เซอร์ของคุณบล็อกหน้าต่างล็อกอินของ Google\n\nวิธีแก้ไข:\n- อนุญาตให้แสดง Pop-up สำหรับเว็บไซต์นี้ หรือใช้เบราว์เซอร์ Chrome/Safari บนคอมพิวเตอร์`,
    };
  }

  if (code === "auth/popup-closed-by-user") {
    return {
      code,
      domain: currentDomain,
      title: "ยกเลิกการเข้าสู่ระบบ",
      message: "คุณได้ปิดหน้าต่างการเข้าสู่ระบบ Google ก่อนทำรายการเสร็จสมบูรณ์",
    };
  }

  return {
    code,
    domain: currentDomain,
    title: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    message: error?.message || "ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือการตั้งค่า Firebase",
  };
};

export const SUPER_ADMIN_UID = "hHUsAQdGi6MN2WQFwyS5VLPXPei1";

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save user profile to Firestore
    if (user) {
      const isSuperAdmin = user.uid === SUPER_ADMIN_UID;
      const userRef = doc(db, "users", user.uid);
      const existingSnap = await getDoc(userRef);

      if (!existingSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "ครูผู้สอน",
          photoURL: user.photoURL || "",
          role: isSuperAdmin ? "admin" : "teacher",
          status: isSuperAdmin ? "allowed" : "pending",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      } else {
        const existingData = existingSnap.data();
        await setDoc(
          userRef,
          {
            displayName: user.displayName || existingData?.displayName || "ครูผู้สอน",
            photoURL: user.photoURL || existingData?.photoURL || "",
            lastLoginAt: new Date().toISOString(),
            ...(isSuperAdmin ? { role: "admin", status: "allowed" } : {}),
          },
          { merge: true }
        );
      }
    }
    return user;
  } catch (error: any) {
    console.error("Google Sign In Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type { FirebaseUser };

