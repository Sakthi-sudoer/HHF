// 🌟 AI CHAT ASSISTANT UI RENDERING ENGINE
// Dynamically appends the AI chatbot to the page layout and handles interactions.
import { getGeminiAPIKey, saveGeminiAPIKey } from "./ai-firestore.js";
import { queryGeminiAssistant, runGeminiDiagnostics } from "./ai-logic.js";
import { t } from "../core/i18n.js";

let chatHistory = [];
let isDrawerOpen = false;

/**
 * Initializes and dynamically appends the AI Chat widget to the page body
 */
export function initAIChatWidget() {
  if (document.getElementById('ai-chat-drawer')) return;

  // 1. Create and append the floating AI shortcut button
  const fabContainer = document.getElementById('fab-container');
  if (fabContainer) {
    const aiBtn = document.createElement('button');
    aiBtn.id = "fab-ai-chat-btn";
    aiBtn.onclick = toggleAIChatDrawer;
    aiBtn.className = "w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition transform active:scale-95 duration-200";
    aiBtn.title = "AI தமிழ் உதவியாளர்";
    aiBtn.innerHTML = `<i class="fa-solid fa-robot text-xl"></i>`;
    
    // Insert before the main FAB trigger button
    fabContainer.insertBefore(aiBtn, fabContainer.firstChild);
  }

  // 2. Create and append the slide-out AI Drawer
  const drawer = document.createElement('div');
  drawer.id = "ai-chat-drawer";
  drawer.className = "fixed right-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col transition-all duration-300 transform translate-x-full text-xs";
  drawer.innerHTML = `
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fa-solid fa-robot text-lg animate-bounce"></i>
        <div>
          <h3 class="font-bold text-sm">AI தமிழ் உதவியாளர்</h3>
          <span class="text-[9px] opacity-80 block">Gemini 1.5 Real-Time Analysis</span>
        </div>
      </div>
      <button onclick="window.appAI.toggleDrawer()" class="text-white hover:text-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
    </div>

    <!-- API Onboarding (Hidden if key is present) -->
    <div id="ai-api-setup-panel" class="p-4 bg-amber-50 dark:bg-amber-950/20 border-b dark:border-amber-900/20 hidden space-y-2">
      <p class="font-semibold text-amber-800 dark:text-amber-300 text-[10px]">
        Gemini API Key தேவை. Google AI Studio-வில் இலவசமாக ஒரு சாவியைப் பெற்று இங்கு சேமிக்கவும்:
      </p>
      <div class="flex space-x-2">
        <input type="password" id="ai-api-key-input" placeholder="AIzaSy..." class="flex-1 p-2 border rounded-xl dark:bg-slate-900 dark:border-slate-750">
        <button onclick="window.appAI.saveKey()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold transition">Save</button>
      </div>
      <a href="https://aistudio.google.com/" target="_blank" class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold underline block mt-1"><i class="fa-solid fa-external-link mr-1"></i>Get Free API Key from Google AI Studio</a>
    </div>

    <!-- Messages Container -->
    <div id="ai-messages-container" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-container bg-slate-50 dark:bg-slate-900/20">
      <!-- Welcome message -->
      <div class="flex items-start space-x-2">
        <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs"><i class="fa-solid fa-robot"></i></div>
        <div class="bg-white dark:bg-slate-800 border dark:border-slate-750 p-3 rounded-2xl max-w-[80%] shadow-sm space-y-2 text-slate-800 dark:text-slate-200">
          <p class="leading-relaxed">வணக்கம்! நான் ஹெல்தி ஹோம்ஸ் ஃபுட்ஸ் நிறுவனத்தின் <b>AI தமிழ் உதவியாளர்</b>.</p>
          <p class="leading-relaxed">உங்கள் வாடிக்கையாளர்கள், தினசரி டெலிவரி, சமையலறை உணவு தேவை மற்றும் நிதி நிலவரம் குறித்து நீங்கள் என்னிடம் கேள்விகள் கேட்கலாம். நான் நேரடியாக தரவுகளை ஆய்வு செய்து உங்களுக்கு உதவ முடியும்!</p>
          
          <!-- Suggestion pills -->
          <div class="pt-2 flex flex-col gap-1.5">
            <button onclick="window.appAI.sendPreset('நிலுவைத் தொகை மற்றும் வருவாய் கணக்கு அறிக்கை')" class="text-left px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border dark:border-slate-650 rounded-xl transition text-[10px] text-slate-600 dark:text-slate-300 font-medium">💰 வருவாய் மற்றும் நிலுவைத் தொகை அறிக்கை</button>
            <button onclick="window.appAI.sendPreset('இன்று மற்றும் நாளை தேவையான உணவு Portion தேவைகளை கணித்து கூறு')" class="text-left px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border dark:border-slate-650 rounded-xl transition text-[10px] text-slate-600 dark:text-slate-300 font-medium">🍳 சமையலறை இன்றைய உணவுத் தேவை</button>
            <button onclick="window.appAI.sendPreset('வாகனங்களின் மைலேஜ் மற்றும் எரிபொருள் செலவுகளை ஆய்வு செய்')" class="text-left px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border dark:border-slate-650 rounded-xl transition text-[10px] text-slate-600 dark:text-slate-300 font-medium">🛵 வாகனங்களின் எரிபொருள் செலவு ஆய்வு</button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Input Footer -->
    <div class="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-850 flex items-center space-x-2">
      <textarea id="ai-user-input" rows="1" placeholder="என்னிடம் கேளுங்கள்..." class="flex-1 p-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-750 rounded-xl focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium max-h-20 resize-none"></textarea>
      <button onclick="window.appAI.sendMessage()" class="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow transition-all"><i class="fa-solid fa-paper-plane text-xs"></i></button>
    </div>
  `;

  document.body.appendChild(drawer);

  // Keypress handler for input
  const input = document.getElementById('ai-user-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Display API Setup panel if missing
  checkGeminiAPIKeyConfig();
}

function checkGeminiAPIKeyConfig() {
  const key = getGeminiAPIKey();
  const setupPanel = document.getElementById('ai-api-setup-panel');
  if (setupPanel) {
    if (!key) {
      setupPanel.classList.remove('hidden');
    } else {
      setupPanel.classList.add('hidden');
    }
  }
}

export function saveKey() {
  const input = document.getElementById('ai-api-key-input');
  if (input && input.value.trim()) {
    saveGeminiAPIKey(input.value);
    checkGeminiAPIKeyConfig();
    alert("Gemini API key saved! Chat enabled.");
  }
}

/**
 * Slide toggles the chat panel drawer
 */
export function toggleAIChatDrawer() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (!drawer) return;
  
  if (isDrawerOpen) {
    drawer.classList.add('translate-x-full');
    isDrawerOpen = false;
  } else {
    drawer.classList.remove('translate-x-full');
    isDrawerOpen = true;
    checkGeminiAPIKeyConfig();
  }
}

