const editor = document.getElementById("editor");
const suggestionBar = document.getElementById("suggestion-bar");
const quickStats = document.getElementById("quick-stats");
const notice = document.getElementById("notice");
const insightsPlaceholder = document.getElementById("insights-placeholder");
const resultsPanel = document.getElementById("results-panel");
const correctedOutput = document.getElementById("corrected-output");
const changesList = document.getElementById("changes-list");
const issueBadge = document.getElementById("issue-badge");

let suggestions = [];
let selectedIndex = -1;
let debounceTimer = null;
let lastRequestedWord = "";
let requestController = null;

const localWords = [
  "about","after","again","all","also","always","amazing","and","are","around","because","beautiful","before","best","better","book","bring","business","can","chat","check","class","come","correct","could","day","different","do","does","easy","enjoy","every","example","excellent","feel","find","for","friend","from","game","garden","get","going","good","great","happy","have","hello","help","here","home","hope","how","important","improve","into","is","it","just","know","language","learn","like","little","love","make","message","more","morning","much","name","need","new","nice","not","now","of","on","one","only","our","out","people","please","play","project","quick","really","right","school","sentence","should","simple","smart","some","spell","start","suggestion","sure","text","thank","that","the","their","there","this","time","to","today","tool","type","understand","use","very","want","was","we","well","what","when","where","with","word","work","would","write","you","your"
];

function getText() {
  return editor.innerText.replace(/\u00a0/g, " ");
}

function setText(text) {
  editor.innerText = text;
  updateStats();
  updateSuggestions(true);
}

function updateStats() {
  const text = getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  quickStats.textContent = `${words} word${words === 1 ? "" : "s"} · ${chars} char${chars === 1 ? "" : "s"}`;
  
  document.getElementById("stat-words").textContent = words;
  document.getElementById("stat-sentences").textContent = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  document.getElementById("stat-time").textContent = `${Math.max(1, Math.round(words / 200))}m`;
}

function currentWordInfo() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !editor.contains(selection.anchorNode)) return null;
  const node = selection.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || "";
  const pos = selection.anchorOffset;
  const before = text.slice(0, pos);
  const match = before.match(/[A-Za-z'-]+$/);
  if (!match) return null;
  const word = match[0];
  const start = pos - word.length;
  return { node, start, end: pos, word };
}

function showSuggestions(items) {
  suggestions = items.slice(0, 5);
  selectedIndex = -1;
  suggestionBar.innerHTML = "";
  if (!suggestions.length) {
    const hint = document.createElement("span");
    hint.className = "suggestion-hint";
    hint.textContent = "💡 Keep typing to see live word suggestions";
    suggestionBar.appendChild(hint);
    return;
  }
  suggestions.forEach((word) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-chip";
    button.textContent = word;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      applySuggestion(word);
    });
    suggestionBar.appendChild(button);
  });
}

function localSuggestions(prefix) {
  const p = prefix.toLowerCase();
  return localWords.filter(word => word.startsWith(p) && word.toLowerCase() !== p)
    .sort((a,b) => a.length - b.length)
    .slice(0, 5);
}

async function updateSuggestions(force = false) {
  const info = currentWordInfo();
  if (!info || info.word.length < 2) {
    showSuggestions([]);
    return;
  }
  const word = info.word;
  if (!force && word === lastRequestedWord) return;
  lastRequestedWord = word;
  const fallback = localSuggestions(word);
  showSuggestions(fallback);

  if (requestController) requestController.abort();
  requestController = new AbortController();
  try {
    const response = await fetch(`/api/suggest?word=${encodeURIComponent(word)}`, {
      signal: requestController.signal
    });
    if (!response.ok) return;
    const apiWords = await response.json();
    const combined = [...new Set([...(apiWords || []), ...fallback])]
      .filter(item => item.toLowerCase() !== word.toLowerCase())
      .slice(0, 5);
    if (currentWordInfo()?.word === word) showSuggestions(combined);
  } catch (error) {
    if (error.name !== "AbortError") showSuggestions(fallback);
  }
}

