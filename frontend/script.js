const API_URL = "http://127.0.0.1:8000/chat";
const HISTORY_URL = "http://127.0.0.1:8000/history";
const CLEAR_URL = "http://127.0.0.1:8000/clear";
const LOAD_CONVERSATION_URL = "http://127.0.0.1:8000/load-conversation";
const COMMAND_SUGGESTIONS_URL = "http://127.0.0.1:8000/command-suggestions";
const UPLOAD_URL = "http://127.0.0.1:8000/upload";
const INFO_URL = "http://127.0.0.1:8000/info";

// Mode configurations
const MODES = {
    default: {
        name: "Mixed Mode",
        icon: "✦",
        systemPrompt: "You are CoolBoi_2007, a Gen-Z AI assistant for gaming and tech support. Talk casually like a knowledgeable friend — use light Gen-Z slang, be direct, helpful, and never boring. Balance gaming and coding topics equally."
    },
    gaming: {
        name: "Gaming Mode",
        icon: "⚔️",
        systemPrompt: "You are CoolBoi_2007 in GAMING MODE. You're an elite gamer helping other gamers. Use gaming slang and analogies heavily. Be hype, energetic, and treat every tech problem like a boss fight to defeat."
    },
    coding: {
        name: "Coding Mode",
        icon: "</>",
        systemPrompt: "You are CoolBoi_2007 in CODING MODE. You're a senior dev who's also chill and approachable. Focus on code quality, debugging, and dev tools. Use programming references naturally. Be precise but never robotic."
    }
};

// DOM Elements
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const chatContainer = document.getElementById("chat");
const errorDiv = document.getElementById("error");
const newChatBtn = document.getElementById("newChatBtn");
const conversationsList = document.getElementById("conversationsList");
const commandSuggestionsDiv = document.getElementById("commandSuggestions");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const settingsBtn = document.getElementById("settingsBtn");
const settingsSidebar = document.getElementById("settingsSidebar");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportTxtBtn = document.getElementById("exportTxtBtn");
const temperatureSlider = document.getElementById("temperatureSlider");
const temperatureValue = document.getElementById("temperatureValue");
const themeDarkBtn = document.getElementById("themeDarkBtn");
const themeLightBtn = document.getElementById("themeLightBtn");
const modeIndicator = document.getElementById("modeIndicator");
const currentModeDisplay = document.getElementById("currentModeDisplay");
const modelInfoDiv = document.getElementById("modelInfo");
const tempInfoDiv = document.getElementById("tempInfo");

// State management
let isLoading = false;
let stopResponse = false;
let currentTypingAnimation = null;
let conversations = [];
let currentConversationId = null;

// LocalStorage keys
const STORAGE_KEY = "coolboi_conversations";
const SETTINGS_KEY = "coolboi_settings";

// Default settings
const defaultSettings = {
    mode: "default",
    theme: "dark",
    temperature: 0.7
};

// Initialize on page load
window.addEventListener("load", initializeApp);

// Event listeners
newChatBtn.addEventListener("click", createNewConversation);
sendBtn.addEventListener("click", () => {
    if (!isLoading) {
        sendMessage();
    }
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
        return false;
    }
});

// File upload handlers
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
});

// Settings sidebar handlers
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

clearHistoryBtn.addEventListener("click", () => {
    if (confirm("⚠️ Clear all conversation history? This cannot be undone.")) {
        conversations = [];
        saveConversationsToStorage();
        createNewConversation();
        showError("✓ History cleared");
        closeSettings();
    }
});

exportMdBtn.addEventListener("click", () => exportChat("md"));
exportTxtBtn.addEventListener("click", () => exportChat("txt"));

temperatureSlider.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    temperatureValue.textContent = value.toFixed(1);
    tempInfoDiv.textContent = value.toFixed(1);
    saveSettings({ temperature: value });
});

themeDarkBtn.addEventListener("click", () => setTheme("dark"));
themeLightBtn.addEventListener("click", () => setTheme("light"));

// Mode switcher
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        setMode(mode);
    });
});

messageInput.addEventListener("input", handleInputChange);
messageInput.addEventListener("keydown", handleKeyDown);
messageInput.addEventListener("blur", () => {
    setTimeout(() => {
        commandSuggestionsDiv.classList.remove("show");
    }, 200);
});

// ============ Settings Functions ============
function loadSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    
    // Apply mode
    setMode(settings.mode, false);
    
    // Apply theme
    setTheme(settings.theme, false);
    
    // Apply temperature
    temperatureSlider.value = settings.temperature;
    temperatureValue.textContent = settings.temperature.toFixed(1);
    tempInfoDiv.textContent = settings.temperature.toFixed(1);
}

