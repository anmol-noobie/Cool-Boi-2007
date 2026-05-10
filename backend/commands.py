"""
Command handler system for CoolBoi_2007 v3.
Handles special "/" commands for quick utilities.
"""
import random

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
    message = message.strip()
    if not message.startswith("/"):
        return "", ""
    parts = message[1:].split(maxsplit=1)
    command_name = parts[0].lower()
    arguments = message[len(command_name) + 2 :].strip() if len(parts) > 1 else ""
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
    responses = [
        f"nah bro '/{command_name}' isn't a thing 💀 you cooked that one up yourself. type /help to see what's actually available fr",
        f"bro '/{command_name}'?? that command doesn't exist lmaoo. hit /help to see the real ones 😭",
        f"ratio + '/{command_name}' isn't real + type /help 💀",
    ]
    return random.choice(responses)


def cmd_help() -> str:
    """Handle /help command."""
    help_text = "**CoolBoi_2007 v3 Commands — I Got You Fr 🔥**\n\n"
    help_text += "- **/help** - Shows this command list (you're here)\n"
    help_text += "- **/debug <code>** - Debugs your code, finds bugs and gives fixes\n"
    help_text += "- **/explaincode <code>** - Breaks down code line by line, explains what it does\n"
    help_text += "- **/fpsboost [game]** - Gaming FPS optimization tips and settings\n"
    help_text += "- **/pcspecs** - Recommended PC builds for different budgets\n"
    help_text += "- **/reset** - Clears chat history and starts fresh\n\n"
    help_text += "**Tips:**\n"
    help_text += "- Type `/` to see command suggestions as you type\n"
    help_text += "- Commands with code respond instantly, others stream like normal chat\n"
    help_text += "- Regular messages go to the AI model in your current mode\n\n"
    help_text += "type any of these and i got you fr"
    return help_text


def _check_code_length(code: str) -> tuple[bool, str | None]:
    """Check code length. Returns (block_early, response_or_prefix).
    - >2000 chars: block, return static error
    - 1500-2000 chars: don't block, return conciseness prefix
    - <1500 chars: don't block, return None
    """
    length = len(code)
    if length > 2000:
        return True, (
            "bro that's a whole novel 💀 paste smaller chunks (under ~2000 chars) so i can "
            "actually give u a proper breakdown. split it by function or section and send one at a time fr"
        )
    if length >= 1500:
        return False, (
            "The following code is quite long. Give a concise explanation focusing on the "
            "main logic only, keep your response under 300 words:"
        )
    return False, None


def cmd_debug(code_or_error: str):
    """Handle /debug command."""
    code_or_error = (code_or_error or "").strip()
    if code_or_error.lower().startswith("/debug"):
        code_or_error = code_or_error[len("/debug"):].strip()

    if not code_or_error:
        return "yo paste the code after the command — like: /debug "

    should_block, extra = _check_code_length(code_or_error)
    if should_block:
        return extra

    prompt = (
        "You are debugging the following code. Identify every bug, error, or issue you can find. "
        "Explain what each bug is, why it causes a problem, and provide the fixed version of the full code:\n\n"
        f"{code_or_error}"
    )
    if extra:
        prompt = extra + "\n\n" + prompt

    return {
        "type": "llm",
        "command": "debug",
        "prompt": prompt
    }


def cmd_explaincode(code: str):
    """Handle /explaincode command."""
    code = (code or "").strip()
    if code.lower().startswith("/explaincode"):
        code = code[len("/explaincode"):].strip()

    if not code:
        return "yo paste the code after the command — like: /explaincode "

    should_block, extra = _check_code_length(code)
    if should_block:
        return extra

    prompt = (
        "Explain the following code in detail, line by line. "
        "Identify the language, explain what each part does, and summarise what the full code accomplishes:\n\n"
        f"{code}"
    )
    if extra:
        prompt = extra + "\n\n" + prompt

    return {
        "type": "llm",
        "command": "explaincode",
        "prompt": prompt
    }


