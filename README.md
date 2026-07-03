# Excalidraw Stylus Radial

A vibe coded Obsidian plugin I made for my personal use. It provides a floating radial menu for Excalidraw drawings, designed specifically for EMR stylus buttons (such as the Samsung S Pen side button).

## Features

- Floating Radial Menu: Triggers exactly where you press the stylus button (on tap).
- Tool Switching: Fast switching to Pen, Eraser, Move/Pan, Select, and Rectangle.
- History Actions: Execute Undo and Redo operations directly from the menu.

## Installation

### Manual Installation

1. Build the plugin files locally.
2. Create a folder named `obsidian-excalidraw-stylus-radial` in your Obsidian vault under `.obsidian/plugins/`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Enable the plugin in the Obsidian settings under Community Plugins.

## Development

### Prerequisites

- Node.js installed on your machine.
- npm packages installed.

### Build and Run

1. Clone the repository and navigate into it.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (watches for changes and rebuilds automatically):
   ```bash
   npm run dev
   ```
4. Build the production version:
   ```bash
   npm run build
   ```

## License

This project is licensed under the MIT License.
