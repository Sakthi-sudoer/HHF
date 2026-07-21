// 🌟 VEHICLES & TRIPS FIRESTORE ADAPTER
import { db } from "../core/firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Subscribes to real-time updates of the vehicles collection
 */
export function subscribeVehicles(onUpdate, onError) {
  return onSnapshot(collection(db, "vehicles"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore vehicles subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time updates of the trips collection
 */
export function subscribeTrips(onUpdate, onError) {
  return onSnapshot(collection(db, "trips"), 
    snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      onUpdate(list);
    }, 
    error => {
      console.error("Firestore trips subscription error", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a vehicle document
 */
export async function dbSaveVehicle(vehicle) {
  const docRef = doc(db, "vehicles", vehicle.id);
  await setDoc(docRef, vehicle);
}

/**
 * Deletes a vehicle document
 */
export async function dbDeleteVehicle(id) {
  const docRef = doc(db, "vehicles", id);
  await deleteDoc(docRef);
}

/**
 * Saves a trip document
 */
export async function dbSaveTrip(trip) {
  const docRef = doc(db, "trips", trip.id);
  await setDoc(docRef, trip);
}

/**
 * Deletes a trip document
 */
export async function dbDeleteTrip(id) {
  const docRef = doc(db, "trips", id);
  await deleteDoc(docRef);
}

// Automatically register database hooks in cross-domain registry bridge
import { dataRegistry } from "../core/accessors.js";
dataRegistry.registerDbSaveDeliveryStatus(async (dateStr, statusObj) => {
  // Simple wrapper or stub, because deliveries are in delivery-firestore.js
});
