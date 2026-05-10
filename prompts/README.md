# CoolBoi Personality System

This directory contains the personality configuration for CoolBoi_2007 v3.

## Files

- `mode_mixed.txt` - Default mode: Gen-Z tech-savvy assistant blending gaming and coding
- `mode_gaming.txt` - Gaming mode: High-energy, gamer-focused responses
- `mode_coding.txt` - Coding mode: Technical, clean, code-first responses

## How It Works

1. **Loading**: The backend loads the appropriate `mode_*.txt` file based on the active mode
2. **Mode Switching**: When the user changes mode, the system prompt is reloaded immediately
3. **Fallback**: If a mode file is missing, `ai_service.py` uses built-in fallback prompts
4. **Integration**: The system prompt is sent as the first message to the AI model for every conversation

## Structured Code Responses

All mode prompts instruct the LLM to return **structured JSON** when sharing code:

```json
{
  "type": "code_response",
  "explanation": "Natural language explanation",
  "language": "cpp",
  "code": "#include <iostream>\n...",
  "title": "Optional title",
  "tips": ["Optional", "tips", "array"]
}
```

The frontend detects and parses this JSON, rendering it as a structured code block with explanation, syntax highlighting, and optional tips. For casual/non-code questions, the LLM responds with normal text (rendered as markdown).

## Editing Personalities

To modify CoolBoi's behavior in a specific mode:
1. Edit the corresponding `mode_<name>.txt` file
2. Restart the backend server
3. Changes take effect for new conversations

## Architecture

```
Backend (ai_service.py)
  └── ConversationManager
       └── load_mode_prompt(mode)
            └── prompts/mode_<mode>.txt
                 └── Sent to Groq as system message
                      └── LLM returns: markdown (casual) OR JSON (code responses)
                           └── Frontend detects type and renders accordingly
```
