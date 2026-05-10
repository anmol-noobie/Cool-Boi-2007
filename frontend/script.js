const CONFIG = {
    BACKEND_URL: ""  // Empty = same origin if served from backend, otherwise fallback to local backend
};

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

function resolveBackendUrl() {
    if (CONFIG.BACKEND_URL) return CONFIG.BACKEND_URL.replace(/\/$/, "");
    if (window.location.protocol === "file:") return DEFAULT_BACKEND_URL;

    const origin = window.location.origin.replace(/\/$/, "");
    const host = window.location.hostname;
    const port = window.location.port;
    const localHosts = ["127.0.0.1", "localhost"];

    if (localHosts.includes(host)) {
        if (port === "8000" || port === "") return origin;
        return DEFAULT_BACKEND_URL;
    }
    if (port && parseInt(port, 10) !== 8000) return DEFAULT_BACKEND_URL;
    return origin;
}

const BASE_URL = resolveBackendUrl();

const API_URL = `${BASE_URL}/chat`;
const HISTORY_URL = `${BASE_URL}/history`;
const CLEAR_URL = `${BASE_URL}/clear`;
const LOAD_CONVERSATION_URL = `${BASE_URL}/load-conversation`;
const COMMAND_SUGGESTIONS_URL = `${BASE_URL}/command-suggestions`;
const UPLOAD_URL = `${BASE_URL}/upload`;
const INFO_URL = `${BASE_URL}/info`;

const MODES = {
    default: {
        name: "Mixed Mode",
        icon: "✦",
        systemPrompt: "You are CoolBoi_2007, a Gen-Z tech-savvy assistant. Be casual, balanced, and helpful, with both gaming and coding knowledge."
    },
    gaming: {
        name: "Gaming Mode",
        icon: "⚔️",
        systemPrompt: "You are CoolBoi_2007 in FULL GAMING MODE. Be energetic, gamer-focused, and give clear strategy-style advice."
    },
    coding: {
        name: "Coding Mode",
        icon: "</>",
        systemPrompt: "You are CoolBoi_2007 in CODING MODE. Be technical, clean, and code-first while staying approachable."
    }
};

function detectCodingIntent(msg) {
    const text = msg.toLowerCase();
    const keywords = ["code", "cpp", "c++", "python", "java", "javascript", "bug", "debug", "function", "class", "array", "algorithm", "leetcode", "error"];
    return keywords.some(k => text.includes(k));
}

const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const chatContainer = document.getElementById("chat");
const errorDiv = document.getElementById("error");
const newChatBtn = document.getElementById("newChatBtn");
const conversationsList = document.getElementById("conversationsList");
const commandSuggestionsDiv = document.getElementById("commandSuggestions");
commandSuggestionsDiv.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(".suggestion-item");
    if (!item) return;
    const command = item.dataset.command;
    if (!command) return;
    event.preventDefault();
    insertCommand(command);
});
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const settingsBtn = document.getElementById("settingsBtn");
const settingsSidebar = document.getElementById("settingsSidebar");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportTxtBtn = document.getElementById("exportTxtBtn");

const themeDarkBtn = document.getElementById("themeDarkBtn");
const themeLightBtn = document.getElementById("themeLightBtn");
const modeIndicator = document.getElementById("modeIndicator");
const currentModeDisplay = document.getElementById("currentModeDisplay");
const modelInfoDiv = document.getElementById("modelInfo");

let isLoading = false;
let stopResponse = false;
let conversations = [];
let currentConversationId = null;

const STORAGE_KEY = "coolboi_conversations";
const SETTINGS_KEY = "coolboi_settings";

const defaultSettings = {
    mode: "default",
    theme: "dark"
};

window.addEventListener("load", initializeApp);

messageInput.addEventListener("blur", (e) => {
    if (messageInput.dataset.preventBlur) {
        setTimeout(() => messageInput.focus(), 10);
    }
});

newChatBtn.addEventListener("click", () => createNewConversation());
sendBtn.addEventListener("click", () => {
    if (!isLoading) sendMessage();
});

messageInput.addEventListener("keydown", (e) => {
    console.log("KEYDOWN:", e.key, "isLoading:", isLoading);
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
        e.preventDefault();
        sendMessage();
    }
});

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
});

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Clear all conversation history?")) {
        conversations = [];
        saveConversationsToStorage();
        createNewConversation();
        showError("History cleared");
        closeSettings();
    }
});

