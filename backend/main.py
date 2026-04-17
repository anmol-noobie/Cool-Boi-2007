from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import os

try:
    from .ai_service import conversation_manager, MODEL_NAME
    from .commands import *
except ImportError:
    from ai_service import conversation_manager, MODEL_NAME
    from commands import *
import sys

app = FastAPI()

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = "mixed"


class Message(BaseModel):
    role: str
    content: str


class LoadConversationRequest(BaseModel):
    messages: List[Message]
    mode: Optional[str] = "mixed"


class CommandSuggestionsRequest(BaseModel):
    partial: str


@app.get("/")
def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(index_path)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    mode = request.mode or "mixed"
    
    if is_command(message):
        command_name, arguments = parse_command(message)
        
        if command_name == "reset":
            conversation_manager.clear_history()
        
        command_response = handle_command(command_name, arguments)
        return {"response": command_response}
    else:
        return StreamingResponse(
            conversation_manager.process_message_stream_sse(message, mode),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )


@app.post("/load-conversation")
def load_conversation(request: LoadConversationRequest):
    messages_dict = [{"role": m.role, "content": m.content} for m in request.messages]
    conversation_manager.load_conversation(messages_dict)
    if request.mode:
        conversation_manager.set_mode(request.mode)
    return {"message": "Conversation loaded"}


@app.get("/history")
def get_history():
    return {"history": conversation_manager.get_history()}


@app.post("/clear")
def clear_conversation():
    conversation_manager.clear_history()
    return {"message": "Conversation cleared"}


@app.get("/commands")
def get_commands():
    return {"commands": COMMANDS}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), mode: Optional[str] = "mixed"):
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    contents = await file.read()
    
    if len(contents) > MAX_FILE_SIZE:
        file_size_mb = len(contents) / (1024 * 1024)
        return {"error": f"File too large. Max 10MB. Your file is {file_size_mb:.2f}MB."}
    
    supported_extensions = [
        'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'csv',
        'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php',
        'html', 'css', 'sql', 'sh', 'bash', 'conf', 'config', 'ini', 'env', 'md'
    ]
    
    filename = file.filename or "unknown.txt"
    file_extension = filename.split('.')[-1].lower() if '.' in filename else ''
    if not file_extension or file_extension not in supported_extensions:
        return {"error": f"Unsupported file type: .{file_extension}"}
    
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("utf-8", errors="ignore")
        if not text.strip():
            return {"error": "File appears to be binary or empty."}
    
    if not text.strip():
        return {"error": "File is empty or contains no readable text."}
    
    response = conversation_manager.process_file(text, filename, mode or "mixed")
    return {"response": response}


@app.get("/info")
def get_info():
    return {
        "mode": conversation_manager.current_mode,
        "model": MODEL_NAME,
        "python_version": sys.version,
    }


@app.post("/set-mode")
def set_mode(mode: str):
    conversation_manager.set_mode(mode)
    return {"mode": mode, "message": f"Mode set to {mode}"}


@app.post("/command-suggestions")
def command_suggestions_endpoint(request: CommandSuggestionsRequest):
    suggestions = get_command_suggestions(request.partial)
    suggestions_with_help = [
        {"name": cmd, "description": COMMANDS[cmd]}
        for cmd in suggestions
    ]
    return {"suggestions": suggestions_with_help}


@app.on_event("startup")
async def keep_alive_task():
    asyncio.create_task(ping_itself())


async def ping_itself():
    import httpx
    while True:
        await asyncio.sleep(600)
        try:
            async with httpx.AsyncClient() as client:
                await client.get("http://127.0.0.1:8000/health", timeout=5.0)
        except Exception:
            pass