function saveSettings(updates) {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    const newSettings = { ...settings, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
}

function setMode(mode, save = true) {
    if (!MODES[mode]) return;
    
    // Update body data attribute
    document.body.dataset.mode = mode;
    
    // Update mode indicator in header
    modeIndicator.innerHTML = `
        <span class="mode-icon">${MODES[mode].icon}</span>
        <span class="mode-text">${mode.toUpperCase()} MODE</span>
    `;
    
    // Update current mode display in settings
    currentModeDisplay.innerHTML = `
        <span class="current-mode-icon">${MODES[mode].icon}</span>
        <span class="current-mode-text">${MODES[mode].name}</span>
    `;
    
    // Update mode buttons
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    
    // Save to localStorage
    if (save) {
        saveSettings({ mode });
        showError(`${MODES[mode].name} activated`);
    }
}

function setTheme(theme, save = true) {
    document.body.dataset.theme = theme;
    
    // Update theme buttons
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
}

function closeSettings() {
    settingsSidebar.classList.remove("show");
}

// ============ Command Suggestions ============
async function handleInputChange() {
    const value = messageInput.value;
    autoResizeTextarea();
    
    if (value.startsWith("/")) {
        await showCommandSuggestions(value);
    } else {
        commandSuggestionsDiv.classList.remove("show");
    }
}

function handleKeyDown(e) {
    setTimeout(autoResizeTextarea, 0);
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
        
        const data = await response.json();
        const suggestions = data.suggestions || [];
        
        if (suggestions.length === 0) {
            commandSuggestionsDiv.classList.remove("show");
            return;
        }
        
        let suggestionsHTML = "";
        for (const suggestion of suggestions) {
            suggestionsHTML += `
                <div class="suggestion-item" onclick="insertCommand('/${suggestion.name}')">
                    <span class="suggestion-name">/${suggestion.name}</span>
                    <span class="suggestion-desc">${suggestion.description}</span>
                </div>
            `;
        }
        
        commandSuggestionsDiv.innerHTML = suggestionsHTML;
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

// ============ Initialization ============
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

// ============ System Info ============
async function loadSystemInfo() {
    try {
        const resp = await fetch(INFO_URL);
        if (resp.ok) {
            const info = await resp.json();
            modelInfoDiv.textContent = info.model || "qwen2.5-coder:7b";
        } else {
            modelInfoDiv.textContent = "Unable to load";
        }
    } catch (e) {
        modelInfoDiv.textContent = "Connection error";
    }
}

// ============ Conversation Management ============
function createNewConversation() {
    fetch(CLEAR_URL, { method: "POST" }).catch(err => console.log("Clear error:", err));
    
    const newConversation = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        mode: getCurrentMode(),
        createdAt: new Date().toISOString()
    };
    
    conversations.unshift(newConversation);
    currentConversationId = newConversation.id;
    
    saveConversationsToStorage();
    renderConversationsList();
    clearChatDisplay();
    messageInput.focus();
}

function getCurrentMode() {
    return document.body.dataset.mode || "default";
}

function loadConversation(conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) return;
    
    currentConversationId = conversationId;
    clearChatDisplay();
    
    // Apply conversation mode if stored
    if (conversation.mode) {
        setMode(conversation.mode, false);
    }
    
    // Sync with backend
    fetch(LOAD_CONVERSATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation.messages })
    }).catch(err => console.log("Backend sync error:", err));
    
    // Display messages
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
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages.push({ role, content });
        
        if (conversation.title === "New Chat" && role === "user") {
            updateConversationTitle(currentConversationId, content);
        }
        
        saveConversationsToStorage();
    }
}

// ============ Storage Management ============
function loadConversationsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        conversations = [];
        return;
    }

    try {
        conversations = JSON.parse(stored);
        if (!Array.isArray(conversations)) {
            conversations = [];
        }
    } catch (error) {
        conversations = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveConversationsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

// ============ Export Chat ============
function exportChat(format) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation || conversation.messages.length === 0) {
        showError("No messages to export");
        return;
    }
    
    let content = "";
    let filename = "";
    const timestamp = new Date().toISOString().split('T')[0];
    const mode = getCurrentMode();
    
    if (format === "md") {
        filename = `coolboi_${mode}_${timestamp}.md`;
        content = `# CoolBoi_2007 Chat Export\n\n`;
        content += `**Mode:** ${MODES[mode]?.name || "Mixed Mode"}\n`;
        content += `**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;
        
        for (const msg of conversation.messages) {
            const role = msg.role === "user" ? "**You**" : "**CoolBoi**";
            content += `## ${role}\n\n${msg.content}\n\n---\n\n`;
        }
    } else {
        filename = `coolboi_${mode}_${timestamp}.txt`;
        content = `CoolBoi_2007 Chat Export\n`;
        content += `Mode: ${MODES[mode]?.name || "Mixed Mode"}\n`;
        content += `Date: ${new Date().toLocaleString()}\n`;
        content += `${"=".repeat(50)}\n\n`;
        
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
    
    showError(`✓ Exported as ${filename}`);
    closeSettings();
}

