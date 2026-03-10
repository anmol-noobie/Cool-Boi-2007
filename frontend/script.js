const API_URL = "http://127.0.0.1:8000/chat";
const HISTORY_URL = "http://127.0.0.1:8000/history";
const CLEAR_URL = "http://127.0.0.1:8000/clear";
const LOAD_CONVERSATION_URL = "http://127.0.0.1:8000/load-conversation";
const COMMAND_SUGGESTIONS_URL = "http://127.0.0.1:8000/command-suggestions";
const UPLOAD_URL = "http://127.0.0.1:8000/upload";
const INFO_URL = "http://127.0.0.1:8000/info";

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
const settingsPanel = document.getElementById("settingsPanel");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toggleThemeBtn = document.getElementById("toggleThemeBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const systemInfoDiv = document.getElementById("systemInfo");
const modelInfoDiv = document.getElementById("modelInfo");

// State management
let isLoading = false;
let stopResponse = false; // Flag to stop AI response
let currentTypingAnimation = null; // Reference to current typing animation
let conversations = []; // Array of conversation objects
let currentConversationId = null; // ID of currently active conversation

// LocalStorage key
const STORAGE_KEY = "coolboi_conversations";

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

// file upload handlers
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
});

// settings handlers
settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("show");
    loadSettings();
});
closeSettingsBtn.addEventListener("click", () => settingsPanel.classList.remove("show"));
clearHistoryBtn.addEventListener("click", () => {
    // Confirm before clearing
    if (confirm("⚠️ Are you sure you want to clear all conversation history? This cannot be undone.")) {
        // clear frontend history and backend
        conversations = [];
        saveConversationsToStorage();
        createNewConversation();
        showError("✓ Conversation history cleared");
        settingsPanel.classList.remove("show");
    }
});
toggleThemeBtn.addEventListener("click", toggleTheme);

messageInput.addEventListener("input", handleInputChange);
messageInput.addEventListener("keydown", handleKeyDown);
messageInput.addEventListener("blur", () => {
    setTimeout(() => {
        commandSuggestionsDiv.classList.remove("show");
    }, 200);
});

// ============ Command Suggestions ============
async function handleInputChange() {
    const value = messageInput.value;
    
    // Auto-resize textarea
    autoResizeTextarea();
    
    // Only show suggestions if user typed "/"
    if (value.startsWith("/")) {
        await showCommandSuggestions(value);
    } else {
        commandSuggestionsDiv.classList.remove("show");
    }
}

function handleKeyDown(e) {
    // Auto-resize on keydown as well for better responsiveness
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
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                partial: partial
            })
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const suggestions = data.suggestions || [];
        
        if (suggestions.length === 0) {
            commandSuggestionsDiv.classList.remove("show");
            return;
        }
        
        // Build suggestions HTML
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
        // No previous conversations, create a new one
        createNewConversation();
    } else {
        // Load the most recent conversation
        currentConversationId = conversations[0].id;
        loadConversation(currentConversationId);
    }
    
    renderConversationsList();
}

// ============ Conversation Management ============
function createNewConversation() {
    // Clear backend conversation
    fetch(CLEAR_URL, { method: "POST" }).catch(err => console.log("Clear error:", err));
    
    const newConversation = {
        id: Date.now().toString(),
        title: "New Conversation",
        messages: [],
        createdAt: new Date().toISOString()
    };
    
    conversations.unshift(newConversation);
    currentConversationId = newConversation.id;
    
    saveConversationsToStorage();
    renderConversationsList();
    clearChatDisplay();
    messageInput.focus();
}

function loadConversation(conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
        console.error("Conversation not found");
        return;
    }
    
    currentConversationId = conversationId;
    
    // Clear display
    clearChatDisplay();
    
    // Sync conversation with backend
    fetch(LOAD_CONVERSATION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: conversation.messages
        })
    }).catch(err => console.log("Backend sync error:", err));
    
    // Display all messages from this conversation
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
        conversation.title = title;
        saveConversationsToStorage();
        renderConversationsList();
    }
}

function addMessageToCurrentConversation(role, content) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages.push({ role, content });
        
        // Update title if this is the first user message
        if (conversation.title === "New Conversation" && role === "user") {
            const titlePreview = content.substring(0, 40);
            updateConversationTitle(currentConversationId, titlePreview);
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
        console.warn("Failed to parse local conversation storage. Resetting.", error);
        conversations = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveConversationsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
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
    }, 5000);
}

