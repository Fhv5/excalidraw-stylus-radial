# Excalidraw Stylus Radial

A vibe coded Obsidian plugin I made for my personal use. It provides a floating radial menu for Excalidraw drawings, designed specifically for EMR stylus buttons (such as the Samsung S Pen side button).

## Features

- Floating Radial Menu: Triggers exactly where you press the stylus button (on tap).
- Tool & Shapes Selector: Fast switching to Pen, Eraser, Move/Pan, and Select. The "Shapes" button switches to the default Rectangle tool on click, or opens an adjacent sub-menu of shapes (Rectangle, Diamond, Ellipse, Arrow, Line) on long press, allowing you to drag your stylus to select a figure.
- Visual Distinction: Tools, clipboard actions (styled in blue), and history actions (smaller and muted) have clear visual distinctions to prevent confusion.
- History Actions: Execute Undo and Redo operations directly from the menu.
- Dynamic Copy and Paste: When elements are selected, a "Copy" button appears on the radial menu. When elements are copied (either via the menu or normal Ctrl+C), a "Paste" button appears to duplicate the elements with offset coordinates and preserved groupings/bindings.

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