exportMdBtn.addEventListener("click", () => exportChat("md"));
exportTxtBtn.addEventListener("click", () => exportChat("txt"));

themeDarkBtn.addEventListener("click", () => setTheme("dark"));
themeLightBtn.addEventListener("click", () => setTheme("light"));

document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        messageInput.dataset.preventBlur = "true";
        setMode(mode);
        setTimeout(() => {
            messageInput.focus();
            messageInput.dataset.preventBlur = "";
        }, 100);
    });
});

messageInput.addEventListener("input", handleInputChange);
messageInput.addEventListener("keydown", () => setTimeout(autoResizeTextarea, 0));
messageInput.addEventListener("blur", () => {
    setTimeout(() => commandSuggestionsDiv.classList.remove("show"), 200);
});

function loadSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    setMode(settings.mode, false);
    setTheme(settings.theme, false);
}

function saveSettings(updates) {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, ...updates }));
}

function setMode(mode, save = true) {
    if (!MODES[mode]) return;
    const currentMode = document.body.dataset.mode;
    document.body.dataset.mode = mode;
    
    if (save && currentMode !== mode) createNewConversation();
    
    modeIndicator.innerHTML = `<span class="mode-icon">${MODES[mode].icon}</span><span class="mode-text">${mode.toUpperCase()} MODE</span>`;
    currentModeDisplay.innerHTML = `<span class="current-mode-icon">${MODES[mode].icon}</span><span class="current-mode-text">${MODES[mode].name}</span>`;
    
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    
    if (save) {
        saveSettings({ mode });
        if (currentMode !== mode) showError(`${MODES[mode].name} activated`);
    }
}

function setTheme(theme, save = true) {
    document.body.dataset.theme = theme;
    themeDarkBtn.classList.toggle("active", theme === "dark");
    themeLightBtn.classList.toggle("active", theme === "light");
    if (save) {
        saveSettings({ theme });
        showError(`${theme === "dark" ? "Dark" : "Light"} theme applied`);
    }
}

function openSettings() {
    settingsSidebar.classList.add("show");
    loadSettings();
    loadSystemInfo();
}

function closeSettings() {
    settingsSidebar.classList.remove("show");
}

async function handleInputChange() {
    const value = messageInput.value;
    autoResizeTextarea();
    if (value.startsWith("/")) {
        await showCommandSuggestions(value);
    } else {
        commandSuggestionsDiv.classList.remove("show");
    }
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

async function showCommandSuggestions(partial) {
    try {
        const response = await fetch(COMMAND_SUGGESTIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partial })
        });
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await response.json() : null;
        const suggestions = data?.suggestions || [];
        if (suggestions.length === 0) {
            commandSuggestionsDiv.classList.remove("show");
            return;
        }
        commandSuggestionsDiv.innerHTML = suggestions.map(s => 
            `<div class="suggestion-item" data-command="/${s.name}"><span class="suggestion-name">/${s.name}</span><span class="suggestion-desc">${s.description}</span></div>`
        ).join('');
        commandSuggestionsDiv.classList.add("show");
    } catch (error) {
        console.log("Error fetching suggestions:", error);
    }
}

function insertCommand(command) {
    messageInput.value = command + " ";
    messageInput.focus();
    commandSuggestionsDiv.classList.remove("show");
}

async function initializeApp() {
    loadSettings();
    loadConversationsFromStorage();
    if (conversations.length === 0) {
        createNewConversation();
    } else {
        currentConversationId = conversations[0].id;
        loadConversation(currentConversationId);
    }
    renderConversationsList();
    await loadSystemInfo();
}

async function loadSystemInfo() {
    try {
        const resp = await fetch(INFO_URL);
        if (resp.ok) {
            const contentType = resp.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const info = await resp.json();
                modelInfoDiv.textContent = info.model || "llama-3.3-70b-versatile";
            } else {
                modelInfoDiv.textContent = "Backend not reachable";
            }
        } else {
            modelInfoDiv.textContent = "Unable to load";
        }
    } catch (e) {
        modelInfoDiv.textContent = "Connection error";
    }
}

