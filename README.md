# SillyTavern Context Meter

A minimalist, highly visual extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern) that tracks and displays your exact context token usage in real-time.

## Features

- **Segmented Visualizer**: Displays a dynamic, color-coded progress bar giving you an exact breakdown of how your context is currently being spent.
- **Hover Insights**: Hover over the progress bar segments to see the exact token numbers for:
    - 🔴 **System / Lorebook**: Tokens consumed by character definitions, world info, and global notes.
    - 🔵 **Chat History**: Tokens consumed by ongoing user and character chat history.
    - ⚪ **Free Space**: How many tokens are still available for new chat messages.
- **Zero Configuration**: Reads your context boundaries out of the box and automatically hooks into token calculations behind the scenes.

## Installation

### Via SillyTavern (Easy)
1. Open SillyTavern and open the Extensions panel (Plugin icon).
2. Click **Install Extension** and paste the URL of this repository:
   ```text
   https://github.com/okenjioxx/sillytavern-context-meter
   ```
3. Refresh SillyTavern.

### Manual
1. Navigate to your SillyTavern folder.
2. Open a terminal and browse to `public/scripts/extensions`.
3. Clone this repository:
   ```bash
   git clone https://github.com/okenjioxx/sillytavern-context-meter.git st-context-meter
   ```
4. Refresh SillyTavern.

## How it Works

The Context Meter tracks the `CHAT_COMPLETION_PROMPT_READY` events fired by SillyTavern during generation or dry-runs, and counts the tokens passed towards the current AI backend instance by utilizing the active tokenizer in SillyTavern.
