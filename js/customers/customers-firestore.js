// 🌟 CUSTOMERS FIRESTORE DATABASE ADAPTER
import { db } from "../core/firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Subscribes to real-time updates of the customers collection
 */
export function subscribeCustomers(onUpdate, onError) {
  return onSnapshot(collection(db, "customers"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore customers subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time updates of the leaves collection
 */
export function subscribeLeaves(onUpdate, onError) {
  return onSnapshot(collection(db, "leaves"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore leaves subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time updates of the skips collection
 */
export function subscribeSkips(onUpdate, onError) {
  return onSnapshot(collection(db, "skips"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore skips subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time updates of the alternates collection
 */
export function subscribeAlternates(onUpdate, onError) {
  return onSnapshot(collection(db, "alternates"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore alternates subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates a customer document
 */
export async function dbSaveCustomer(customer) {
  const docRef = doc(db, "customers", customer.id);
  await setDoc(docRef, customer);
}

/**
 * Deletes a customer document
 */
export async function dbDeleteCustomer(id) {
  const docRef = doc(db, "customers", id);
  await deleteDoc(docRef);
}

/**
 * Saves a leave document
 */
export async function dbSaveLeave(leave) {
  const docRef = doc(db, "leaves", leave.id);
  await setDoc(docRef, leave);
}

/**
 * Deletes a leave document
 */
export async function dbDeleteLeave(id) {
  const docRef = doc(db, "leaves", id);
  await deleteDoc(docRef);
}

/**
 * Saves a skip document
 */
export async function dbSaveSkip(skip) {
  const docRef = doc(db, "skips", skip.id);
  await setDoc(docRef, skip);
}

/**
 * Deletes a skip document
 */
export async function dbDeleteSkip(id) {
  const docRef = doc(db, "skips", id);
  await deleteDoc(docRef);
}

/**
 * Saves an alternate delivery date document
 */
export async function dbSaveAlternate(alternate) {
  const docRef = doc(db, "alternates", alternate.id);
  await setDoc(docRef, alternate);
}

/**
 * Deletes an alternate delivery date document
 */
export async function dbDeleteAlternate(id) {
  const docRef = doc(db, "alternates", id);
  await deleteDoc(docRef);
}

// Automatically register database hooks in cross-domain registry bridge
import { dataRegistry } from "../core/accessors.js";
dataRegistry.registerDbSaveCustomer(dbSaveCustomer);
dataRegistry.registerDbSaveLeave(dbSaveLeave);
dataRegistry.registerDbSaveSkip(dbSaveSkip);
dataRegistry.registerDbSaveAlternate(dbSaveAlternate);

