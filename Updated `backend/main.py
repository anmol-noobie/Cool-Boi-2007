from fastapi import FastAPI, UploadFile, File
# upload support requires python-multipart
try:
    import multipart  # type: ignore  # noqa: F401
    multipart_available = True
except ImportError:
    multipart_available = False
    print("Warning: python-multipart not installed; file uploads disabled.")
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
try:
    from .ai_service import conversation_manager
    from .commands import *
except ImportError:
    from ai_service import conversation_manager
    from commands import *
import sys

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class Message(BaseModel):
    role: str
    content: str

class LoadConversationRequest(BaseModel):
    messages: List[Message]


@app.post("/chat")
def chat(request: ChatRequest):
    """
    Chat endpoint that maintains conversation history.
    Handles both commands (starting with /) and regular messages.
    Returns streaming response for AI messages, regular JSON for commands.
    """
    message = request.message.strip()
    
    # Check if message is a command
    if is_command(message):
        command_name, arguments = parse_command(message)
        
        # Handle /reset specially (clears conversation)
        if command_name == "reset":
            conversation_manager.clear_history()
        
        # Get command response
        command_response = handle_command(command_name, arguments)
        return {"response": command_response}
    else:
        # Regular message - stream AI response using SSE
        return StreamingResponse(
            conversation_manager.process_message_stream_sse(message),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )


@app.post("/load-conversation")
def load_conversation(request: LoadConversationRequest):
    """
    Load a conversation history into the backend.
    Used when switching between conversations on the frontend.
    """
    conversation_manager.load_conversation(request.messages)
    return {"message": "Conversation loaded"}


@app.get("/history")
def get_history():
    """Get full conversation history"""
    return {"history": conversation_manager.get_history()}


@app.post("/clear")
def clear_conversation():
    """Clear conversation history and start fresh"""
    conversation_manager.clear_history()
    return {"message": "Conversation cleared"}


@app.get("/commands")
def get_commands():
    """Return all available commands"""
    return {"commands": COMMANDS}


class CommandSuggestionsRequest(BaseModel):
    partial: str


# new endpoints for file upload and info
if multipart_available:
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...)):
        """Receive a file upload and return analysis from the AI."""
        try:
            # File size validation (10MB max)
            MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
            
            # Read file contents
            contents = await file.read()
            
            # Check file size
            if len(contents) > MAX_FILE_SIZE:
                file_size_mb = len(contents) / (1024 * 1024)
                return {
                    "error": f"File too large. Maximum size is 10MB. Your file is {file_size_mb:.2f}MB."
                }
            
            # Supported file extensions for analysis
            supported_extensions = [
                'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'csv',
                'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php',
                'html', 'css', 'sql', 'sh', 'bash', 'conf', 'config', 'ini', 'env',
                'md', 'error', 'trace', 'stacktrace'
            ]
            
            # Get file extension
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            if not file_extension or file_extension not in supported_extensions:
                return {
                    "error": f"Unsupported file type: .{file_extension}. Supported: text files, code, logs, config files"
                }
            
            # Try to decode file as text
            try:
                text = contents.decode("utf-8")
            except UnicodeDecodeError:
                # Try with error handling
                text = contents.decode("utf-8", errors="ignore")
                if not text.strip():
                    return {
                        "error": "File appears to be binary or empty. Please upload a text-based file."
                    }
            
            # Ensure file is not empty
            if not text.strip():
                return {
                    "error": "File is empty or contains no readable text."
                }
            
            # Process the file with AI
            response = conversation_manager.process_file(text, file.filename)
            return {"response": response}
            
        except Exception as e:
            return {"error": f"Failed to process file: {str(e)}"}
else:
    @app.post("/upload")
    async def upload_file_disabled():
        return {"error": "File upload disabled: install python-multipart"}

@app.get("/info")
def get_info():
    """Return system information for display in settings."""
    return {
        "system_prompt": conversation_manager.system_prompt[:200],
        "model": "qwen2.5-coder:7b",
        "python_version": sys.version,
    }


@app.post("/command-suggestions")
def command_suggestions_endpoint(request: CommandSuggestionsRequest):
    """Get command suggestions based on partial input"""
    suggestions = get_command_suggestions(request.partial)
    suggestions_with_help = [
        {"name": cmd, "description": COMMANDS[cmd]}
        for cmd in suggestions
    ]
    return {"suggestions": suggestions_with_help}