function createNewConversation() {
    fetch(CLEAR_URL, { method: "POST" }).catch(() => {});
    const currentMode = document.body.dataset.mode || "default";
    const newConversation = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        mode: currentMode,
        createdAt: new Date().toISOString()
    };
    currentConversationId = newConversation.id;
    clearChatDisplay();
    renderConversationsList();
    messageInput.dataset.preventBlur = "true";
    setTimeout(() => {
        messageInput.focus();
        messageInput.dataset.preventBlur = "";
    }, 100);
}

function getCurrentMode() {
    return document.body.dataset.mode || "default";
}

function loadConversation(conversationId) {
    let conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    currentConversationId = conversationId;
    clearChatDisplay();
    if (conversation.mode) setMode(conversation.mode, false);
    fetch(LOAD_CONVERSATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation.messages, mode: conversation.mode })
    }).catch(() => {});
    for (const message of conversation.messages) {
        const isUser = message.role === "user";
        const messageWrapper = createMessageElement(message.content, isUser);
        chatContainer.appendChild(messageWrapper);
    }
    scrollToBottomImmediate();
    renderConversationsList();
    messageInput.focus();
}

function deleteConversation(conversationId) {
    conversations = conversations.filter(c => c.id !== conversationId);
    saveConversationsToStorage();
    if (currentConversationId === conversationId) {
        if (conversations.length > 0) {
            loadConversation(conversations[0].id);
        } else {
            createNewConversation();
        }
    } else {
        renderConversationsList();
    }
}

function updateConversationTitle(conversationId, title) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
        conversation.title = title.substring(0, 40);
        saveConversationsToStorage();
        renderConversationsList();
    }
}

function addMessageToCurrentConversation(role, content) {
    let conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation) {
        const currentMode = document.body.dataset.mode || "default";
        conversation = {
            id: currentConversationId,
            title: "New Chat",
            messages: [],
            mode: currentMode,
            createdAt: new Date().toISOString()
        };
        conversations.unshift(conversation);
    }
    conversation.messages.push({ role, content });
    if (conversation.title === "New Chat" && role === "user") {
        updateConversationTitle(currentConversationId, content);
    }
    saveConversationsToStorage();
    renderConversationsList();
}

function loadConversationsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        conversations = [];
        return;
    }
    try {
        conversations = JSON.parse(stored);
        if (!Array.isArray(conversations)) conversations = [];
    } catch (error) {
        conversations = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveConversationsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function exportChat(format) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation || conversation.messages.length === 0) {
        showError("No messages to export");
        return;
    }
    let content = "";
    const timestamp = new Date().toISOString().split('T')[0];
    const mode = getCurrentMode();
    const filename = `coolboi_${mode}_${timestamp}.${format}`;
    
    if (format === "md") {
        content = `# CoolBoi_2007 Chat Export\n\n**Mode:** ${MODES[mode]?.name}\n**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;
        for (const msg of conversation.messages) {
            const role = msg.role === "user" ? "**You**" : "**CoolBoi**";
            content += `## ${role}\n\n${msg.content}\n\n---\n\n`;
        }
    } else {
        content = `CoolBoi_2007 Chat Export\n${"=".repeat(50)}\nMode: ${MODES[mode]?.name}\nDate: ${new Date().toLocaleString()}\n\n`;
        for (const msg of conversation.messages) {
            const role = msg.role === "user" ? "You" : "CoolBoi";
            content += `[${role}]\n${msg.content}\n\n${"-".repeat(30)}\n\n`;
        }
    }
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showError(`Exported as ${filename}`);
    closeSettings();
}

function renderConversationsList() {
    conversationsList.innerHTML = "";
    for (const conversation of conversations) {
        const conversationMode = conversation.mode || "default";
        const item = document.createElement("div");
        item.className = `conversation-item mode-${conversationMode} ${conversation.id === currentConversationId ? "active" : ""}`;
        
        const modeIcon = document.createElement("span");
        modeIcon.className = "conversation-mode-icon";
        modeIcon.textContent = MODES[conversationMode]?.icon || "✦";
        
        const titleDiv = document.createElement("span");
        titleDiv.className = "conversation-title";
        titleDiv.textContent = conversation.title;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-conversation";
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteConversation(conversation.id);
        });
        
        item.appendChild(modeIcon);
        item.appendChild(titleDiv);
        item.appendChild(deleteBtn);
        item.addEventListener("click", () => loadConversation(conversation.id));
        conversationsList.appendChild(item);
    }
}

