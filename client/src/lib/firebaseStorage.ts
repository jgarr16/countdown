import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

interface AppData {
  targetDate?: string;
  excludedDates: Array<{ date: string; comment?: string }>;
  tasks: Array<{
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
  }>;
}

const firebaseConfig = {
  apiKey: "AIzaSyBRY7IXl_WpYyP9b19HT2Dq_qgV3T_e6k4",
  authDomain: "craigslist-gallery.firebaseapp.com",
  databaseURL: "https://craigslist-gallery-default-rtdb.firebaseio.com",
  projectId: "craigslist-gallery",
  storageBucket: "craigslist-gallery.firebasestorage.app",
  messagingSenderId: "1054501050420",
  appId: "1:1054501050420:web:8cb8c243ae86eadf72d261",
};

function getApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
}

function getDb() {
  const app = getApp();
  return getDatabase(app);
}

const DATA_PATH = "countdown/appData";

export async function loadFromFirebase(): Promise<AppData | null> {
  try {
    const database = getDb();
    const snapshot = await get(ref(database, DATA_PATH));
    if (!snapshot.exists()) return null;
    return snapshot.val() as AppData;
  } catch (error) {
    console.error("Failed to load from Firebase:", error);
    return null;
  }
}

export async function saveToFirebase(data: AppData): Promise<void> {
  try {
    const database = getDb();
    await set(ref(database, DATA_PATH), data);
  } catch (error) {
    console.error("Failed to save to Firebase:", error);
  }
}
