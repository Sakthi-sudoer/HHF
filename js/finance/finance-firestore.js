// 🌟 FINANCE & EXPENSES FIRESTORE ADAPTER
import { db } from "../core/firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Subscribes to real-time updates of the expenses collection
 */
export function subscribeExpenses(onUpdate, onError) {
  return onSnapshot(collection(db, "expenses"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore expenses subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves an expense document
 */
export async function dbSaveExpense(expense) {
  const docRef = doc(db, "expenses", expense.id);
  await setDoc(docRef, expense);
}

/**
 * Deletes an expense document
 */
export async function dbDeleteExpense(id) {
  const docRef = doc(db, "expenses", id);
  await deleteDoc(docRef);
}
