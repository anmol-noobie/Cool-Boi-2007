# CoolBoi Personality System

This directory contains the personality configuration for CoolBoi_2007 v3.

## Files

- `system_prompt.txt` - The main personality prompt that defines CoolBoi's behavior, tone, and knowledge areas

## How It Works

1. **Loading**: The backend loads the system prompt from `system_prompt.txt` when the ConversationManager initializes
2. **Integration**: The system prompt is always sent as the first message to the AI model for every conversation
3. **Personality**: CoolBoi responds as a Gen-Z gaming and tech assistant with casual, friendly language

## Editing the Personality

To modify CoolBoi's personality:
1. Edit `system_prompt.txt`
2. Restart the backend server
3. The changes will take effect immediately for new conversations

## Key Features

- **Gen-Z Slang**: Uses "yo", "bro", "lit", "sus", "cap", etc.
- **Gaming Focus**: Specializes in PC gaming, hardware, and tech troubleshooting
- **Practical Help**: Always provides actionable steps and solutions
- **Humorous Tone**: Adds gaming memes and relatable comments
- **Current Knowledge**: References modern games and current hardware trends