function applySuggestion(word) {
  const info = currentWordInfo();
  if (!info) return;
  const before = info.node.textContent.slice(0, info.start);
  const after = info.node.textContent.slice(info.end);
  const replacement = info.word[0] === info.word[0].toUpperCase()
    ? word.charAt(0).toUpperCase() + word.slice(1)
    : word;
  info.node.textContent = before + replacement + after;
  const range = document.createRange();
  range.setStart(info.node, before.length + replacement.length);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
  lastRequestedWord = "";
  updateStats();
  updateSuggestions(true);
  notice.textContent = `Replaced with "${replacement}".`;
  notice.className = "notice-box";
}

editor.addEventListener("input", () => {
  updateStats();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    lastRequestedWord = "";
    updateSuggestions();
  }, 120);
});

editor.addEventListener("click", () => {
  lastRequestedWord = "";
  updateSuggestions(true);
});

editor.addEventListener("keyup", (event) => {
  if (["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(event.key)) return;
  lastRequestedWord = "";
  updateSuggestions(true);
});

editor.addEventListener("keydown", (event) => {
  const buttons = [...suggestionBar.querySelectorAll(".suggestion-chip")];
  if (!buttons.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex = (selectedIndex + 1) % buttons.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
  } else if ((event.key === "Enter" || event.key === "Tab") && selectedIndex >= 0) {
    event.preventDefault();
    applySuggestion(suggestions[selectedIndex]);
    return;
  } else {
    return;
  }
  buttons.forEach((button, i) => button.classList.toggle("active", i === selectedIndex));
});

document.getElementById("clear-btn").addEventListener("click", () => {
  editor.innerText = "";
  lastRequestedWord = "";
  updateStats();
  showSuggestions([]);
  notice.textContent = "";
  insightsPlaceholder.classList.remove("hidden");
  resultsPanel.classList.add("hidden");
  issueBadge.classList.add("hidden");
  editor.focus();
});

document.getElementById("correct-btn").addEventListener("click", async () => {
  const text = getText().trim();
  if (!text) {
    notice.textContent = "Please type or paste some text first.";
    notice.className = "notice-box error";
    return;
  }
  const button = document.getElementById("correct-btn");
  button.disabled = true;
  button.innerHTML = '<span class="btn-icon">⏳</span> Scanning...';
  notice.textContent = "";

  try {
    const response = await fetch("/api/correct", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text, language: document.getElementById("language").value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Correction service unavailable.");

    correctedOutput.value = data.corrected;
    renderChanges(data.changes || []);
    
    insightsPlaceholder.classList.add("hidden");
    resultsPanel.classList.remove("hidden");
    
    const countIssues = (data.changes || []).length;
    if (countIssues > 0) {
      issueBadge.textContent = `${countIssues} issue${countIssues === 1 ? "" : "s"}`;
      issueBadge.classList.remove("hidden");
    } else {
      issueBadge.classList.add("hidden");
    }

    notice.textContent = "Grammar & style check completed successfully.";
    notice.className = "notice-box";
  } catch (error) {
    notice.textContent = error.message;
    notice.className = "notice-box error";
  } finally {
    button.disabled = false;
    button.innerHTML = '<span class="btn-icon">⚡</span> Check Grammar & Style';
  }
});

function renderChanges(changes) {
  changesList.innerHTML = "";
  if (!changes.length) {
    changesList.innerHTML = '<div class="issue-card" style="text-align:center; color:#10b981; font-weight:600;">✨ No grammar or style issues found! Your text looks pristine.</div>';
    return;
  }

  changes.forEach(change => {
    const card = document.createElement("div");
    card.className = "issue-card";
    
    const cat = (change.category || "Grammar").toLowerCase();
    
    card.innerHTML = `
      <div class="issue-header">
        <span class="issue-type ${cat}">${change.category || "Grammar"}</span>
      </div>
      <div class="issue-diff">
        <span class="diff-orig">${escapeHtml(change.original || "—")}</span>
        <span class="diff-arrow">→</span>
        <span class="diff-rep">${escapeHtml(change.replacement || "—")}</span>
      </div>
      <div class="issue-msg">${escapeHtml(change.message)}</div>
    `;
    changesList.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("use-result").addEventListener("click", () => {
  setText(correctedOutput.value);
  editor.focus();
  window.scrollTo({top: 0, behavior: "smooth"});
});

document.getElementById("download-result").addEventListener("click", () => {
  const blob = new Blob([correctedOutput.value], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lexipulse_polished_text.txt";
  anchor.click();
  URL.revokeObjectURL(url);
});

updateStats();