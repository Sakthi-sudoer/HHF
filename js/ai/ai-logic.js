// 🌟 AI CHAT ASSISTANT BUSINESS LOGIC MODULE
// Compiles database context and makes calls to Google Gemini API in Tamil.
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate } from "../core/shared-utils.js";

/**
 * Compiles a text description of the current database state
 * @returns {string} Context JSON string
 */
function compileDatabaseContext() {
  const customers = dataRegistry.getCustomers() || [];
  const expenses = dataRegistry.getExpenses() || [];
  const vehicles = dataRegistry.getVehicles() || [];
  const trips = dataRegistry.getTrips() || [];
  const settings = dataRegistry.getSettings() || {};
  const today = formatLocalDate(new Date());

  const activeCust = customers.filter(c => c.status === 'active');
  const totalCost = activeCust.reduce((acc, c) => acc + (parseFloat(c.cost) || 0), 0);
  const totalPaid = activeCust.reduce((acc, c) => acc + (parseFloat(c.paid) || 0), 0);
  const outstanding = totalCost - totalPaid;
  const totalExp = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

  const contextData = {
    metadata: {
      todayDate: today,
      businessName: settings.bizName || "Healthy Home's Foods",
      activeCustomersCount: activeCust.length,
      totalRegisteredCustomers: customers.length,
      projectedMonthlyRevenue: totalCost,
      receivedPayments: totalPaid,
      totalOutstandingDues: outstanding,
      totalExpensesLogged: totalExp,
      estimatedProfit: totalCost - totalExp
    },
    customers: customers.map(c => ({
      name: c.name,
      company: c.companyName || 'None',
      phone: c.phone,
      address: c.address || 'No Address',
      plan: c.isTrial ? '6 Days Trial' : (c.paymentTerm === 'weekly' ? 'Weekly' : 'Monthly'),
      meals: `Breakfast:${c.breakfast ? c.breakfastQty : 0}, Lunch:${c.lunch ? c.lunchQty : 0}, Dinner:${c.dinner ? c.dinnerQty : 0}`,
      status: c.status,
      startDate: c.start || 'N/A',
      endDate: c.end || 'N/A',
      cost: c.cost || 0,
      paid: c.paid || 0,
      outstanding: Math.max(0, (c.cost || 0) - (c.paid || 0)),
      notes: c.notes || 'None'
    })),
    expenses: expenses.map(e => ({
      date: e.date,
      item: e.item,
      category: e.category,
      amount: e.amount
    })),
    vehicles: vehicles.map(v => ({
      plate: v.plateNumber,
      model: v.model,
      odometer: v.odo || 0,
      status: v.status
    })),
    trips: trips.slice(0, 10).map(t => ({
      date: t.date,
      tripNo: t.tripNumber,
      route: t.routeName,
      odoStart: t.startOdometer,
      odoEnd: t.endOdometer,
      area: t.deliveryArea,
      customersDeliveredCount: (t.customerIds || []).length
    }))
  };

  return JSON.stringify(contextData, null, 2);
}

/**
 * Calls Gemini API with the database context and user message
 * @param {string} apiKey Gemini developer API key
 * @param {string} userMessage User query
 * @param {Array} chatHistory Previous messages context
 * @returns {Promise<string>} Tamil response from Gemini
 */
export async function queryGeminiAssistant(apiKey, userMessage, chatHistory = []) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const dbContext = compileDatabaseContext();

  // Self-healing attempts list (endpoints and models)
  const attempts = [
    { ver: "v1beta", model: "gemini-2.5-flash" },
    { ver: "v1", model: "gemini-2.5-flash" },
    { ver: "v1beta", model: "gemini-2.0-flash" },
    { ver: "v1beta", model: "gemini-2.5-pro" },
    { ver: "v1beta", model: "gemini-1.5-flash" },
    { ver: "v1", model: "gemini-1.5-flash" },
    { ver: "v1beta", model: "gemini-pro" }
  ];


  const systemInstruction = `
You are the Official AI Operations & Financial Analyst for "Healthy Home's Foods".
You MUST speak/answer exclusively in fluent, polite, and professional Tamil (தமிழ்).
You have full real-time access to the company's Firestore database snapshot (provided in JSON below).

Your capabilities include:
1. Auditing subscriber plans, dues, and identifying unpaid customer groups.
2. Calculating accrual revenue, cash receipts, and predicting profit allocations.
3. Suggesting grocery ingredient weight demands (Rice, Dal, Oil) or optimization strategies.
4. Analyzing vehicle distances, trips frequencies, and estimating fuel rates per kilometer.
5. Providing growth predictions and cost reductions.

Ensure your tone is premium, helpful, and operationally precise. Use structured markdown tables (containing headers and rows) when presenting tabular lists, comparisons, or financial dues. Use bullet points and emojis for explanations.

DATABASE CONTEXT SNAPSHOT (JSON):
${dbContext}
`;



  // Build content request payload including history
  const contents = [
    {
      role: "user",
      parts: [{ text: `System Instructions: ${systemInstruction}\n\nUnderstood? Let's start.` }]
    },
    {
      role: "model",
      parts: [{ text: "புரிந்தது. நான் 'ஹெல்தி ஹோம்ஸ் ஃபுட்ஸ்' நிறுவனத்தின் நிதி மற்றும் செயல்பாட்டு மேலாண்மை AI உதவியாளராக செயல்படுவேன். உங்களின் கேள்விகளுக்குத் தமிழில் பதிலளிக்கத் தயாராக உள்ளேன். தயவுசெய்து உங்களின் கேள்வியைக் கேளுங்கள்!" }]
    }
  ];

  // Inject previous conversation turns
  chatHistory.forEach(msg => {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  });

  // Inject active user question
  contents.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  const errorReports = [];

  for (let attempt of attempts) {
    const endpoint = `https://generativelanguage.googleapis.com/${attempt.ver}/models/${attempt.model}:generateContent?key=${apiKey}`;
    
    try {
      console.log(`Attempting Gemini API Call: ${attempt.ver} - ${attempt.model}`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          console.log(`Gemini API connection success: ${attempt.model}`);
          return replyText;
        }
      } else {
        const errData = await response.json();
        const msg = errData.error?.message || `HTTP ${response.status}`;
        console.warn(`Gemini Model ${attempt.model} failed:`, msg);
        errorReports.push(`${attempt.model} (${attempt.ver}): ${msg}`);
      }
    } catch (err) {
      console.warn(`Gemini Model ${attempt.model} exception:`, err.message);
      errorReports.push(`${attempt.model} (${attempt.ver}): ${err.message}`);
    }
  }

  throw new Error("இணைப்புத் தோல்வி விவரங்கள்:\n" + errorReports.map((r, i) => `${i+1}. ${r}`).join('\n'));

}

/**
 * Runs diagnostics using Google Model Service
 * @param {string} apiKey 
 * @returns {Promise<Object>}
 */
export async function runGeminiDiagnostics(apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}


