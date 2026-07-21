// 🌟 ADMIN CONTROL FIRESTORE ADAPTER
import { db } from "../core/firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Subscribes to real-time staff collections
 */
export function subscribeStaff(onUpdate, onError) {
  return onSnapshot(collection(db, "staffs"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore staffs subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves staff document
 */
export async function dbSaveStaff(staff) {
  const docRef = doc(db, "staffs", staff.id);
  await setDoc(docRef, staff);
}

/**
 * Deletes staff document
 */
export async function dbDeleteStaff(id) {
  const docRef = doc(db, "staffs", id);
  await deleteDoc(docRef);
}

/**
 * Saves global application settings to Firestore
 */
export async function dbSaveSettings(settings) {
  const docRef = doc(db, "settings", "general");
  await setDoc(docRef, settings);
}

// Automatically register database hooks in cross-domain registry bridge
import { dataRegistry } from "../core/accessors.js";
dataRegistry.registerDbSaveDeliveryStatus(async (dateStr, statusObj) => {
  // simple stub
});