function clearChatDisplay() {
    chatContainer.innerHTML = "";
}

function tryParseStructuredResponse(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes('"type"')) return null;

    let cleaned = trimmed;
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
        cleaned = cleaned.replace(/\n?```\s*$/, "");
        cleaned = cleaned.trim();
    }

    try {
        const data = JSON.parse(cleaned);
        if (typeof data === "object" && data !== null && "type" in data) {
            return data;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function renderStructuredResponse(data) {
    const codeId = "code-" + Math.random().toString(36).substr(2, 9);
    const langLabel = escapeHtml(data.language || "code");
    const escapedCode = escapeHtml(data.code || "");
    const title = data.title ? `<div class="code-title">${escapeHtml(data.title)}</div>` : "";

    let tipsHtml = "";
    if (Array.isArray(data.tips) && data.tips.length > 0) {
        tipsHtml = '<div class="code-tips"><h4>Tips</h4><ul>' +
            data.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join("") +
            "</ul></div>";
    }

    const explanationHtml = parseMarkdownText(data.explanation || "");

    const codeBlockHtml =
        title +
        explanationHtml +
        `<div class="code-block">` +
            `<div class="code-header">` +
                `<span class="code-lang">${langLabel}</span>` +
                `<button class="copy-btn" onclick="copyToClipboard('${codeId}')">Copy</button>` +
            `</div>` +
            `<pre id="${codeId}" class="code-content">${escapedCode}</pre>` +
        `</div>` +
        tipsHtml;

    return codeBlockHtml;
}

function parseMarkdownText(text) {
    let normalized = text.replace(/\r\n/g, "\n");

    normalized = normalized.replace(/(\d+\.\s[^.]+?)(?=\s*\d+\.)/g, '$1\n');

    normalized = normalized.replace(/\.\s+(?=[-*])/g, '\n');

    const lines = normalized.split('\n');
    let html = '';
    let inOrderedList = false;
    let inUnorderedList = false;
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines = [];

    function flushCodeBlock() {
        if (codeBlockLines.length === 0) return;
        const lang = escapeHtml(codeBlockLang || '');
        const code = codeBlockLines.join('\n');
        html += '<div class="code-block"><div class="code-header"><span class="code-lang">' + (lang || 'code') + '</span></div><pre class="code-content">' + escapeHtml(code) + '</pre></div>';
        codeBlockLines = [];
        codeBlockLang = '';
    }

    function formatInline(t) {
        return escapeHtml(t)
            .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
            .replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>');
    }

    for (const line of lines) {
        const fenceMatch = line.match(/^```(\w*)/);
        if (fenceMatch) {
            if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
            if (inUnorderedList) { html += '</ul>'; inUnorderedList = false; }
            if (inCodeBlock) {
                flushCodeBlock();
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                codeBlockLang = fenceMatch[1];
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

        const orderedMatch = line.match(/^(\d+)\.\s+(.+)/);
        const unorderedMatch = line.match(/^[-*]\s+(.+)/);

        if (orderedMatch) {
            if (inUnorderedList) { html += '</ul>'; inUnorderedList = false; }
            if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
            html += '<li>' + formatInline(orderedMatch[2]) + '</li>';
        } else if (unorderedMatch) {
            if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
            if (!inUnorderedList) { html += '<ul>'; inUnorderedList = true; }
            html += '<li>' + formatInline(unorderedMatch[1]) + '</li>';
        } else {
            if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
            if (inUnorderedList) { html += '</ul>'; inUnorderedList = false; }
            html += line ? '<p>' + formatInline(line) + '</p>' : '';
        }
    }
    if (inCodeBlock) {
        flushCodeBlock();
    }
    if (inOrderedList) html += '</ol>';
    if (inUnorderedList) html += '</ul>';

    return html;
}

function parseMarkdown(text) {
    const structured = tryParseStructuredResponse(text);
    if (structured && structured.type === "code_response") {
        return renderStructuredResponse(structured);
    }

    return parseMarkdownText(text);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyCode(button) {
    const codeId = button.getAttribute('data-code-id');
    const codeElement = document.getElementById(codeId);
    
    if (!codeElement) return;
    
    const code = codeElement.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        // Fallback: show error to user
        button.textContent = 'Copy failed';
        button.classList.add('error');
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('error');
        }, 2000);
    });
}