def cmd_fpsboost(game: str = "") -> str:
    """Handle /fpsboost command."""
    fps_response = "**FPS Boost Guide — Get More Frames, Less L's 🔥**\n\n"
    if game.strip():
        fps_response += f"**For {game}:**\n\n"

    fps_response += "**Windows Settings (Free Performance):**\n"
    fps_response += "- Turn on Game Mode in Windows Settings (search 'game mode')\n"
    fps_response += "- Enable Hardware-accelerated GPU scheduling in NVIDIA/AMD control panel\n"
    fps_response += "- Set power plan to High Performance (search 'power options')\n"
    fps_response += "- Turn off Xbox Game Bar and Game DVR (Settings > Gaming)\n"
    fps_response += "- Disable fullscreen optimizations for the game (right-click exe > Properties > Compatibility)\n\n"

    fps_response += "**In-Game Settings (Biggest Gains Here):**\n"
    fps_response += "- **Always use fullscreen, never borderless** — borderless tanks fps on some games\n"
    fps_response += "- Cap FPS just below your monitor refresh rate (e.g. 143 cap on 144Hz)\n"
    fps_response += "- **Lower shadows and post-processing first** — these kill fps the most\n"
    fps_response += "- Turn off v-sync unless you have screen tear (G-Sync/Freesync fixes this)\n"
    fps_response += "- Reduce anti-aliasing to FXAA or off, MSAA is fps death\n"
    fps_response += "- Drop texture quality to medium if you're struggling\n\n"

    fps_response += "**GPU Drivers & Software:**\n"
    fps_response += "- Keep drivers updated (NVIDIA GeForce Experience or AMD Adrenalin)\n"
    fps_response += "- Use DDU to clean install drivers if having issues (google 'DDU')\n"
    fps_response += "- Enable G-Sync/Freesync in monitor settings for smoother frames\n\n"

    fps_response += "**Network (For Online Games):**\n"
    fps_response += "- Use ethernet, not wifi — massive difference for latency\n"
    fps_response += "- Flush DNS: open cmd as admin, type 'ipconfig /flushdns'\n"
    fps_response += "- Close background downloads and streaming\n\n"

    fps_response += "**Pro Tips:**\n"
    fps_response += "- Monitor temps with MSI Afterburner — don't let GPU hit 80C+\n"
    fps_response += "- Defrag your SSD monthly (built-in Windows tool)\n"
    fps_response += "- If still lagging, check for CPU bottleneck in Task Manager during gameplay\n"
    fps_response += "- Overclock GPU only if you know what you're doing (risky)\n\n"

    fps_response += "These should get you 20-50% more fps depending on your setup fr. Test in a benchmark scene!"
    return fps_response


