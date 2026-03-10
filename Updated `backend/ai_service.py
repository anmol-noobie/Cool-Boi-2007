import ollama
import json
import os
import tempfile
from typing import List, Dict
from datetime import datetime

# Project-relative paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_FILE = os.path.join(BASE_DIR, "conversation_history.json")
SYSTEM_PROMPT_FILE = os.path.join(BASE_DIR, "..", "prompts", "system_prompt.txt")


class ConversationManager:
    """Manages conversation history and sends it to Ollama model"""

    def __init__(self):
        self.conversation_history: List[Dict[str, str]] = []
        self.system_prompt = self.load_system_prompt()
        self.load_history()

    def load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open(SYSTEM_PROMPT_FILE, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            # Fallback to a basic prompt if file can't be loaded
            return "You are CoolBoi_2007 v3, a helpful AI assistant specialized in gaming and tech support."
    
    def load_history(self):
        """Load conversation history from file"""
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.conversation_history = data.get('messages', [])
            except Exception as e:
                print(f"Error loading history: {e}")
                self.conversation_history = []
                self.save_history()
        else:
            self.conversation_history = []
    
    def save_history(self):
        """Save conversation history to file"""
        temp_path = None
        try:
            history_dir = os.path.dirname(HISTORY_FILE) or "."
            fd, temp_path = tempfile.mkstemp(prefix="history_", suffix=".json", dir=history_dir)
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump({
                    'messages': self.conversation_history,
                    'last_updated': datetime.now().isoformat()
                }, f, indent=2, ensure_ascii=False)
            os.replace(temp_path, HISTORY_FILE)
        except Exception as e:
            print(f"Error saving history: {e}")
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
    
    def add_message(self, role: str, content: str):
        """Add a message to conversation history"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
        self.save_history()
    
    def get_messages_for_model(self) -> List[Dict[str, str]]:
        """Get full conversation history with system prompt for model"""
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.conversation_history)
        return messages
    
    def process_message_stream_sse(self, user_message: str):
        """Process user message and stream AI response using Server-Sent Events format"""

        # Add user message to history
        self.add_message("user", user_message)

        # Get full conversation for model
        messages = self.get_messages_for_model()
        
        # Call Ollama with streaming enabled
        try:
            stream = ollama.chat(
                model="qwen2.5-coder:7b",
                messages=messages,
                stream=True
            )
        except Exception as e:
            error_msg = (
                "Ollama connection failed. Start Ollama and ensure model "
                "'qwen2.5-coder:7b' is available. "
                f"Details: {e}"
            )
            yield f"data: {error_msg}\n\n"
            yield "data: [DONE]\n\n"
            self.add_message("assistant", error_msg)
            return
        
        bot_response = ""
        
        # Stream the response chunks as Server-Sent Events
        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                content = chunk['message']['content']
                if content:  # Only yield non-empty content
                    bot_response += content
                    # Format as Server-Sent Event
                    yield f"data: {content}\n\n"
        
        # Send end marker
        yield "data: [DONE]\n\n"
        
        # Add complete bot response to history
        self.add_message("assistant", bot_response)
    
    def get_history(self) -> List[Dict[str, str]]:
        """Get conversation history (without system prompt)"""
        return self.conversation_history.copy()
    
    def load_conversation(self, messages: List[Dict[str, str]]):
        """Load a conversation history from the frontend"""
        self.conversation_history = messages.copy()
        # Note: Not saving to file here as this is a temporary context switch
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        self.save_history()

    def process_file(self, file_content: str, filename: str) -> str:
        """Process an uploaded file by sending its contents to the model with specialized analysis."""
        # Detect file type and create specialized prompt
        file_type, analysis_prompt = self._detect_file_type_and_prompt(filename, file_content)
        
        # Create a comprehensive user message combining file context and analysis instructions
        descriptor = f"User uploaded {file_type} file '{filename}':{chr(10)}{chr(10)}{analysis_prompt}{chr(10)}{chr(10)}---FILE CONTENT---{chr(10)}{file_content}"
        self.add_message("user", descriptor)

        # Prepare messages and send to model
        messages = self.get_messages_for_model()
        try:
            response = ollama.chat(
                model="qwen2.5-coder:7b",
                messages=messages
            )
            bot_response = response['message']['content']
        except Exception as e:
            bot_response = (
                "File analysis unavailable because Ollama is not reachable "
                "or the model is missing. "
                f"Details: {e}"
            )

        # Add model response to history
        self.add_message("assistant", bot_response)
        return bot_response

    def _detect_file_type_and_prompt(self, filename: str, content: str) -> tuple:
        """Detect file type and return appropriate analysis prompt."""
        filename_lower = filename.lower()
        
        # Check file extension
        if any(filename_lower.endswith(ext) for ext in ['.log', '.logs', '.error', '.trace', '.stacktrace']):
            return "log", """Please analyze this log file and:
1. Identify any errors or warnings
2. Explain what went wrong
3. Suggest potential causes and solutions
4. Highlight any patterns or repeated issues"""
        
        elif any(filename_lower.endswith(ext) for ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.sql']):
            return "code", """Please analyze this code file and:
1. Review the code structure and logic
2. Identify any bugs, issues, or potential problems
3. Suggest improvements for performance, readability, or best practices
4. Check for security vulnerabilities
5. Provide specific code recommendations with examples if needed"""
        
        elif any(filename_lower.endswith(ext) for ext in ['.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config', '.env']):
            return "configuration", """Please analyze this configuration file and:
1. Explain what each setting does
2. Identify any misconfigurations or problems
3. Suggest optimal settings based on common use cases
4. Check for missing important configurations
5. Flag any security-related settings that need attention"""
        
        elif any(filename_lower.endswith(ext) for ext in ['.csv']):
            return "data", """Please analyze this CSV/data file and:
1. Describe the data structure and fields
2. Identify any anomalies, outliers, or data quality issues
3. Provide basic statistics or patterns
4. Suggest how this data could be useful
5. Flag any obvious errors or inconsistencies"""
        
        elif any(filename_lower.endswith(ext) for ext in ['.md', '.txt', '.text']):
            return "text", """Please analyze this text/documentation file and:
1. Summarize the main content
2. Identify key points and important information
3. Look for any issues or unclear sections
4. Suggest improvements to clarity or organization
5. Highlight any action items or requirements"""
        
        else:
            # Default analysis for unknown types
            return "text", """Please analyze this file and provide:
1. A summary of the contents
2. Identification of any errors or issues
3. Key insights or important information
4. Suggestions for improvement or next steps"""

# Global conversation manager
conversation_manager = ConversationManager()