function copyToClipboard(codeId) {
    const codeElement = document.getElementById(codeId);
    const button = event?.target || document.querySelector(`[data-code-id="${codeId}"]`);
    
    if (!codeElement) {
        console.warn(`Code element with id ${codeId} not found`);
        return;
    }
    
    const code = codeElement.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        if (button) {
            const originalText = button.textContent || 'Copy';
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy code:', err);
        if (button) {
            button.textContent = 'Copy failed';
            button.classList.add('error');
            setTimeout(() => {
                button.textContent = 'Copy';
                button.classList.remove('error');
            }, 2000);
        }
    });
}

function createMessageElement(text, isUser) {
    if (!text || (typeof text === 'string' && !text.trim())) {
        return null;
    }
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message-wrapper ${isUser ? "user-wrapper" : "bot-wrapper"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = isUser ? "👤" : "🤖";

    const messageBubble = document.createElement("div");
    messageBubble.className = `message ${isUser ? "user" : "bot"}`;

    if (isUser) {
        messageBubble.textContent = text;
    } else {
        messageBubble.innerHTML = parseMarkdown(text);
    }

    if (isUser) {
        messageWrapper.appendChild(messageBubble);
        messageWrapper.appendChild(avatar);
    } else {
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageBubble);
    }

    return messageWrapper;
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add("show");
    setTimeout(() => errorDiv.classList.remove("show"), 3000);
}