def cmd_pcspecs() -> str:
    """Handle /pcspecs command."""
    specs_response = "aight lemme break down what u actually need for a gaming PC, no cap 🔥\n\n"

    specs_response += "## 💸 Budget Build (~$500-600) — 1080p 60-144fps\n"
    specs_response += "- **GPU:** RTX 3060 12GB or RX 6600 8GB — still slap hard for 1080p fr\n"
    specs_response += "- **CPU:** Ryzen 5 5600 or Intel i5-12400F — both goated value, either works\n"
    specs_response += "- **RAM:** 16GB DDR4 3200MHz dual channel — single stick is a crime, always 2 sticks\n"
    specs_response += "- **Storage:** 500GB NVMe SSD for OS + games, extra HDD if u need more space\n"
    specs_response += "- **PSU:** 550W 80+ Bronze minimum — don't buy a no-brand PSU unless u want a fire hazard ngl\n"
    specs_response += "- **Motherboard:** B550 for Ryzen, B660 for Intel — don't overspend here\n"
    specs_response += "- **Cooling:** stock cooler is fine for these CPUs, any mid tower with decent airflow\n"
    specs_response += "- **Hits well on:** Valorant, CS2, Minecraft, older AAA titles on medium-high settings\n\n"

    specs_response += "## ⚡ Mid Range Build (~$900-1200) — 1440p high fps / 1080p ultra\n"
    specs_response += "- **GPU:** RTX 4070 or RX 7700 XT — massive W for 1440p, handles everything on high\n"
    specs_response += "- **CPU:** Ryzen 5 7600X or i5-13600K — the 13600K is lowkey one of the best gaming CPUs rn\n"
    specs_response += "- **RAM:** 32GB DDR5 (AM5/Intel 13th gen) or DDR4 3600MHz CL16 — 32GB is the sweet spot now\n"
    specs_response += "- **Storage:** 1TB NVMe Gen4 SSD — load times are actually insane on these\n"
    specs_response += "- **PSU:** 650-750W 80+ Gold — go Gold here, efficiency matters at this level\n"
    specs_response += "- **Cooling:** 240mm AIO or Deepcool AK620 air cooler\n"
    specs_response += "- **Hits well on:** Warzone, Cyberpunk, Fortnite max frames, everything on high-ultra easy\n\n"

    specs_response += "## 👑 High End Build (~$1800-2500) — 4K / 1440p 165fps+ / streaming too\n"
    specs_response += "- **GPU:** RTX 4080 Super or RX 7900 XTX — straight up goated, 4K 60+ on literally anything\n"
    specs_response += "- **CPU:** Ryzen 9 7900X or i9-14900K — bussin for gaming + streaming simultaneously\n"
    specs_response += "- **RAM:** 32-64GB DDR5 6000MHz — 6000MHz is the sweet spot for Ryzen 7000 specifically\n"
    specs_response += "- **Storage:** 2TB NVMe Gen4 + extra SSD for game library — no HDD at this level pls\n"
    specs_response += "- **PSU:** 850W-1000W 80+ Gold/Platinum — the 4080 Super needs headroom\n"
    specs_response += "- **Cooling:** 360mm AIO, proper airflow case\n"
    specs_response += "- **Hits well on:** 4K everything, VR, AAA day one releases maxed, flight sims, no sweat\n\n"

    specs_response += "## 🔑 What actually matters (ppl sleep on these)\n"
    specs_response += "- **GPU is king** — spend 35-40% of budget on GPU, it's the #1 factor for fps no cap\n"
    specs_response += "- **RAM speed** — enable XMP/EXPO in BIOS or ur RAM is probably running at 2133MHz by default, free performance\n"
    specs_response += "- **Monitor refresh rate** — 144Hz makes a budget build feel faster than 60Hz on an expensive one fr\n"
    specs_response += "- **NVMe over HDD** — game load times and open world stutters are dramatically better on SSD\n"
    specs_response += "- **PSU quality** — bad PSU can kill ur whole build, stick with Corsair/Seasonic/EVGA\n"
    specs_response += "- **Dual channel RAM** — 2x8GB stomps 1x16GB, same GB but noticeably faster\n"
    specs_response += "- **Thermals** — reapply thermal paste every 2-3 years, clean dust filters regularly, ur fps will thank u\n\n"

    specs_response += "## 🖥️ Monitor to pair with ur build\n"
    specs_response += "- **Budget:** 1080p 144Hz IPS — sweet spot, loads of options under $150\n"
    specs_response += "- **Mid range:** 1440p 165Hz IPS — the upgrade that actually changes how games feel\n"
    specs_response += "- **High end:** 4K 144Hz OLED if budget allows — genuinely insane picture quality fr\n\n"

    specs_response += "## ❌ Common L's to avoid\n"
    specs_response += "- Buying i9/Ryzen 9 but pairing with a mid GPU — GPU first always, CPU bottleneck is rare in gaming\n"
    specs_response += "- Getting 8GB RAM in 2024 — mid at best, some games barely run\n"
    specs_response += "- Skipping the SSD — HDD gaming in 2024 is a genuine L\n"
    specs_response += "- Buying RGB everything and forgetting airflow — pretty case with bad thermals = throttled fps\n"
    specs_response += "- Not enabling XMP/EXPO in BIOS after building — ur RAM is running slow and u don't even know it\n\n"

    specs_response += "lmk what budget ur working with and i'll help u narrow down a specific build fr 🔥"
    return specs_response


def cmd_reset() -> str:
    """Handle /reset command."""
    return "Conversation reset. History cleared."


def get_command_suggestions(partial_command: str) -> list[str]:
    """Get command suggestions based on partial input."""
    if not partial_command or not partial_command.startswith("/"):
        return []
    
    partial = partial_command[1:].lower().strip()
    return [cmd for cmd in COMMANDS.keys() if cmd.startswith(partial)]
