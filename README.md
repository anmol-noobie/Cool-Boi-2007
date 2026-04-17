# CoolBoi_2007 v3

A Gen-Z AI chatbot powered by Groq, specialized in gaming and coding assistance. Features multiple personality modes, streaming responses, file analysis, and a sleek web interface.

## Features
- **3 Personality Modes**: Mixed, Gaming, Coding
- **Real-time Streaming**: Instant AI responses
- **File Analysis**: Upload logs, code, configs for AI analysis
- **Conversation History**: Save and switch between chats
- **Dark/Light Theme**: Toggle themes
- **Special Commands**: /help, /debug, /fpsboost, /pcspecs

## Tech Stack
- **Backend**: Python, FastAPI, Groq API
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Vercel (frontend) + Render (backend)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/coolboi_2007.git
cd coolboi_2007

# Setup backend
cd backend
pip install -r requirements.txt

# Add your Groq API key
cp .env.example .env
# Edit .env and add: GROQ_API_KEY=your_key_here

# Run backend
uvicorn main:app --host 127.0.0.1 --port 8000

# In another terminal, run frontend
cd frontend
python -m http.server 5500
```

Open `http://127.0.0.1:5500` in your browser.

## Deployment
1. Deploy `backend/` folder to Render
2. Deploy `frontend/` folder to Vercel
3. Set `GROQ_API_KEY` environment variable on Render
4. Update `ALLOWED_ORIGINS` with your Vercel URL

## Commands
| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/debug <code>` | Debug code/errors |
| `/fpsboost <game>` | FPS boost tips |
| `/reset` | Clear chat history |

## License
MIT License

---

Made with ❤️ by **Anmol Bhardwaj**
