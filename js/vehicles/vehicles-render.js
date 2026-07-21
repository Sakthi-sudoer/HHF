// 🌟 VEHICLES & TRIPS RENDERING MODULE
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate, formatTimeString, formatCurrency } from "../core/shared-utils.js";
import { 
  dbSaveVehicle, 
  dbDeleteVehicle, 
  dbSaveTrip, 
  dbDeleteTrip 
} from "./vehicles-firestore.js";
import { 
  calculateVehicleOdometer, 
  calculateTripMetrics, 
  getVehicleStats 
} from "./vehicles-logic.js";

let activeVehicleDetailId = null;
let activeVehicleDetailTab = 'today';

/**
 * Renders the main vehicles view, including vehicles list and trips timeline
 */
export function renderVehiclesView() {
  const vehicles = dataRegistry.getVehicles() || [];
  const trips = dataRegistry.getTrips() || [];
  const staff = dataRegistry.getStaff() || [];
  const customers = dataRegistry.getCustomers() || [];
  const settings = dataRegistry.getSettings() || {};
  const todayStr = formatLocalDate(new Date());

  // 1. Populate Dropdown filters
  const filterVeh = document.getElementById('filter-trip-vehicle');
  const filterDriver = document.getElementById('filter-trip-driver');
  const filterStaff = document.getElementById('filter-trip-staff');
  const filterTripDate = document.getElementById('filter-trip-date');

  const selectedVeh = filterVeh ? filterVeh.value : 'all';
  const selectedDriver = filterDriver ? filterDriver.value : 'all';
  const selectedStaff = filterStaff ? filterStaff.value : 'all';

  if (filterVeh) {
    filterVeh.innerHTML = '<option value="all">All Vehicles</option>' + 
      vehicles.map(v => `<option value="${v.id}">${v.plateNumber}</option>`).join('');
    filterVeh.value = selectedVeh;
  }

  const staffOptions = staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (filterDriver) {
    filterDriver.innerHTML = '<option value="all">All Drivers</option>' + staffOptions;
    filterDriver.value = selectedDriver;
  }
  if (filterStaff) {
    filterStaff.innerHTML = '<option value="all">All Staff</option>' + staffOptions;
    filterStaff.value = selectedStaff;
  }
  if (filterTripDate && !filterTripDate.value) {
    filterTripDate.value = todayStr;
  }

  // 2. Render Vehicles List
  const listContainer = document.getElementById('vehicles-list-container');
  if (listContainer) {
    listContainer.innerHTML = '';
    
    if (vehicles.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-6 text-slate-400 italic">
          No vehicles recorded.
        </div>
      `;
    } else {
      vehicles.forEach(v => {
        const latestOdo = calculateVehicleOdometer(v.id, vehicles, trips);
        const stats = getVehicleStats(v.id, vehicles, trips, todayStr, settings, staff, customers);
        
        let statusBadge = 'bg-slate-100 text-slate-500 border border-slate-200';
        if (v.status === 'active') statusBadge = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        if (v.status === 'maintenance') statusBadge = 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse';

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3 shadow-sm hover:shadow transition";
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">${v.plateNumber}</h4>
              <span class="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5"><i class="fa-solid fa-motorcycle mr-1"></i>${v.model}</span>
            </div>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadge}">${v.status}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
            <div>Odometer: <span class="font-bold text-slate-700 dark:text-slate-300">${latestOdo} km</span></div>
            <div>Tot Distance: <span class="font-bold text-slate-700 dark:text-slate-300">${stats ? stats.totalKm : 0} km</span></div>
            <div class="col-span-2 border-t dark:border-slate-800 pt-1 flex justify-between items-center text-[9px]">
              <span>Deliveries: <b>${stats ? stats.totalDeliveries : 0}</b></span>
              <span class="text-rose-600 dark:text-rose-400 font-bold">Fuel: ${formatCurrency(stats ? stats.totalFuel : 0)}</span>
            </div>
          </div>
          
          <div class="flex justify-between items-center pt-2 border-t dark:border-slate-700 text-[10px] gap-2">
            <button onclick="window.appVehicles.openDetailModal('${v.id}')" class="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg transition border border-emerald-100 dark:border-emerald-950/40 flex items-center justify-center space-x-1">
              <i class="fa-solid fa-gauge"></i> <span>Dashboard</span>
            </button>
            <button onclick="window.appVehicles.openVehicleModal('${v.id}')" class="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-650 border dark:border-slate-650 rounded-lg text-slate-500 dark:text-slate-300" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button onclick="window.appVehicles.deleteVehicle('${v.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-950/60 rounded-lg text-rose-500 dark:text-rose-400" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;
        listContainer.appendChild(card);
      });
    }
  }

  // 3. Render Trips Timeline
  renderTripsTimeline();
}

/**
 * Renders the chronological trips timeline
 */
export function renderTripsTimeline() {
  const container = document.getElementById('trips-timeline-container');
  if (!container) return;

  const trips = dataRegistry.getTrips() || [];
  const vehicles = dataRegistry.getVehicles() || [];
  const staff = dataRegistry.getStaff() || [];
  const customers = dataRegistry.getCustomers() || [];
  const settings = dataRegistry.getSettings() || {};

  const filterDate = document.getElementById('filter-trip-date')?.value || '';
  const filterVeh = document.getElementById('filter-trip-vehicle')?.value || 'all';
  const filterDriver = document.getElementById('filter-trip-driver')?.value || 'all';
  const filterStaff = document.getElementById('filter-trip-staff')?.value || 'all';
  const filterRoute = document.getElementById('filter-trip-route')?.value.toLowerCase().trim() || '';

  const filteredTrips = trips.filter(t => {
    if (filterDate && t.date !== filterDate) return false;
    if (filterVeh !== 'all' && t.vehicleId !== filterVeh) return false;
    if (filterDriver !== 'all' && t.driverName !== filterDriver) return false;
    if (filterStaff !== 'all' && t.deliveryStaff !== filterStaff) return false;
    if (filterRoute && !(t.routeName || '').toLowerCase().includes(filterRoute) && !(t.deliveryArea || '').toLowerCase().includes(filterRoute)) return false;
    return true;
  });

  filteredTrips.sort((a, b) => b.date.localeCompare(a.date) || (parseInt(b.tripNumber) - parseInt(a.tripNumber)));

  // Calculate accumulated trip stats
  let distanceTotal = 0;
  let fuelTotal = 0;
  let delivTotal = 0;

  container.innerHTML = '';
  if (filteredTrips.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-slate-400 italic text-xs">No matching trips found.</div>`;
  } else {
    filteredTrips.forEach(t => {
      const m = calculateTripMetrics(t, customers, settings);
      distanceTotal += m.distance;
      fuelTotal += m.fuelCost;
      delivTotal += m.customersCount;

      const vehicle = vehicles.find(v => v.id === t.vehicleId);
      const driver = staff.find(s => s.id === t.driverName);
      const deliveryAgent = staff.find(s => s.id === t.deliveryStaff);

      const timelineItem = document.createElement('div');
      timelineItem.className = "timeline-item relative pl-2.5 space-y-2";
      timelineItem.innerHTML = `
        <div class="timeline-node"></div>
        
        <div class="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 hover:shadow-md transition">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-slate-850 pb-2 gap-2">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-xs text-slate-800 dark:text-slate-200">Trip #${t.tripNumber} (${t.date})</span>
                <span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded border dark:border-slate-700 uppercase">${t.routeName}</span>
              </div>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block"><i class="fa-solid fa-map-pin mr-1"></i>Area: ${t.deliveryArea}</span>
            </div>
            <div class="flex items-center space-x-1.5 self-end text-[10px]">
              <button onclick="window.appVehicles.openTripModal('${t.id}')" class="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-650 border dark:border-slate-650 text-slate-500 dark:text-slate-300 font-bold rounded-lg transition"><i class="fa-solid fa-pen mr-1"></i>Edit</button>
              <button onclick="window.appVehicles.deleteTrip('${t.id}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-950/60 text-rose-500 dark:text-rose-400 font-bold rounded-lg transition"><i class="fa-solid fa-trash mr-1"></i>Delete</button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <div>
              <span class="text-[9px] text-slate-400 uppercase block font-bold">Vehicle / Driver</span>
              <span class="font-bold text-slate-700 dark:text-slate-300 block">${vehicle ? vehicle.plateNumber : 'Unassigned'}</span>
              <span>Driver: ${driver ? driver.name : 'Unassigned'}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-400 uppercase block font-bold">Odo / Time</span>
              <span class="font-bold text-slate-700 dark:text-slate-300 block">${t.startOdometer} km → ${t.endOdometer} km</span>
              <span>${t.startTime ? formatTimeString(t.startTime) : '-'} to ${t.endTime ? formatTimeString(t.endTime) : '-'}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-400 uppercase block font-bold">Distance & Fuel</span>
              <span class="font-bold text-indigo-600 dark:text-indigo-400 block">${m.distance} km</span>
              <span class="font-bold text-rose-600 dark:text-rose-400">Fuel: ${formatCurrency(m.fuelCost)}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-400 uppercase block font-bold">Deliveries</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400 block">${m.customersCount} Cust</span>
              <span class="font-semibold text-purple-700 dark:text-purple-400">Meals: ${m.mealsCount}</span>
            </div>
          </div>
        </div>
      `;
      container.appendChild(timelineItem);
    });
  }

  // Update metrics row elements
  const distEl = document.getElementById('trip-metric-distance');
  const fuelEl = document.getElementById('trip-metric-fuel');
  const custEl = document.getElementById('trip-metric-customers');
  const avgCostEl = document.getElementById('trip-metric-cost-per-del');

  if (distEl) distEl.textContent = `${distanceTotal} km`;
  if (fuelEl) fuelEl.textContent = formatCurrency(fuelTotal);
  if (custEl) custEl.textContent = delivTotal;
  if (avgCostEl) {
    const avg = delivTotal > 0 ? fuelTotal / delivTotal : 0;
    avgCostEl.textContent = formatCurrency(avg);
  }
}

/**
 * Vehicle Profile creation modal handlers
 */
export function openVehicleModal(id = '') {
  const form = document.getElementById('vehicle-form');
  if (!form) return;
  form.reset();

  const title = document.getElementById('vehicle-modal-title');
  const editId = document.getElementById('vehicle-edit-id');

  if (id) {
    title.textContent = "Edit Vehicle Details";
    const v = dataRegistry.getVehicles().find(x => x.id === id);
    if (!v) return;
    editId.value = v.id;
    document.getElementById('vehicle-plate').value = v.plateNumber || '';
    document.getElementById('vehicle-model').value = v.model || '';
    document.getElementById('vehicle-odo').value = v.odo || 0;
    document.getElementById('vehicle-status').value = v.status || 'active';
  } else {
    title.textContent = "Add New Vehicle";
    editId.value = '';
  }

  document.getElementById('vehicle-modal').style.display = 'flex';
}

export function closeVehicleModal() {
  document.getElementById('vehicle-modal').style.display = 'none';
}

export async function saveVehicleForm(e) {
  e.preventDefault();
  const editId = document.getElementById('vehicle-edit-id').value;
  const plate = document.getElementById('vehicle-plate').value.trim();
  const model = document.getElementById('vehicle-model').value.trim();
  const odo = parseFloat(document.getElementById('vehicle-odo').value) || 0;
  const status = document.getElementById('vehicle-status').value;

  const id = editId || "veh_" + Date.now();
  const vehicle = { id, plateNumber: plate, model, odo, status };

  try {
    await dbSaveVehicle(vehicle);
    closeVehicleModal();
    renderVehiclesView();
  } catch (err) {
    alert("Error saving vehicle details.");
  }
}

export function deleteVehicle(id) {
  if (confirm("Delete this vehicle?")) {
    dbDeleteVehicle(id).then(() => renderVehiclesView());
  }
}

/**
 * Trip Creation modal handlers
 */
export function openTripModal(id = '') {
  const form = document.getElementById('trip-form');
  if (!form) return;
  form.reset();

  const title = document.getElementById('trip-modal-title');
  const editId = document.getElementById('trip-edit-id');
  const vehicleSelect = document.getElementById('trip-vehicle');
  const driverSelect = document.getElementById('trip-driver');
  const staffSelect = document.getElementById('trip-staff');

  const vehicles = dataRegistry.getVehicles() || [];
  const staff = dataRegistry.getStaff() || [];

  // Load select listings
  vehicleSelect.innerHTML = `<option value="">Select Vehicle</option>` +
    vehicles.map(v => `<option value="${v.id}">${v.plateNumber}</option>`).join('');
  
  const staffOptions = staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  driverSelect.innerHTML = `<option value="">Select Driver</option>` + staffOptions;
  staffSelect.innerHTML = `<option value="">Select Staff</option>` + staffOptions;

  // Render checkbox list of active customers
  const listContainer = document.getElementById('trip-customers-list');
  listContainer.innerHTML = '';
  dataRegistry.getCustomers().forEach(c => {
    if (c.status === 'withdrawn') return;
    const div = document.createElement('label');
    div.className = "flex items-center space-x-2 p-1.5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg cursor-pointer";
    div.innerHTML = `
      <input type="checkbox" class="trip-customer-cb w-4 h-4 text-emerald-600 rounded" data-cust-id="${c.id}">
      <span class="text-xs text-slate-800 dark:text-slate-200">${c.name} (${c.address || 'No Addr'})</span>
    `;
    listContainer.appendChild(div);
  });

  if (id) {
    title.textContent = "Edit Trip Record";
    const t = dataRegistry.getTrips().find(x => x.id === id);
    if (!t) return;

    editId.value = t.id;
    document.getElementById('trip-number').value = t.tripNumber || 1;
    document.getElementById('trip-date').value = t.date || '';
    vehicleSelect.value = t.vehicleId || '';
    driverSelect.value = t.driverName || '';
    staffSelect.value = t.deliveryStaff || '';
    document.getElementById('trip-route-name').value = t.routeName || '';
    document.getElementById('trip-odo-start').value = t.startOdometer || 0;
    document.getElementById('trip-odo-end').value = t.endOdometer || 0;
    document.getElementById('trip-area').value = t.deliveryArea || '';
    document.getElementById('trip-start-time').value = t.startTime || '';
    document.getElementById('trip-end-time').value = t.endTime || '';

    // Check delivered customers
    const checked = t.customerIds || [];
    document.querySelectorAll('.trip-customer-cb').forEach(cb => {
      const cid = cb.getAttribute('data-cust-id');
      cb.checked = checked.includes(cid);
    });
  } else {
    title.textContent = "Record New Trip Log";
    editId.value = '';
    document.getElementById('trip-date').value = formatLocalDate(new Date());
    document.getElementById('trip-number').value = tripsCountToday() + 1;
  }

  calcTripDistance();
  document.getElementById('trip-modal').style.display = 'flex';
}

function tripsCountToday() {
  const today = formatLocalDate(new Date());
  return (dataRegistry.getTrips() || []).filter(t => t.date === today).length;
}

export function closeTripModal() {
  document.getElementById('trip-modal').style.display = 'none';
}

export function calcTripDistance() {
  const start = parseFloat(document.getElementById('trip-odo-start').value) || 0;
  const end = parseFloat(document.getElementById('trip-odo-end').value) || 0;
  const distance = Math.max(0, end - start);
  
  const distanceInput = document.getElementById('trip-distance');
  const fuelInput = document.getElementById('trip-fuel-cost');
  if (distanceInput) distanceInput.value = `${distance} km`;
  
  if (fuelInput) {
    const fuelCostPerKm = parseFloat(dataRegistry.getSettings().fuelCostPerKm) || 10;
    fuelInput.value = formatCurrency(distance * fuelCostPerKm);
  }
}

export function updateTripOdometerStart() {
  const vehId = document.getElementById('trip-vehicle').value;
  if (vehId) {
    const latestOdo = calculateVehicleOdometer(vehId, dataRegistry.getVehicles(), dataRegistry.getTrips());
    document.getElementById('trip-odo-start').value = latestOdo;
    calcTripDistance();
  }
}

export async function saveTripForm(e) {
  e.preventDefault();
  const editId = document.getElementById('trip-edit-id').value;
  
  const checkedCustIds = [];
  document.querySelectorAll('.trip-customer-cb:checked').forEach(cb => {
    checkedCustIds.push(cb.getAttribute('data-cust-id'));
  });

  const id = editId || "tr_" + Date.now();
  const trip = {
    id,
    tripNumber: parseInt(document.getElementById('trip-number').value) || 1,
    date: document.getElementById('trip-date').value,
    vehicleId: document.getElementById('trip-vehicle').value,
    driverName: document.getElementById('trip-driver').value,
    deliveryStaff: document.getElementById('trip-staff').value,
    routeName: document.getElementById('trip-route-name').value.trim(),
    startOdometer: parseFloat(document.getElementById('trip-odo-start').value) || 0,
    endOdometer: parseFloat(document.getElementById('trip-odo-end').value) || 0,
    deliveryArea: document.getElementById('trip-area').value.trim(),
    startTime: document.getElementById('trip-start-time').value || '',
    endTime: document.getElementById('trip-end-time').value || '',
    customerIds: checkedCustIds
  };

  try {
    await dbSaveTrip(trip);
    closeTripModal();
    renderVehiclesView();
  } catch (err) {
    alert("Error saving trip data.");
  }
}

export function deleteTrip(id) {
  if (confirm("Delete this trip record?")) {
    dbDeleteTrip(id).then(() => renderVehiclesView());
  }
}

/**
 * Dynamic vehicle performance modal details
 */
export function openDetailModal(vehicleId) {
  activeVehicleDetailId = vehicleId;
  activeVehicleDetailTab = 'today';
  
  const v = dataRegistry.getVehicles().find(x => x.id === vehicleId);
  if (!v) return;

  document.getElementById('vehicle-detail-modal-title').textContent = `${v.plateNumber} (${v.model})`;
  setVehicleDetailTab('today');
  
  document.getElementById('vehicle-detail-modal').style.display = 'flex';
}

export function closeVehicleDetailModal() {
  document.getElementById('vehicle-detail-modal').style.display = 'none';
}

export function setVehicleDetailTab(tab) {
  activeVehicleDetailTab = tab;
  
  const tabs = ['today', 'yesterday', 'month'];
  tabs.forEach(tName => {
    const el = document.getElementById(`v-tab-${tName}`);
    if (el) {
      if (tName === tab) {
        el.className = "flex-1 py-1.5 text-center font-bold rounded-lg transition-all text-white bg-emerald-600 shadow-sm";
      } else {
        el.className = "flex-1 py-1.5 text-center font-bold rounded-lg transition-all text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
      }
    }
  });

  renderVehicleDetailTrips();
}

function renderVehicleDetailTrips() {
  const container = document.getElementById('vehicle-trips-list');
  if (!container) return;
  container.innerHTML = '';

  const vehicles = dataRegistry.getVehicles();
  const trips = dataRegistry.getTrips();
  const staff = dataRegistry.getStaff();
  const customers = dataRegistry.getCustomers();
  const settings = dataRegistry.getSettings();
  const todayStr = formatLocalDate(new Date());

  const stats = getVehicleStats(activeVehicleDetailId, vehicles, trips, todayStr, settings, staff, customers);
  if (!stats) return;

  // Render stats counters in modal header
  document.getElementById('v-detail-stat-km').textContent = `${stats.totalKm} km`;
  document.getElementById('v-detail-stat-fuel').textContent = formatCurrency(stats.totalFuel);
  document.getElementById('v-detail-stat-deliv').textContent = stats.totalDeliveries;
  document.getElementById('v-detail-stat-avg-km').textContent = `${stats.averageKmPerTrip.toFixed(1)} km`;

  let tabTrips = [];
  if (activeVehicleDetailTab === 'today') tabTrips = stats.todayTrips;
  else if (activeVehicleDetailTab === 'yesterday') tabTrips = stats.yesterdayTrips;
  else if (activeVehicleDetailTab === 'month') tabTrips = stats.monthlyTrips;

  if (tabTrips.length === 0) {
    container.innerHTML = `<div class="text-slate-400 italic py-6 text-center">No trip logs for this period.</div>`;
    return;
  }

  tabTrips.forEach(t => {
    const m = calculateTripMetrics(t, customers, settings);
    const driver = staff.find(s => s.id === t.driverName);
    
    const div = document.createElement('div');
    div.className = "p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl space-y-2 text-xs text-slate-600 dark:text-slate-400";
    div.innerHTML = `
      <div class="flex justify-between items-center border-b dark:border-slate-800 pb-1.5 font-bold">
        <span class="text-slate-800 dark:text-slate-200">Trip #${t.tripNumber} (${t.date})</span>
        <span class="text-indigo-600 dark:text-indigo-400">${m.distance} km</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5 text-[10px]">
        <div>Route: <b>${t.routeName}</b></div>
        <div>Driver: <b>${driver ? driver.name : 'Unassigned'}</b></div>
        <div>Delivered: <b>${m.customersCount} Cust (${m.mealsCount} Meals)</b></div>
        <div class="text-rose-600 dark:text-rose-400 font-bold">Fuel Cost: ${formatCurrency(m.fuelCost)}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Global hookup
window.appVehicles = {
  render: renderVehiclesView,
  openVehicleModal,
  closeVehicleModal,
  saveVehicleForm,
  deleteVehicle,
  openTripModal,
  closeTripModal,
  calcTripDistance,
  updateTripOdometerStart,
  saveTripForm,
  deleteTrip,
  openDetailModal,
  closeVehicleDetailModal,
  setVehicleDetailTab
};
