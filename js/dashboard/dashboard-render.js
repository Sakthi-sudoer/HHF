// 🌟 ENTERPRISE DASHBOARD CHARTS RENDERING ENGINE
// Instantiates and manages Chart.js visual objects with theme-compliant design tokens.
import {
  getFinanceChartData,
  getMealPortionsData,
  getSubscribersPlansData,
  getDeliveryProgressData
} from "./dashboard-logic.js";

// Hold active Chart.js instances to destroy them before redrawing
let charts = {};

/**
 * Renders all dashboard charts. Safe to call repeatedly.
 */
export function renderDashboardCharts() {
  // Guard check: ensure Chart.js is loaded and view-dashboard is active
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded yet.");
    return;
  }
  const dashboardView = document.getElementById('view-dashboard');
  if (!dashboardView || dashboardView.classList.contains('hidden')) {
    return;
  }

  renderFinanceChart();
  renderMealsChart();
  renderPlansChart();
  renderDeliveryChart();
}

function renderFinanceChart() {
  const ctx = document.getElementById('chart-revenue-expenses');
  if (!ctx) return;

  const data = getFinanceChartData();

  if (charts.finance) {
    charts.finance.destroy();
  }

  // Draw a Bar chart comparing Cash Revenue and Total Expenses
  charts.finance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Revenue (வருவாய்)', 'Expenses (செலவுகள்)'],
      datasets: [{
        label: 'Amounts (₹)',
        data: [data.revenue, data.totalExpenses],
        backgroundColor: [
          'rgba(16, 185, 129, 0.75)', // Emerald
          'rgba(239, 68, 68, 0.75)'   // Rose
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'rgba(156, 163, 175, 0.85)', font: { size: 9 } },
          grid: { color: 'rgba(156, 163, 175, 0.1)' }
        },
        x: {
          ticks: { color: 'rgba(156, 163, 175, 0.85)', font: { size: 9 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderMealsChart() {
  const ctx = document.getElementById('chart-meals-distribution');
  if (!ctx) return;

  const data = getMealPortionsData();

  if (charts.meals) {
    charts.meals.destroy();
  }

  charts.meals = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(59, 130, 246, 0.75)',  // Blue
          'rgba(16, 185, 129, 0.75)',  // Emerald
          'rgba(245, 158, 11, 0.75)'   // Amber
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'rgba(156, 163, 175, 0.85)', font: { size: 9 } }
        }
      }
    }
  });
}

function renderPlansChart() {
  const ctx = document.getElementById('chart-customers-status');
  if (!ctx) return;

  const data = getSubscribersPlansData();

  if (charts.plans) {
    charts.plans.destroy();
  }

  charts.plans = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(139, 92, 246, 0.75)', // Purple
          'rgba(236, 72, 153, 0.75)', // Pink
          'rgba(79, 70, 229, 0.75)'   // Indigo
        ],
        borderColor: [
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(79, 70, 229)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'rgba(156, 163, 175, 0.85)', font: { size: 9 } }
        }
      }
    }
  });
}

function renderDeliveryChart() {
  const ctx = document.getElementById('chart-delivery-progress');
  if (!ctx) return;

  const data = getDeliveryProgressData();

  if (charts.delivery) {
    charts.delivery.destroy();
  }

  charts.delivery = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(16, 185, 129, 0.75)', // Emerald (Delivered)
          'rgba(245, 158, 11, 0.75)',  // Amber (Pending)
          'rgba(239, 68, 68, 0.75)'    // Red (Skipped)
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'rgba(156, 163, 175, 0.85)', font: { size: 9 } }
        }
      }
    }
  });
}
