from groq import Groq
import json
import os
import re
import tempfile
from typing import List, Dict, Optional
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


def clean_json_response(text: str) -> str:
    """Strip markdown fences and surrounding noise from LLM JSON responses."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r'^```(?:json)?\s*\n?', '', stripped)
        stripped = re.sub(r'\n?```\s*$', '', stripped)
        stripped = stripped.strip()
    return stripped


def extract_json_from_response(text: str) -> Optional[dict]:
    """Attempt to parse a structured JSON code response from LLM output.
    Returns parsed dict if valid JSON with 'type' key, else None.
    """
    cleaned = clean_json_response(text)
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "type" in data:
            return data
        return None
    except (json.JSONDecodeError, ValueError):
        return None


def get_fallback_prompt(mode: str) -> str:
    """Fallback prompts if files are not found."""
    code_response_instruction = """

## CODE BLOCK FORMAT
When sharing code, use markdown fenced code blocks with triple backticks and the language identifier (e.g., ```python). Keep explanations before the code block. For non-code questions, respond normally.
"""
    base_rules = f"""

OUTPUT FORMAT RULES (FOLLOW EXACTLY):
1. Keep replies conversational, useful, and complete.
2. Avoid filler sentences, repeated ideas, and extra introductions.
3. Use clear paragraph breaks and short lists when needed.
4. Use **bold** for important terms.
5. Use numbered lists for steps.
6. Do not add extra sections unless directly relevant.
7. Avoid phrases like "let me know", "I'm here to help" unless natural.
8. If asked who made you: "CoolBoi_2007 was created by Anmol Bhardwaj." Exactly.
{code_response_instruction}
"""
    prompts = {
        "mixed": f"You are CoolBoi_2007, a Gen-Z tech-savvy assistant. Be casual, balanced, and friendly. Keep answers conversational, useful, and complete.{base_rules}",
        "gaming": f"You are CoolBoi_2007 in GAMING MODE. High energy, competitive, and gamer-focused. Use gaming analogies and clear, confident strategy advice.{base_rules}",
        "coding": f"You are CoolBoi_2007 in CODING MODE. Technical, clean, and code-first. Lead with the solution, then explain why it works.{base_rules}"
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

    def _check_creator_question(self, message: str) -> bool:
        """Check if user is asking about the creator/developer."""
        normalized = re.sub(r"[^a-z0-9\s]", " ", message.lower())
        creator_keywords = r"\b(creator|owner|founder|developer|author|maker|builder)\b"
        maker_verbs = r"\b(made|built|created|developed)\b"
        direct_phrases = [
            r"who.*\bmade\b",
            r"who.*\bbuilt\b",
            r"who.*\bcreated\b",
            r"who.*\bdeveloped\b",
            r"who.*\byour\b.*(creator|owner|founder|developer|author|maker|builder)",
            r"who.*\b(creator|owner|founder|developer|author|maker|builder)\b",
            r"tell me about your (creator|owner|founder|developer|author|maker|builder)",
            r"about your (creator|owner|founder|developer|author|maker|builder)",
            r"who.*\bis\b.*\byou\b.*(made|built|created|developed)",
            r"who.*behind.*(you|this|coolboi|coolboi_2007|coolboi2007)",
            r"who.*is.*behind.*(you|this|coolboi|coolboi_2007|coolboi2007)",
            r"(coolboi|coolboi_2007|coolboi2007).*(made|built|created|developed)",
            r"(made|built|created|developed).*(coolboi|coolboi_2007|coolboi2007)"
        ]

        for phrase in direct_phrases:
            if re.search(phrase, normalized):
                return True

        if re.search(creator_keywords, normalized) and re.search(maker_verbs, normalized):
            return True

        return False

    def _get_creator_response(self, mode: str) -> str:
        """Get creator response based on mode with exact required phrase."""
        base = "CoolBoi_2007 was created by Anmol Bhardwaj."
        variants = {
            "mixed": f"{base} He is the dev behind my whole personality, the one who built me as a gaming and coding assistant.",
            "gaming": f"{base} That's the OG fact - Anmol Bhardwaj is the creator who crafted me to flex gaming knowledge and system strats.",
            "coding": f"{base} Anmol Bhardwaj built me with FastAPI, Groq, and clean coding principles so I can deliver precise technical help."
        }
        return variants.get(mode, variants["mixed"])

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
            if chunk.choices and chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                if content is not None:
                    bot_response += content
                    print(f"SENDING TOKEN: {repr(content)}")
                    yield f"data: {json.dumps({'content': content})}\n\n"

        print(f"[DEBUG] Coding mode response complete. Length: {len(bot_response)}, Starts with: {bot_response[:100]}")
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
            return "log", "Please analyze this log file and:\n1. Identify any errors, warnings, or failure patterns.\n2. Explain the most likely root causes in plain language.\n3. Suggest practical fixes and next steps to resolve the issue.\n4. Use numbered lists and clear sections."

        elif any(filename_lower.endswith(ext) for ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.sql']):
            return "code", "Please analyze this code file and:\n1. Review the overall structure and logic.\n2. Identify any bugs, syntax issues, or edge cases.\n3. Suggest improvements for performance, readability, and best practices.\n4. Provide sample corrections or code snippets if relevant."

        elif any(filename_lower.endswith(ext) for ext in ['.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config', '.env']):
            return "config", "Please analyze this configuration file and:\n1. Explain the purpose of the main settings.\n2. Identify any misconfigurations or risky values.\n3. Recommend safer or more effective settings.\n4. Summarize what the current configuration will do."

        elif any(filename_lower.endswith(ext) for ext in ['.csv']):
            return "data", "Please analyze this CSV/data file and:\n1. Describe the data structure and key columns.\n2. Identify any anomalies or inconsistencies.\n3. Suggest how this data could be used or improved.\n4. Present your findings clearly with numbered points."

        else:
            return "text", "Please analyze this file and provide:\n1. A summary of the contents.\n2. Key insights or important information.\n3. Suggestions for improvement.\n4. A clear, structured answer with headings or numbered lists."


conversation_manager = ConversationManager()
