// 🌟 DELIVERY PLANNING FIRESTORE ADAPTER
import { db } from "../core/firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Listens to delivery checklists updates for a specific YYYY-MM-DD date
 */
export function subscribeDeliveriesForDate(dateStr, onUpdate, onError) {
  const docRef = doc(db, "deliveries", dateStr);
  return onSnapshot(docRef, 
    docSnap => {
      const data = docSnap.exists() ? docSnap.data() : {};
      onUpdate(data);
    },
    error => {
      console.error("Firestore deliveries checklist snapshot error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a delivery status document for a given date
 */
export async function dbSaveDeliveryStatus(dateStr, statusObj) {
  const docRef = doc(db, "deliveries", dateStr);
  await setDoc(docRef, statusObj);
}

/**
 * Subscribes to staff collection
 */
export function subscribeStaffList(onUpdate, onError) {
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
 * Retrieves delivery checklist for a specific date (one-off read)
 */
export async function dbGetDeliveriesForDate(dateStr) {
  const docRef = doc(db, "deliveries", dateStr);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : {};
}

// Automatically register database hooks in cross-domain registry bridge
import { dataRegistry } from "../core/accessors.js";
dataRegistry.registerDbSaveDeliveryStatus(dbSaveDeliveryStatus);