async function handleFileUpload(file) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        showError("File too large. Max 10MB.");
        fileInput.value = '';
        return;
    }
    const supportedExtensions = ['txt', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php', 'html', 'css', 'sql', 'sh', 'bash', 'conf', 'config', 'ini', 'env', 'md'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(fileExtension)) {
        showError(`Unsupported file type: .${fileExtension}`);
        fileInput.value = '';
        return;
    }
    const fileInfo = `Analyzing ${file.name}...`;
    const userMsg = createMessageElement(fileInfo, true);
    chatContainer.appendChild(userMsg);
    scrollToBottomImmediate();
    addMessageToCurrentConversation('user', fileInfo);
    const loadingMsg = createMessageElement('Processing file...', false);
    loadingMsg.style.opacity = '0.7';
    chatContainer.appendChild(loadingMsg);
    scrollToBottomImmediate();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', getCurrentMode());
    try {
        const response = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Unexpected backend response: ${text.slice(0, 200)}`);
        }
        const data = await response.json();
        loadingMsg.remove();
        if (data.error) {
            showError(`Analysis failed: ${data.error}`);
        } else {
            const botMsg = createMessageElement(data.response || 'No response', false);
            if (botMsg) {
                chatContainer.appendChild(botMsg);
                await typeMessage(botMsg, data.response || 'No response', 25);
                scrollToBottomImmediate();
                addMessageToCurrentConversation('assistant', data.response);
            }
        }
    } catch (err) {
        loadingMsg.remove();
        showError(`Upload failed: ${err.message}`);
    } finally {
        fileInput.value = '';
    }
}

function scrollToBottom() {
    const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
    if (isNearBottom) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

function scrollToBottomImmediate() {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

async function typeMessage(messageWrapper, text, speed = 30) {
    const messageBubble = messageWrapper.querySelector(".message");
    messageBubble.textContent = '';
    currentTypingAnimation = true;
    let currentText = '';
    let i = 0;

    const structured = tryParseStructuredResponse(text);
    if (structured && structured.type === "code_response") {
        messageBubble.innerHTML = '<p class="generating-indicator">Processing response...</p>';
        await new Promise(resolve => setTimeout(resolve, speed * 10));
        messageBubble.innerHTML = renderStructuredResponse(structured);
        scrollToBottomImmediate();
        currentTypingAnimation = null;
        return;
    }

    const reparseInterval = 15;

    while (i < text.length && !stopResponse) {
        currentText += text[i];
        i++;
        if (i % reparseInterval === 0 || i === text.length) {
            messageBubble.innerHTML = parseMarkdown(currentText);
        } else {
            messageBubble.textContent = currentText;
        }
        scrollToBottomImmediate();
        await new Promise(resolve => setTimeout(resolve, speed));
    }

    if (!stopResponse) {
        messageBubble.innerHTML = parseMarkdown(text);
    } else {
        messageBubble.innerHTML = parseMarkdown(text.substring(0, i));
    }
    currentTypingAnimation = null;
}

window.copyCode = function(elementId) {
    const codeElement = document.getElementById(elementId);
    if (codeElement) {
        navigator.clipboard.writeText(codeElement.textContent).then(() => {
            showError("Copied!");
        });
    }
};

async function sendMessage() {
    if (isLoading) {
        stopResponse = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>Stop</span><span class="icon">■</span>';
        const loadingMsg = chatContainer.querySelector(".loading");
        if (loadingMsg) loadingMsg.parentElement.remove();
        return;
    }

    const message = messageInput.value.trim();
    if (!message) {
        messageInput.value = "";
        autoResizeTextarea();
        return;
    }

    let selectedMode = getCurrentMode();
    if (!message.startsWith("/") && detectCodingIntent(message)) {
        selectedMode = "coding";
    }

    try {
        const userMsg = createMessageElement(message, true);
        chatContainer.appendChild(userMsg);
        messageInput.value = "";
        autoResizeTextarea();
        messageInput.focus();
        scrollToBottomImmediate();
        addMessageToCurrentConversation("user", message);

        isLoading = true;
        stopResponse = false;
        sendBtn.innerHTML = '<span>Stop</span><span class="icon">■</span>';

        const loadingWrapper = document.createElement("div");
        loadingWrapper.className = "message-wrapper bot-wrapper";
        const loadingAvatar = document.createElement("div");
        loadingAvatar.className = "avatar";
        loadingAvatar.textContent = "🤖";
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "message bot loading";
        loadingMsg.textContent = "CoolBoi is typing";
        loadingWrapper.appendChild(loadingAvatar);
        loadingWrapper.appendChild(loadingMsg);
        chatContainer.appendChild(loadingWrapper);
        scrollToBottom();
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, mode: selectedMode })
        });

        if (stopResponse) {
            loadingWrapper.remove();
            isLoading = false;
            return;
        }

        loadingWrapper.remove();

    if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const botBubble = document.createElement("div");
        botBubble.className = "message bot";

        const botWrapper = document.createElement("div");
        botWrapper.className = "message-wrapper bot-wrapper";

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "🤖";

        botWrapper.appendChild(avatar);
        botWrapper.appendChild(botBubble);
        chatContainer.appendChild(botWrapper);
        scrollToBottomImmediate();

        let fullText = "";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done || stopResponse) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop();

            for (const event of events) {
                if (!event.startsWith('data: ')) continue;
                const data = event.slice(6);
                if (data === '[DONE]') {
                    botBubble.innerHTML = parseMarkdown(fullText);
                    scrollToBottomImmediate();
                    if (fullText.trim()) {
                        addMessageToCurrentConversation("assistant", fullText);
                    }
                    break;
                }
                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.content ?? parsed.token ?? parsed.text ?? data;
                    fullText += token;
                    console.log("TOKEN CHARS:", JSON.stringify(token));
                } catch {
                    fullText += data;
                    console.log("TOKEN CHARS:", JSON.stringify(data));
                }
                botBubble.textContent = fullText;
                scrollToBottomImmediate();
            }
        }

        if (!fullText.trim()) {
            botWrapper.remove();
        }
        } else {
            const contentType = response.headers.get("content-type") || "";
            let data;
            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Wrong response from server: ${text.slice(0, 200)}`);
            }
            const responseText = data.response || "No response";
            if (message.startsWith("/reset")) {
                clearChatDisplay();
                const currentConversation = conversations.find(c => c.id === currentConversationId);
                if (currentConversation) {
                    currentConversation.messages = [];
                    saveConversationsToStorage();
                }
            }
            const botMsg = createMessageElement(responseText, false);
            if (botMsg) {
                chatContainer.appendChild(botMsg);
                scrollToBottomImmediate();
                if (!stopResponse) {
                    addMessageToCurrentConversation("assistant", responseText);
                }
            }
        }

        errorDiv.classList.remove("show");
    } catch (error) {
        console.error("Error:", error);
        if (!stopResponse) {
            showError(`Failed: ${error.message}`);
        }
        const loadingMsg = chatContainer.querySelector(".loading");
        if (loadingMsg) loadingMsg.parentElement.remove();
    } finally {
        isLoading = false;
        stopResponse = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Send</span><span class="icon">→</span>';
        messageInput.focus();
    }
}

let currentTypingAnimation = null;
