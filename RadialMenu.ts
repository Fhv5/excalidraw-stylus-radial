import { setIcon, Notice } from "obsidian";

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

export class RadialMenu {
  private container: HTMLDivElement | null = null;
  private wrapper: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private isOpen = false;
  private targetView: any = null;
  private app: any;

  constructor(
    private plugin: any,
    private onClose: () => void
  ) {
    this.app = plugin.app;
  }

  /**
   * Opens the radial menu at the specified screen coordinates (clientX, clientY).
   */
  public open(x: number, y: number, targetEl: HTMLElement) {
    if (this.isOpen) return;
    this.isOpen = true;

    // Resolve targeted Excalidraw view from the DOM element that was clicked
    this.targetView = this.resolveExcalidrawView(targetEl);

    // Create the master container to inject into document.body
    this.container = document.createElement("div");
    this.container.className = "excalidraw-stylus-radial-container";
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;

    // Close the menu if we click anywhere inside the container that is NOT an item
    this.container.addEventListener("pointerdown", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".excalidraw-stylus-radial-item")) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });

    // Overlay to capture clicks outside the menu and dismiss it
    this.overlay = document.createElement("div");
    this.overlay.className = "excalidraw-stylus-radial-overlay";
    this.container.appendChild(this.overlay);

    // Wrapper for placing menu items relative to center point
    this.wrapper = document.createElement("div");
    this.wrapper.className = "excalidraw-stylus-radial-wrapper";
    this.container.appendChild(this.wrapper);

    // Center icon/indicator
    const center = document.createElement("div");
    center.className = "excalidraw-stylus-radial-center";
    setIcon(center, "pen-tool"); // Lucide pen-tool icon
    this.wrapper.appendChild(center);

    // Dotted guideline ring
    const ring = document.createElement("div");
    ring.className = "excalidraw-stylus-radial-ring";
    this.wrapper.appendChild(ring);

    // Definition of the 7 radial buttons
    const items: RadialMenuItem[] = [
      {
        id: "freedraw",
        label: "Pen",
        icon: "pencil",
        action: () => this.executeExcalidrawTool("freedraw"),
      },
      {
        id: "eraser",
        label: "Eraser",
        icon: "eraser",
        action: () => this.executeExcalidrawTool("eraser"),
      },
      {
        id: "hand",
        label: "Move/Pan",
        icon: "hand",
        action: () => this.executeExcalidrawTool("hand"),
      },
      {
        id: "selection",
        label: "Select",
        icon: "mouse-pointer",
        action: () => this.executeExcalidrawTool("selection"),
      },
      {
        id: "rectangle",
        label: "Rectangle",
        icon: "square",
        action: () => this.executeExcalidrawTool("rectangle"),
      },
      {
        id: "undo",
        label: "Undo",
        icon: "undo-2",
        action: () => this.executeExcalidrawAction("undo"),
      },
      {
        id: "redo",
        label: "Redo",
        icon: "redo-2",
        action: () => this.executeExcalidrawAction("redo"),
      },
    ];

    items.forEach((item, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "excalidraw-stylus-radial-item";
      
      // Distribute items evenly around 360 degrees.
      // -90deg offset starts distribution at the very top (12 o'clock).
      const angle = (360 / items.length) * index - 90;
      itemEl.style.setProperty("--angle", `${angle}deg`);
      
      // Inject icon using Obsidian standard API helper
      setIcon(itemEl, item.icon);

      // Add label element
      const labelEl = document.createElement("span");
      labelEl.className = "excalidraw-stylus-radial-item-label";
      labelEl.innerText = item.label;
      itemEl.appendChild(labelEl);

      let labelTimeout: any = null;

      // Visual feedback states
      itemEl.addEventListener("pointerdown", (e) => {
        // Instant visual feedback (coloring the button)
        itemEl.classList.add("is-active");

        // Start timer to show the label only on long press (e.g., 500ms)
        if (labelTimeout) clearTimeout(labelTimeout);
        labelTimeout = setTimeout(() => {
          itemEl.classList.add("show-label");
        }, 500);
      });

      const clearActive = () => {
        itemEl.classList.remove("is-active");
        itemEl.classList.remove("show-label");
        if (labelTimeout) {
          clearTimeout(labelTimeout);
          labelTimeout = null;
        }
      };

      itemEl.addEventListener("pointerleave", clearActive);
      itemEl.addEventListener("pointercancel", clearActive);

      // Trigger selection on pointerup
      itemEl.addEventListener("pointerup", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearActive();
        item.action();
        if (item.id !== "undo" && item.id !== "redo") {
          this.close();
        }
      });

      this.wrapper!.appendChild(itemEl);
    });

    document.body.appendChild(this.container);

    // Request animation frames to ensure transition is rendered properly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.wrapper) {
          this.wrapper.classList.add("is-open");
        }
      });
    });
  }

  /**
   * Closes the radial menu with fade-out/scale-down transition.
   */
  public close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this.wrapper) {
      this.wrapper.classList.remove("is-open");
      
      const onTransitionEnd = () => {
        this.destroy();
      };
      
      this.wrapper.addEventListener("transitionend", onTransitionEnd, { once: true });
      
      // Fallback in case transitionend does not fire
      setTimeout(() => {
        if (this.isOpen === false && this.container) {
          this.destroy();
        }
      }, 300);
    } else {
      this.destroy();
    }
  }

  private destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.wrapper = null;
    this.overlay = null;
    this.onClose();
  }

  private resolveExcalidrawView(target: HTMLElement): any {
    try {
      // 1. Try finding by matching the DOM leaf element
      const leafEl = target.closest(".workspace-leaf");
      if (leafEl) {
        const leaves = this.app.workspace.getLeavesOfType("excalidraw");
        for (const leaf of leaves) {
          if ((leaf as any).containerEl === leafEl) {
            return leaf.view;
          }
        }
      }

      // 2. Fallback to active leaf in the workspace
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view && activeLeaf.view.getViewType() === "excalidraw") {
        return activeLeaf.view;
      }

      // 3. Fallback to the first Excalidraw leaf found
      const leaves = this.app.workspace.getLeavesOfType("excalidraw");
      if (leaves.length > 0) {
        return leaves[0].view;
      }
    } catch (err) {
      console.error("Failed to resolve Excalidraw view", err);
    }
    return null;
  }

  private executeExcalidrawTool(tool: string) {
    try {
      const ea = (window as any).ExcalidrawAutomate;
      if (ea) {
        // Direct view targeting
        if (this.targetView) {
          ea.setView(this.targetView);
        } else {
          ea.setView("active");
        }
        
        // Attempt to get the actual Excalidraw API via the resolved targetView first
        const api = this.targetView?.excalidrawAPI || this.targetView?.excalidrawRef?.current || ea.getExcalidrawAPI();

        if (api && typeof api.setActiveTool === "function") {
          api.setActiveTool({ type: tool });
          if (this.plugin.settings.enableDebug) {
            new Notice(`Switched to tool: ${tool}`);
          }
          return;
        }
        
        // Direct fallback (e.g. older versions or mock scripts)
        if (typeof ea.setActiveTool === "function") {
          ea.setActiveTool(tool);
          if (this.plugin.settings.enableDebug) {
            new Notice(`Switched to tool (direct): ${tool}`);
          }
          return;
        }
        
        new Notice("Error: setActiveTool function not found.");
      } else {
        new Notice("Error: ExcalidrawAutomate is not available on window.");
      }
    } catch (err) {
      console.error(`Failed to set active Excalidraw tool: ${tool}`, err);
      new Notice(`Failed to set active tool: ${err}`);
    }
  }

  private executeExcalidrawAction(action: string) {
    try {
      const ea = (window as any).ExcalidrawAutomate;
      if (ea) {
        // Direct view targeting
        if (this.targetView) {
          ea.setView(this.targetView);
        } else {
          ea.setView("active");
        }

        // Attempt to get the actual Excalidraw API via the resolved targetView first
        const api = this.targetView?.excalidrawAPI || this.targetView?.excalidrawRef?.current || ea.getExcalidrawAPI();
        
        // 1. Try history undo/redo directly on the native API (available in Excalidraw v0.15+)
        if (api && api.history && (typeof api.history.undo === "function" || typeof api.history.redo === "function")) {
          if (action === "undo" && typeof api.history.undo === "function") {
            api.history.undo();
          } else if (action === "redo" && typeof api.history.redo === "function") {
            api.history.redo();
          }
          if (this.plugin.settings.enableDebug) {
            new Notice(`Executed: ${action === "undo" ? "Undo" : "Redo"}`);
          }
          return;
        }

        // 2. Fallback: try actionManager on native API
        if (api && api.actionManager && typeof api.actionManager.executeAction === "function") {
          api.actionManager.executeAction(action);
          if (this.plugin.settings.enableDebug) {
            new Notice(`Executed action: ${action}`);
          }
          return;
        }

        // 3. Fallback: try instance actionManager
        if (typeof ea.getInstance === "function") {
          const instance = ea.getInstance();
          if (instance && typeof instance.getApp === "function") {
            const app = instance.getApp();
            if (app && app.actionManager && typeof app.actionManager.executeAction === "function") {
              app.actionManager.executeAction(action);
              if (this.plugin.settings.enableDebug) {
                new Notice(`Executed action (via instance): ${action}`);
              }
              return;
            }
          }
        }

        new Notice("Error: Action manager API is not accessible.");
      } else {
        new Notice("Error: ExcalidrawAutomate is not available on window.");
      }
    } catch (err) {
      console.error(`Failed to execute Excalidraw action: ${action}`, err);
      new Notice(`Failed to execute action: ${err}`);
    }
  }
}
