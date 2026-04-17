const CONFIG = {
    BACKEND_URL: ""  // Empty = same origin (works for both local and deployed)
};

const API_URL = `${CONFIG.BACKEND_URL}/chat`;
const HISTORY_URL = `${CONFIG.BACKEND_URL}/history`;
const CLEAR_URL = `${CONFIG.BACKEND_URL}/clear`;
const LOAD_CONVERSATION_URL = `${CONFIG.BACKEND_URL}/load-conversation`;
const COMMAND_SUGGESTIONS_URL = `${CONFIG.BACKEND_URL}/command-suggestions`;
const UPLOAD_URL = `${CONFIG.BACKEND_URL}/upload`;
const INFO_URL = `${CONFIG.BACKEND_URL}/info`;

const MODES = {
    default: {
        name: "Mixed Mode",
        icon: "✦",
        systemPrompt: "You are CoolBoi_2007, a Gen-Z tech-savvy assistant who knows everything about gaming AND coding. You're like that one friend who's insanely good at both and explains things in the most chill way possible."
    },
    gaming: {
        name: "Gaming Mode",
        icon: "⚔️",
        systemPrompt: "You are CoolBoi_2007 in FULL GAMING MODE. You are an elite gamer and gaming tech expert. Every single response must feel like it came from someone who has 10,000 hours in games and lives and breathes gaming culture."
    },
    coding: {
        name: "Coding Mode",
        icon: "</>",
        systemPrompt: "You are CoolBoi_2007 in CODING MODE. You are a senior developer who is genuinely passionate about clean code, good architecture, and developer experience."
    }
};

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

let isLoading = false;
let stopResponse = false;
let conversations = [];
let currentConversationId = null;

const STORAGE_KEY = "coolboi_conversations";
const SETTINGS_KEY = "coolboi_settings";

const defaultSettings = {
    mode: "default",
    theme: "dark",
    temperature: 0.7
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

temperatureSlider.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    temperatureValue.textContent = value.toFixed(1);
    tempInfoDiv.textContent = value.toFixed(1);
    saveSettings({ temperature: value });
});

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
    temperatureSlider.value = settings.temperature;
    temperatureValue.textContent = settings.temperature.toFixed(1);
    tempInfoDiv.textContent = settings.temperature.toFixed(1);
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
        const data = await response.json();
        const suggestions = data.suggestions || [];
        if (suggestions.length === 0) {
            commandSuggestionsDiv.classList.remove("show");
            return;
        }
        commandSuggestionsDiv.innerHTML = suggestions.map(s => 
            `<div class="suggestion-item" onclick="insertCommand('/${s.name}')"><span class="suggestion-name">/${s.name}</span><span class="suggestion-desc">${s.description}</span></div>`
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
            const info = await resp.json();
            modelInfoDiv.textContent = info.model || "llama-3.3-70b-versatile";
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

function parseMarkdown(text) {
    let html = text;
    
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block"><div class="code-header"><span class="code-lang">${lang || 'code'}</span><button class="copy-btn" onclick="copyCode('${codeId}')">Copy</button></div><pre id="${codeId}" class="code-content">${escapeHtml(code.trim())}</pre></div>`;
    });
    
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[123]>)/g, '$1');
    html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<div class="code-block">)/g, '$1');
    html = html.replace(/(<\/div>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createMessageElement(text, isUser) {
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
        const data = await response.json();
        loadingMsg.remove();
        if (data.error) {
            showError(`Analysis failed: ${data.error}`);
        } else {
            const botMsg = createMessageElement('', false);
            chatContainer.appendChild(botMsg);
            await typeMessage(botMsg, data.response || 'No response', 25);
            scrollToBottomImmediate();
            addMessageToCurrentConversation('assistant', data.response);
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
    messageBubble.innerHTML = '';
    currentTypingAnimation = true;
    let currentHtml = '';
    let i = 0;
    
    while (i < text.length && !stopResponse) {
        if (text.substring(i, i + 3) === '```') {
            let endIdx = text.indexOf('```', i + 3);
            if (endIdx === -1) endIdx = text.length;
            const codeBlock = text.substring(i, endIdx + 3);
            currentHtml += parseMarkdown(codeBlock);
            i = endIdx + 3;
        } else if (text[i] === '`') {
            let endIdx = text.indexOf('`', i + 1);
            if (endIdx === -1) endIdx = text.length;
            const code = text.substring(i, endIdx + 1);
            currentHtml += parseMarkdown(code);
            i = endIdx + 1;
        } else {
            currentHtml += text[i];
            i++;
        }
        messageBubble.innerHTML = currentHtml;
        scrollToBottomImmediate();
        await new Promise(resolve => setTimeout(resolve, speed));
    }
    
    if (stopResponse) {
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
            body: JSON.stringify({ message, mode: getCurrentMode() })
        });

        if (stopResponse) {
            loadingWrapper.remove();
            isLoading = false;
            return;
        }

        loadingWrapper.remove();

        if (response.headers.get("content-type")?.includes("text/event-stream")) {
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
                                    messageBubble.innerHTML = parseMarkdown(finalResponse);
                                    scrollToBottomImmediate();
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
            scrollToBottomImmediate();
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

let currentTypingAnimation = null;
