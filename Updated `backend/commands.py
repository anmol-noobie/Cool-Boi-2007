"""
Command handler system for CoolBoi_2007 v3.
Handles special "/" commands for quick utilities.
"""

# Available commands
COMMANDS = {
    "help": "Show all available commands",
    "debug": "Debug code or error message - Usage: /debug <code/error>",
    "explaincode": "Explain a piece of code - Usage: /explaincode <code>",
    "fpsboost": "Get FPS boost tips for games - Usage: /fpsboost <game>",
    "pcspecs": "Get recommended PC specs for gaming",
    "reset": "Clear conversation history",
}


def is_command(message: str) -> bool:
    """Check if message is a command (starts with /)."""
    return message.strip().startswith("/")


def parse_command(message: str) -> tuple[str, str]:
    """
    Parse command and its arguments.
    Returns: (command_name, arguments)
    """
    parts = message.strip().split(maxsplit=1)
    command_name = parts[0][1:].lower()  # Remove "/" and lowercase.
    arguments = parts[1] if len(parts) > 1 else ""
    return command_name, arguments


def handle_command(command_name: str, arguments: str) -> str:
    """Route command to appropriate handler."""
    if command_name == "help":
        return cmd_help()
    if command_name == "debug":
        return cmd_debug(arguments)
    if command_name == "explaincode":
        return cmd_explaincode(arguments)
    if command_name == "fpsboost":
        return cmd_fpsboost(arguments)
    if command_name == "pcspecs":
        return cmd_pcspecs()
    if command_name == "reset":
        return cmd_reset()
    return f"[ERROR] Unknown command: /{command_name}\n\nType `/help` for available commands."


def cmd_help() -> str:
    """Handle /help command."""
    help_text = "CoolBoi_2007 v3 - Available Commands\n\n"
    for cmd, desc in COMMANDS.items():
        help_text += f"/{cmd} - {desc}\n"

    help_text += "\nTips:\n"
    help_text += "- Type `/` to see command suggestions\n"
    help_text += "- Commands respond instantly\n"
    help_text += "- Regular messages go to the AI model"
    return help_text


def cmd_debug(code_or_error: str) -> str:
    """Handle /debug command."""
    if not code_or_error.strip():
        return "[ERROR] Please provide code or error message to debug.\n\nUsage: `/debug <code/error>`"

    debug_response = "Debug Analysis\n\n"
    debug_response += "I will analyze this for you:\n\n"
    debug_response += f"Input:\n```\n{code_or_error[:200]}\n```\n\n"
    debug_response += "Common issues to check:\n"
    debug_response += "- Check variable names for typos\n"
    debug_response += "- Verify syntax (missing colons, brackets, etc.)\n"
    debug_response += "- Check indentation (Python is sensitive to this)\n"
    debug_response += "- Ensure imports are correct\n"
    debug_response += "- Look for null/undefined value access\n\n"
    debug_response += "For detailed debugging, paste your exact error message."
    return debug_response


def cmd_explaincode(code: str) -> str:
    """Handle /explaincode command."""
    if not code.strip():
        return "[ERROR] Please provide code to explain.\n\nUsage: `/explaincode <code>`"

    explain_response = "Code Explanation\n\n"
    explain_response += f"Code:\n```\n{code[:150]}\n```\n\n"
    explain_response += "What this does:\n"
    explain_response += "- This code snippet performs a specific operation\n"
    explain_response += "- Break it down line by line for better understanding\n"
    explain_response += "- Check variable types and function purposes\n\n"
    explain_response += "For a deeper explanation, share the full snippet."
    return explain_response


def cmd_fpsboost(game: str = "") -> str:
    """Handle /fpsboost command."""
    fps_response = "FPS Boost Tips\n\n"
    if game.strip():
        fps_response += f"For {game}:\n\n"

    fps_response += "Graphics settings:\n"
    fps_response += "- Lower resolution (1080p instead of 1440p)\n"
    fps_response += "- Lower shadows and reflections\n"
    fps_response += "- Disable motion blur and anti-aliasing\n"
    fps_response += "- Reduce draw distance\n"
    fps_response += "- Turn off ray tracing (if available)\n\n"

    fps_response += "System optimization:\n"
    fps_response += "- Update GPU drivers (NVIDIA/AMD)\n"
    fps_response += "- Close background apps (Discord, Chrome, etc.)\n"
    fps_response += "- Disable background Windows updates\n"
    fps_response += "- Defragment your SSD/HDD\n"
    fps_response += "- Check CPU/GPU temperatures\n\n"

    fps_response += "Advanced:\n"
    fps_response += "- Overclock GPU (if you know what you are doing)\n"
    fps_response += "- Use game-specific optimizations\n"
    fps_response += "- Monitor frame times in MSI Afterburner"
    return fps_response


def cmd_pcspecs() -> str:
    """Handle /pcspecs command."""
    specs_response = "Gaming PC Recommended Specs\n\n"

    specs_response += "Entry level (1080p, 60 FPS):\n"
    specs_response += "- CPU: Ryzen 5 5600X / Intel i5-12400\n"
    specs_response += "- GPU: RTX 3060 / RX 6600\n"
    specs_response += "- RAM: 16GB DDR4\n"
    specs_response += "- Storage: 500GB SSD NVMe\n"
    specs_response += "- PSU: 600W\n\n"

    specs_response += "Mid range (1440p, 100+ FPS):\n"
    specs_response += "- CPU: Ryzen 7 5700X / Intel i7-12700\n"
    specs_response += "- GPU: RTX 3080 / RX 6800 XT\n"
    specs_response += "- RAM: 32GB DDR4\n"
    specs_response += "- Storage: 1TB SSD NVMe\n"
    specs_response += "- PSU: 850W\n\n"

    specs_response += "High end (4K, 120+ FPS):\n"
    specs_response += "- CPU: Ryzen 9 5950X / Intel i9-12900K\n"
    specs_response += "- GPU: RTX 4090 / RX 7900 XTX\n"
    specs_response += "- RAM: 64GB DDR5\n"
    specs_response += "- Storage: 2TB SSD NVMe\n"
    specs_response += "- PSU: 1200W\n\n"

    specs_response += "Note: exact specs depend on your target games."
    return specs_response


def cmd_reset() -> str:
    """Handle /reset command."""
    return "Conversation reset. History cleared."


def get_command_suggestions(partial_command: str) -> list[str]:
    """Get command suggestions based on partial input."""
    if not partial_command.startswith("/"):
        return []

    partial = partial_command[1:].lower()
    return [cmd for cmd in COMMANDS.keys() if cmd.startswith(partial)]