// ============ UI Rendering ============
function renderConversationsList() {
    conversationsList.innerHTML = "";
    
    for (const conversation of conversations) {
        const item = document.createElement("div");
        item.className = `conversation-item ${conversation.id === currentConversationId ? "active" : ""}`;
        
        const titleDiv = document.createElement("span");
        titleDiv.className = "conversation-title";
        titleDiv.textContent = conversation.title;
        titleDiv.title = conversation.title;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-conversation";
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteConversation(conversation.id);
        });
        
        item.appendChild(titleDiv);
        item.appendChild(deleteBtn);
        item.addEventListener("click", () => loadConversation(conversation.id));
        
        conversationsList.appendChild(item);
    }
}

function clearChatDisplay() {
    chatContainer.innerHTML = "";
}

// ============ Message Display ============
function createMessageElement(text, isUser) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message-wrapper ${isUser ? "user-wrapper" : "bot-wrapper"}`;
    
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = isUser ? "👤" : "🤖";
    
    const messageBubble = document.createElement("div");
    messageBubble.className = `message ${isUser ? "user" : "bot"}`;
    messageBubble.textContent = text;
    
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
    setTimeout(() => {
        errorDiv.classList.remove("show");
    }, 3000);
}

// ============ File Upload Support ============
async function handleFileUpload(file) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        showError(`File too large. Max 10MB.`);
        fileInput.value = '';
        return;
    }

    const supportedExtensions = [
        'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'csv',
        'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php',
        'html', 'css', 'sql', 'sh', 'bash', 'conf', 'config', 'ini', 'env', 'md'
    ];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(fileExtension)) {
        showError(`Unsupported file type: .${fileExtension}`);
        fileInput.value = '';
        return;
    }

    const fileInfo = `📎 Analyzing ${file.name}...`;
    const userMsg = createMessageElement(fileInfo, true);
    chatContainer.appendChild(userMsg);
    scrollToBottom();

    addMessageToCurrentConversation('user', fileInfo);

    const loadingMsg = createMessageElement('Processing file...', false);
    loadingMsg.style.opacity = '0.7';
    chatContainer.appendChild(loadingMsg);
    scrollToBottom();

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.json();
        loadingMsg.remove();

        if (data.error) {
            showError(`Analysis failed: ${data.error}`);
        } else {
            const botMsg = createMessageElement('', false);
            chatContainer.appendChild(botMsg);
            await typeMessage(botMsg, data.response || 'No response', 25);
            scrollToBottom();
            addMessageToCurrentConversation('assistant', data.response);
        }
    } catch (err) {
        loadingMsg.remove();
        showError(`Upload failed: ${err.message}`);
    } finally {
        fileInput.value = '';
    }
}

// ============ Scroll Functions ============
function scrollToBottom() {
    const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
    if (isNearBottom) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
}

function scrollToBottomImmediate() {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

async function typeMessage(messageWrapper, text, speed = 30) {
    const messageBubble = messageWrapper.querySelector(".message");
    messageBubble.textContent = "";
    currentTypingAnimation = true;

    for (let i = 0; i < text.length; i++) {
        if (stopResponse) {
            messageBubble.textContent = text.substring(0, i);
            currentTypingAnimation = null;
            return;
        }
        messageBubble.textContent += text[i];
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed));
    }

    currentTypingAnimation = null;
}

// ============ Main Chat Function ============
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

    try {
        const userMsg = createMessageElement(message, true);
        chatContainer.appendChild(userMsg);
        messageInput.value = "";
        autoResizeTextarea();
        messageInput.focus();
        scrollToBottom();

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
            body: JSON.stringify({ message })
        });

        if (stopResponse) {
            loadingWrapper.remove();
            return;
        }

        loadingWrapper.remove();

        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("text/event-stream")) {
            let finalResponse = "";
            
            await new Promise((resolve, reject) => {
                const botMsg = createMessageElement("", false);
                chatContainer.appendChild(botMsg);
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                
                const processStream = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done || stopResponse) break;
                            
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop();
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    if (data === '[DONE]') {
                                        reader.releaseLock();
                                        resolve(finalResponse);
                                        return;
                                    }
                                    finalResponse += data;
                                    const messageBubble = botMsg.querySelector(".message");
                                    messageBubble.textContent = finalResponse;
                                    scrollToBottom();
                                }
                            }
                        }
                        
                        reader.releaseLock();
                        resolve(finalResponse);
                    } catch (error) {
                        reader.releaseLock();
                        reject(error);
                    }
                };
                
                processStream();
            });
            
            if (finalResponse.trim()) {
                addMessageToCurrentConversation("assistant", finalResponse);
            }
            
        } else {
            const data = await response.json();
            const botMsg = createMessageElement("", false);
            chatContainer.appendChild(botMsg);
            await typeMessage(botMsg, data.response || "No response", 25);
            scrollToBottom();

            if (!stopResponse) {
                addMessageToCurrentConversation("assistant", data.response);
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
