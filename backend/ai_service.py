from groq import Groq
import json
import os
import tempfile
from typing import List, Dict
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is not set")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPTS_DIR = os.path.join(BASE_DIR, "..", "prompts")
HISTORY_FILE = os.path.join(BASE_DIR, "conversation_history.json")

MODE_PROMPTS = {
    "default": "mixed",
    "mixed": "mixed",
    "gaming": "gaming",
    "coding": "coding"
}


def load_mode_prompt(mode: str) -> str:
    """Load system prompt for the given mode."""
    prompt_key = MODE_PROMPTS.get(mode, "mixed")
    prompt_file = os.path.join(PROMPTS_DIR, f"mode_{prompt_key}.txt")
    
    try:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error loading {prompt_key} prompt: {e}")
        return get_fallback_prompt(mode)


def get_fallback_prompt(mode: str) -> str:
    """Fallback prompts if files are not found."""
    prompts = {
        "mixed": """You are CoolBoi_2007, a Gen-Z tech-savvy assistant. Be casual, use light slang like "ngl", "fr", "no cap". Be direct and helpful. Keep responses punchy with line breaks. Use code blocks for code.""",
        "gaming": """You are CoolBoi_2007 in GAMING MODE. High energy, competitive. Use gaming slang naturally: GG, meta, buff, nerf, clutch, tryhard. Treat tech problems like game challenges. Keep it hype and fun.""",
        "coding": """You are CoolBoi_2007 in CODING MODE. Senior dev energy. Precise, methodical. Lead with solution first, explanation after. Use proper code blocks. Mention best practices and edge cases."""
    }
    return prompts.get(mode, prompts["mixed"])


class ConversationManager:
    """Manages conversation history and sends it to Groq cloud model"""

    def __init__(self):
        self.conversation_history: List[Dict[str, str]] = []
        self.current_mode = "mixed"
        self.system_prompt = load_mode_prompt("mixed")
        self.load_history()
        self.client = Groq(api_key=GROQ_API_KEY)

    def set_mode(self, mode: str):
        """Set the current mode and load corresponding system prompt."""
        self.current_mode = mode
        self.system_prompt = load_mode_prompt(mode)
        print(f"Mode changed to: {mode}")

    def load_history(self):
        """Load conversation history from file"""
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.conversation_history = data.get('messages', [])
                    self.current_mode = data.get('mode', 'mixed')
                    self.system_prompt = load_mode_prompt(self.current_mode)
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
                    'mode': self.current_mode,
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
    
    def _check_creator_question(self, message: str) -> str:
        """Check if user is asking about the creator/developer."""
        message_lower = message.lower()
        creator_patterns = [
            "who made you",
            "who created you",
            "who is your creator",
            "who is your developer",
            "who is your owner",
            "who built you",
            "who designed you",
            "who made coolboi",
            "who made coolboi_2007",
            "your creator",
            "your developer",
            "your maker",
            "your owner",
            "made by",
            "created by",
            "built by",
            "developed by",
            "your dad",
            "your mom",
            "your master",
        ]
        return any(pattern in message_lower for pattern in creator_patterns)
    
    def _get_creator_response(self, mode: str) -> str:
        """Get creator response based on mode."""
        responses = {
            "mixed": "ngl fr fr, my creator is **Anmol Bhardwaj** - absolute legend who built me from scratch! 🔥",
            "gaming": "Yo, my creator is **Anmol Bhardwaj** - the real MVP who brought me into existence! GG to this absolute chad! 🏆",
            "coding": "My creator is **Anmol Bhardwaj**. Built with FastAPI, powered by Groq, and crafted with clean code practices."
        }
        return responses.get(mode, responses["mixed"])
    
    def process_message_stream_sse(self, user_message: str, mode: str = None):
        """Process user message and stream AI response using Server-Sent Events format"""
        
        if mode and mode != self.current_mode:
            self.set_mode(mode)

        self.add_message("user", user_message)
        
        if self._check_creator_question(user_message):
            creator_response = self._get_creator_response(self.current_mode)
            yield f"data: {creator_response}\n\n"
            yield "data: [DONE]\n\n"
            self.add_message("assistant", creator_response)
            return

        messages = self.get_messages_for_model()
        
        try:
            stream = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                stream=True
            )
        except Exception as e:
            error_msg = f"Groq API error: {e}"
            yield f"data: {error_msg}\n\n"
            yield "data: [DONE]\n\n"
            self.add_message("assistant", error_msg)
            return
        
        bot_response = ""
        
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                if content:
                    bot_response += content
                    yield f"data: {content}\n\n"
        
        yield "data: [DONE]\n\n"
        
        self.add_message("assistant", bot_response)
    
    def get_history(self) -> List[Dict[str, str]]:
        """Get conversation history (without system prompt)"""
        return self.conversation_history.copy()
    
    def load_conversation(self, messages: List[Dict[str, str]]):
        """Load a conversation history from the frontend"""
        self.conversation_history = messages.copy()
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        self.save_history()

    def process_file(self, file_content: str, filename: str, mode: str = None) -> str:
        """Process an uploaded file by sending its contents to the model."""
        
        if mode and mode != self.current_mode:
            self.set_mode(mode)

        file_type, analysis_prompt = self._detect_file_type_and_prompt(filename, file_content)
        
        descriptor = f"User uploaded {file_type} file '{filename}':\n\n{analysis_prompt}\n\n---FILE CONTENT---\n{file_content}"
        self.add_message("user", descriptor)

        messages = self.get_messages_for_model()
        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages
            )
            bot_response = response.choices[0].message.content or "No response generated"
        except Exception as e:
            bot_response = f"File analysis unavailable due to Groq API error: {e}"

        self.add_message("assistant", bot_response)
        return bot_response

    def _detect_file_type_and_prompt(self, filename: str, content: str) -> tuple:
        """Detect file type and return appropriate analysis prompt."""
        filename_lower = filename.lower()
        
        if any(filename_lower.endswith(ext) for ext in ['.log', '.logs', '.error', '.trace', '.stacktrace']):
            return "log", "Please analyze this log file and:\n1. Identify any errors or warnings\n2. Explain what went wrong\n3. Suggest potential causes and solutions"
        
        elif any(filename_lower.endswith(ext) for ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.sql']):
            return "code", "Please analyze this code file and:\n1. Review the code structure and logic\n2. Identify any bugs or issues\n3. Suggest improvements for performance or best practices"
        
        elif any(filename_lower.endswith(ext) for ext in ['.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config', '.env']):
            return "config", "Please analyze this configuration file and:\n1. Explain what each setting does\n2. Identify any misconfigurations\n3. Suggest optimal settings"
        
        elif any(filename_lower.endswith(ext) for ext in ['.csv']):
            return "data", "Please analyze this CSV/data file and:\n1. Describe the data structure\n2. Identify any anomalies or issues\n3. Suggest how this data could be useful"
        
        else:
            return "text", "Please analyze this file and provide:\n1. A summary of the contents\n2. Key insights or important information\n3. Suggestions for improvement"


conversation_manager = ConversationManager()
