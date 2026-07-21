// 🌟 KITCHEN FIRESTORE ADAPTER
import { db } from "../core/firebase-init.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Saves current grocery portion size settings to settings collection
 */
export async function dbSaveKitchenPortionSettings(settingsObj) {
  const docRef = doc(db, "settings", "general");
  await setDoc(docRef, settingsObj, { merge: true });
}