// ============ File Upload Support ============
async function handleFileUpload(file) {
    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
        showError(`File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
        fileInput.value = '';
        return;
    }

    // Validate file type - only allow text-based files
    const supportedExtensions = [
        'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'csv',
        'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php',
        'html', 'css', 'sql', 'sh', 'bash', 'conf', 'config', 'ini', 'env',
        'md', 'txt', 'error', 'trace', 'stacktrace'
    ];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(fileExtension)) {
        showError(`Unsupported file type: .${fileExtension}. Supported: text files, code, logs, config files`);
        fileInput.value = '';
        return;
    }

    // Show user message indicating file upload
    const fileInfo = `📎 Analyzing ${file.name} (${(file.size / 1024).toFixed(1)}KB)...`;
    const userMsg = createMessageElement(fileInfo, true);
    chatContainer.appendChild(userMsg);
    scrollToBottom();

    // Add the user message to conversation
    addMessageToCurrentConversation('user', fileInfo);

    // Show loading message
    const loadingMsg = createMessageElement('🤔 Processing your file...', false);
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

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Remove loading message
        loadingMsg.remove();

        if (data.error) {
            showError(`Analysis failed: ${data.error}`);
            // Add error message to assistant for context
            addMessageToCurrentConversation('assistant', `Error: ${data.error}`);
        } else {
            // Display the AI's analysis as a bot message
            const botMsg = createMessageElement('', false);
            chatContainer.appendChild(botMsg);
            await typeMessage(botMsg, data.response || 'No response received', 25);
            scrollToBottom();

            // Add to conversation history
            addMessageToCurrentConversation('assistant', data.response);
        }
    } catch (err) {
        loadingMsg.remove();
        showError(`Upload failed: ${err.message}`);
    } finally {
        fileInput.value = ''; // reset file input
    }
}

// ============ Settings Helpers ============
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Update button text to show next action
    const themeLabel = toggleThemeBtn.querySelector('span');
    if (themeLabel) {
        themeLabel.textContent = isLight ? '☀️ Switch to Dark Mode' : '🌙 Switch to Light Mode';
    }
    
    // Show feedback
    showError(isLight ? '✓ Switched to Light Mode' : '✓ Switched to Dark Mode');
}

async function loadSettings() {
    // restore theme
    const theme = localStorage.getItem('theme');
    if (theme === 'light') document.body.classList.add('light-mode');

    // fetch system/model info
    try {
        const resp = await fetch(INFO_URL);
        if (resp.ok) {
            const info = await resp.json();
            
            // Format system prompt - show first 150 chars and truncate if needed
            const promptPreview = info.system_prompt 
                ? (info.system_prompt.length > 150 
                    ? info.system_prompt.substring(0, 150) + '...' 
                    : info.system_prompt)
                : 'Default system prompt';
            systemInfoDiv.textContent = promptPreview;
            
            // Format model info and strip noisy suffixes like "84% left" if any source adds them.
            const modelName = normalizeModelName(info.model || 'qwen2.5-coder:7b');
            modelInfoDiv.textContent = modelName;
        } else {
            systemInfoDiv.textContent = 'Unable to load system prompt';
            modelInfoDiv.textContent = 'Unable to load model info';
        }
    } catch (e) {
        console.error('Failed to load info:', e);
        systemInfoDiv.textContent = 'Error loading system prompt';
        modelInfoDiv.textContent = 'Error loading model info';
    }
}


function scrollToBottom() {
    // Only auto-scroll if user is near the bottom (within 100px)
    const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
    
    if (isNearBottom) {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

function scrollToBottomImmediate() {
    // Force scroll to bottom (for new conversations, etc.)
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

async function typeMessage(messageWrapper, text, speed = 30) {
    // Display text with typing animation effect
    const messageBubble = messageWrapper.querySelector(".message");
    messageBubble.textContent = "";
    currentTypingAnimation = true; // Mark animation as active

    for (let i = 0; i < text.length; i++) {
        if (stopResponse) {
            // Stop animation and show partial text
            messageBubble.textContent = text.substring(0, i);
            currentTypingAnimation = null;
            return;
        }
        messageBubble.textContent += text[i];
        // Scroll smoothly during typing animation
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed));
    }

    currentTypingAnimation = null; // Animation completed
}

// ============ Main Chat Function ============
async function sendMessage() {
    // If currently loading, this is a stop request
    if (isLoading) {
        stopResponse = true;
        sendBtn.disabled = true;
        sendBtn.textContent = "Stopping...";
        
        // Remove loading indicator
        const loadingMsg = chatContainer.querySelector(".loading");
        if (loadingMsg) loadingMsg.parentElement.remove();
        
        return;
    }

    const message = messageInput.value.trim();

    // Prevent sending empty messages or messages with only whitespace/newlines
    if (!message || message.length === 0) {
        messageInput.value = "";
        autoResizeTextarea();
        return;
    }
    
    if (isLoading) return;

    try {
        // Add user message to chat display
        const userMsg = createMessageElement(message, true);
        chatContainer.appendChild(userMsg);
        messageInput.value = "";
        autoResizeTextarea();
        messageInput.focus();
        scrollToBottom();

        // Add to current conversation
        addMessageToCurrentConversation("user", message);

        // Set loading state
        isLoading = true;
        stopResponse = false; // Reset stop flag
        sendBtn.disabled = false; // Keep button enabled for stop functionality
        sendBtn.textContent = "Stop"; // Change button to Stop

        // Show loading indicator
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

        // Send request to backend
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: message,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        // Check if user stopped the response
        if (stopResponse) {
            // Remove loading message and reset state
            loadingWrapper.remove();
            return;
        }

        // Remove loading message
        loadingWrapper.remove();

        // Check response type - SSE for AI messages, JSON for commands
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("text/event-stream")) {
            // Streaming AI response using Server-Sent Events
            let finalResponse = "";
            
            await new Promise((resolve, reject) => {
                const botMsg = createMessageElement("", false);
                chatContainer.appendChild(botMsg);
                
                // Create EventSource-like handling for fetch response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                
                const processStream = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            
                            if (done || stopResponse) break;
                            
                            buffer += decoder.decode(value, { stream: true });
                            
                            // Process complete SSE messages
                            const lines = buffer.split('\n');
                            buffer = lines.pop(); // Keep incomplete line in buffer
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6); // Remove 'data: ' prefix
                                    if (data === '[DONE]') {
                                        // End of stream
                                        reader.releaseLock();
                                        resolve(finalResponse);
                                        return;
                                    }
                                    finalResponse += data;
                                    
                                    // Update message content progressively
                                    const messageBubble = botMsg.querySelector(".message");
                                    messageBubble.textContent = finalResponse;
                                    
                                    // Scroll smoothly during streaming
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
            
            // Add to conversation (only if not stopped)
            if (!stopResponse && finalResponse.trim()) {
                addMessageToCurrentConversation("assistant", finalResponse);
            } else if (stopResponse && finalResponse.trim()) {
                addMessageToCurrentConversation("assistant", finalResponse);
            }
            
        } else {
            // JSON response (command)
            const data = await response.json();
            
            // Add bot response with typing animation
            const botMsg = createMessageElement("", false);
            chatContainer.appendChild(botMsg);
            await typeMessage(botMsg, data.response || "No response received", 25);
            scrollToBottom();

            // Add to conversation (only if not stopped)
            if (!stopResponse) {
                addMessageToCurrentConversation("assistant", data.response);
            } else {
                // Add partial response if stopped
                const partialText = botMsg.querySelector(".message").textContent;
                if (partialText.trim()) {
                    addMessageToCurrentConversation("assistant", partialText);
                }
            }
        }

        // Clear error if any
        errorDiv.classList.remove("show");
    } catch (error) {
        console.error("Error:", error);
        
        // Don't show error if response was stopped by user
        if (!stopResponse) {
            showError(`Failed to get response: ${error.message}`);
        }
        
        // Remove loading message if it exists
        const loadingMsg = chatContainer.querySelector(".loading");
        if (loadingMsg) loadingMsg.parentElement.remove();
    } finally {
        isLoading = false;
        stopResponse = false;
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
        messageInput.focus();
    }
}

function normalizeModelName(rawModelName) {
    if (!rawModelName || typeof rawModelName !== "string") {
        return "qwen2.5-coder:7b";
    }

    // Remove optional status tails such as "84% left".
    return rawModelName.replace(/\s*\(?\d{1,3}%\s+left\)?/gi, "").trim();
}