/**
 * Commits a user message, runs loading indicator, and returns Gemini's answer
 */
export async function sendMessage() {
  const input = document.getElementById('ai-user-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);

  const apiKey = getGeminiAPIKey();
  if (!apiKey) {
    appendMessage('model', "API சாவி இல்லை! தயவுசெய்து மேலே உள்ள பெட்டியில் உங்களின் Gemini API சாவியை உள்ளிட்டு சேமிக்கவும்.");
    return;
  }

  // Append a loading indicator bubble
  const loaderId = appendLoadingBubble();

  try {
    const reply = await queryGeminiAssistant(apiKey, text, chatHistory);
    removeLoadingBubble(loaderId);
    
    // Save to memory
    chatHistory.push({ role: 'user', text });
    chatHistory.push({ role: 'model', text: reply });
    
    // Append answer bubble
    appendMessage('model', reply);
  } catch (error) {
    removeLoadingBubble(loaderId);
    console.error("Gemini query failure", error);
    
    try {
      const diagData = await runGeminiDiagnostics(apiKey);
      console.warn("Gemini Diagnostics Output:", diagData);
      
      if (diagData.error) {
        appendMessage('model', `மன்னிக்கவும், தரவுகளை பகுப்பாய்வு செய்வதில் பிழை ஏற்பட்டது.<br><br><b>Error Code:</b> [${error.message}]<br><b>Diagnostics API Error:</b> ${diagData.error.message || JSON.stringify(diagData.error)}`);
      } else if (diagData.models && diagData.models.length > 0) {
        const list = diagData.models.map(m => m.name.replace('models/', '')).slice(0, 5).join(', ');
        appendMessage('model', `மன்னிக்கவும், மாடலுடன் இணைப்பதில் சிக்கல் உள்ளது.<br><br><b>Error Code:</b> [${error.message}]<br><b>உங்களுக்கு கிடைக்கக்கூடிய மாடல்களின் பட்டியல் (Available Models):</b> ${list}`);
      } else {
        appendMessage('model', `மன்னிக்கவும், தரவுகளை பகுப்பாய்வு செய்வதில் பிழை ஏற்பட்டது.<br><br><b>Error Code:</b> [${error.message}]<br><b>மாடல் பட்டியல் (Diagnostics Output):</b> ${JSON.stringify(diagData)}`);
      }
    } catch (diagErr) {
      appendMessage('model', `மன்னிக்கவும், தரவுகளை பகுப்பாய்வு செய்வதில் பிழை ஏற்பட்டது. [Error: ${error.message}]`);
    }
  }
}

/**
 * Handles preset suggestion pills
 */
export function sendPreset(text) {
  const input = document.getElementById('ai-user-input');
  if (input) {
    input.value = text;
    sendMessage();
  }
}

function buildHTMLTable(markdownLines) {
  const rowsData = markdownLines
    .map(line => {
      const cells = line.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    })
    .filter(row => {
      const joined = row.join('');
      return !(/^[:\-\s|]+$/.test(joined)) && joined.length > 0;
    });

  if (rowsData.length === 0) return '';

  const headers = rowsData[0];
  const bodyRows = rowsData.slice(1);

  let html = `<div class="overflow-x-auto my-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 shadow-sm max-w-full"><table class="w-full text-[10px] border-collapse text-left">`;
  
  // Header
  html += `<thead><tr class="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">`;
  headers.forEach(h => {
    html += `<th class="p-2 border-r last:border-r-0 dark:border-slate-750">${h}</th>`;
  });
  html += `</tr></thead>`;

  // Body
  html += `<tbody class="divide-y divide-slate-100 dark:divide-slate-800">`;
  bodyRows.forEach(row => {
    html += `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">`;
    row.forEach(c => {
      html += `<td class="p-2 border-r last:border-r-0 dark:border-slate-800">${c}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;

  return html;
}

function formatMessageText(text) {
  const lines = text.split('\n');
  let segments = [];
  let currentTable = [];

  for (let line of lines) {
    if (line.trim().startsWith('|')) {
      currentTable.push(line);
    } else {
      if (currentTable.length > 0) {
        segments.push({ type: 'table', content: buildHTMLTable(currentTable) });
        currentTable = [];
      }
      segments.push({ type: 'text', content: line });
    }
  }
  if (currentTable.length > 0) {
    segments.push({ type: 'table', content: buildHTMLTable(currentTable) });
  }

  const formatted = segments.map(seg => {
    if (seg.type === 'table') {
      return seg.content;
    } else {
      let t = seg.content;

      // 1. Headings (Indigo, Bold, Underlined)
      t = t.replace(/###\s*(.*?)(?:\r?\n|$)/g, '<span class="block font-bold text-xs text-indigo-650 dark:text-indigo-400 underline mt-2 mb-0.5">$1</span>');
      t = t.replace(/##\s*(.*?)(?:\r?\n|$)/g, '<span class="block font-bold text-sm text-indigo-650 dark:text-indigo-400 underline mt-3 mb-1">$1</span>');

      // 2. Bold text (Rose, Bold, Underlined)
      t = t.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-rose-600 dark:text-rose-450 underline">$1</strong>');
      
      // 3. Highlight money/numbers (Emerald Green, Bold)
      t = t.replace(/(₹\s*\d+(?:\.\d+)?|\b\d+\s*(?:Portions|கி.மீ|kg|Litres|நபர்கள்|ரூபாய்|days)\b)/gi, '<span class="font-bold text-emerald-600 dark:text-emerald-400">$1</span>');

      // 4. Italics
      t = t.replace(/\*(.*?)\*/g, '<em class="italic text-slate-500">$1</em>');

      return t;
    }
  });

  return formatted.join('<br>');
}

function appendMessage(role, text) {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = "flex items-start space-x-2 " + (role === 'user' ? 'justify-end' : '');
  
  const formattedText = role === 'model' ? formatMessageText(text) : text.replace(/\n/g, '<br>');

  if (role === 'user') {
    bubble.innerHTML = `
      <div class="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-2xl max-w-[80%] shadow-sm leading-relaxed font-semibold">
        ${formattedText}
      </div>
    `;
  } else {
    bubble.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs"><i class="fa-solid fa-robot"></i></div>
      <div class="bg-white dark:bg-slate-800 border dark:border-slate-750 p-2.5 rounded-2xl max-w-[80%] shadow-sm leading-relaxed text-slate-850 dark:text-slate-200">
        ${formattedText}
      </div>
    `;
  }
  
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}



function appendLoadingBubble() {
  const container = document.getElementById('ai-messages-container');
  if (!container) return null;

  const id = 'loader_' + Date.now();
  const bubble = document.createElement('div');
  bubble.id = id;
  bubble.className = "flex items-start space-x-2";
  bubble.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs"><i class="fa-solid fa-robot"></i></div>
    <div class="bg-white dark:bg-slate-800 border dark:border-slate-750 p-3 rounded-2xl shadow-sm text-slate-400 italic">
      <i class="fa-solid fa-arrows-rotate fa-spin mr-1"></i> பகுப்பாய்வு செய்கிறது... (Analyzing)
    </div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Global hooks exposure
window.appAI = {
  toggleDrawer: toggleAIChatDrawer,
  saveKey,
  sendMessage,
  sendPreset
};
