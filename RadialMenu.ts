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

    // Definition of the radial buttons
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
        id: "shapes",
        label: "Shapes",
        icon: "shapes",
        action: () => { },
      },
    ];

    // Check selection using ExcalidrawAutomate
    let hasSelection = false;
    const ea = (window as any).ExcalidrawAutomate;
    if (ea) {
      try {
        if (this.targetView) {
          ea.setView(this.targetView);
        } else {
          ea.setView("active");
        }
        const selected = ea.getViewSelectedElements();
        hasSelection = selected && selected.length > 0;
      } catch (err) {
        console.error("Failed to check selection", err);
      }
    }

    if (hasSelection) {
      items.push({
        id: "copy",
        label: "Copy",
        icon: "copy",
        action: () => this.executeCopy(),
      });
    }

    if (this.plugin.copiedElements && this.plugin.copiedElements.length > 0) {
      items.push({
        id: "paste",
        label: "Paste",
        icon: "clipboard",
        action: () => this.executePaste(),
      });
    }

    items.push(
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
      }
    );

    items.forEach((item, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "excalidraw-stylus-radial-item";

      // Add visual distinction classes
      if (item.id === "copy" || item.id === "paste") {
        itemEl.classList.add("is-clipboard");
      } else if (item.id === "undo" || item.id === "redo") {
        itemEl.classList.add("is-history");
      }

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

      const clearActive = () => {
        itemEl.classList.remove("is-active");
        itemEl.classList.remove("show-label");
        if (labelTimeout) {
          clearTimeout(labelTimeout);
          labelTimeout = null;
        }
      };

      if (item.id === "shapes") {
        let holdTimeout: any = null;
        let isHolding = false;
        let subMenuContainer: HTMLDivElement | null = null;
        let hoveredSubItem: HTMLDivElement | null = null;

        const handlePointerMove = (moveEvent: PointerEvent) => {
          if (!isHolding || !subMenuContainer) return;
          const elementUnderPointer = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement;
          const subItemEl = elementUnderPointer?.closest(".excalidraw-stylus-radial-subitem") as HTMLDivElement;

          const subItems = subMenuContainer.querySelectorAll(".excalidraw-stylus-radial-subitem");
          subItems.forEach((sub) => sub.classList.remove("is-hovered"));

          if (subItemEl) {
            subItemEl.classList.add("is-hovered");
            hoveredSubItem = subItemEl;
          } else {
            hoveredSubItem = null;
          }
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);

          if (holdTimeout) {
            clearTimeout(holdTimeout);
            holdTimeout = null;
          }

          clearActive();

          upEvent.preventDefault();
          upEvent.stopPropagation();

          if (isHolding) {
            if (hoveredSubItem) {
              const toolId = hoveredSubItem.getAttribute("data-tool-id");
              if (toolId) {
                this.executeExcalidrawTool(toolId);
              }
            } else {
              this.executeExcalidrawTool("rectangle");
            }
            if (subMenuContainer) {
              subMenuContainer.parentNode?.removeChild(subMenuContainer);
              subMenuContainer = null;
            }
            this.close();
          } else {
            // Quick tap: switch to rectangle
            this.executeExcalidrawTool("rectangle");
            this.close();
          }
        };

        itemEl.addEventListener("pointerdown", (e) => {
          itemEl.classList.add("is-active");

          if (labelTimeout) clearTimeout(labelTimeout);
          labelTimeout = setTimeout(() => {
            itemEl.classList.add("show-label");
          }, 500);

          isHolding = false;
          hoveredSubItem = null;
          if (holdTimeout) clearTimeout(holdTimeout);
          holdTimeout = setTimeout(() => {
            isHolding = true;
            subMenuContainer = this.createSubMenu(itemEl);
          }, 350);

          window.addEventListener("pointermove", handlePointerMove);
          window.addEventListener("pointerup", handlePointerUp);
        });

        itemEl.addEventListener("pointercancel", (e) => {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          if (holdTimeout) clearTimeout(holdTimeout);
          if (subMenuContainer) {
            subMenuContainer.parentNode?.removeChild(subMenuContainer);
            subMenuContainer = null;
          }
          clearActive();
        });
      } else {
        // Standard item handling using standard events (as it used to be)
        itemEl.addEventListener("pointerdown", (e) => {
          itemEl.classList.add("is-active");

          if (labelTimeout) clearTimeout(labelTimeout);
          labelTimeout = setTimeout(() => {
            itemEl.classList.add("show-label");
          }, 500);
        });

        itemEl.addEventListener("pointerleave", clearActive);
        itemEl.addEventListener("pointercancel", clearActive);

        itemEl.addEventListener("pointerup", (e) => {
          e.preventDefault();
          e.stopPropagation();
          clearActive();
          item.action();
          if (item.id !== "undo" && item.id !== "redo") {
            this.close();
          }
        });
      }

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

  private executeCopy() {
    try {
      const ea = (window as any).ExcalidrawAutomate;
      if (ea) {
        if (this.targetView) {
          ea.setView(this.targetView);
        } else {
          ea.setView("active");
        }
        const selected = ea.getViewSelectedElements();
        if (selected && selected.length > 0) {
          this.plugin.copiedElements = JSON.parse(JSON.stringify(selected));
          new Notice(`Copied ${selected.length} element(s)`);

          // Write to system clipboard in Excalidraw format
          const clipboardData = JSON.stringify({
            type: "excalidraw/clipboard",
            elements: selected,
            files: {}
          });
          navigator.clipboard.writeText(clipboardData).catch((err) => {
            console.warn("Could not write to system clipboard: ", err);
          });
        }
      }
    } catch (err) {
      console.error("Failed to copy", err);
      new Notice(`Failed to copy: ${err}`);
    }
  }

  private executePaste() {
    try {
      const copied = this.plugin.copiedElements;
      if (!copied || copied.length === 0) return;

      const ea = (window as any).ExcalidrawAutomate;
      if (!ea) {
        new Notice("ExcalidrawAutomate is not available");
        return;
      }

      ea.reset();
      if (this.targetView) {
        ea.setView(this.targetView);
      } else {
        ea.setView("active");
      }

      const generateId = () => Math.random().toString(36).substring(2, 12);

      const idMap = new Map<string, string>();
      copied.forEach((el: any) => {
        const newId = generateId();
        idMap.set(el.id, newId);
      });

      const pastedElements = copied.map((el: any) => {
        const cloned = JSON.parse(JSON.stringify(el));
        cloned.id = idMap.get(el.id);

        if (cloned.groupIds) {
          cloned.groupIds = cloned.groupIds.map((gId: string) => {
            if (!idMap.has(gId)) {
              idMap.set(gId, generateId());
            }
            return idMap.get(gId);
          });
        }

        if (cloned.boundElements) {
          cloned.boundElements = cloned.boundElements.map((bound: any) => {
            return {
              ...bound,
              id: idMap.get(bound.id) || bound.id
            };
          });
        }

        if (cloned.startBinding) {
          cloned.startBinding.elementId = idMap.get(cloned.startBinding.elementId) || cloned.startBinding.elementId;
        }
        if (cloned.endBinding) {
          cloned.endBinding.elementId = idMap.get(cloned.endBinding.elementId) || cloned.endBinding.elementId;
        }

        // Offset the pasted elements slightly so they don't cover the original elements exactly
        cloned.x += 20;
        cloned.y += 20;

        return cloned;
      });

      pastedElements.forEach((el: any) => {
        ea.elementsDict[el.id] = el;
      });

      ea.addElementsToView(false, true, true);
      new Notice(`Pasted ${pastedElements.length} element(s)`);
    } catch (err) {
      console.error("Failed to paste", err);
      new Notice(`Failed to paste: ${err}`);
    }
  }

  private createSubMenu(parentEl: HTMLElement): HTMLDivElement {
    const subContainer = document.createElement("div");
    subContainer.className = "excalidraw-stylus-radial-submenu-container";

    // We position it absolute relative to document.body, centered on the parent shapes button
    const parentRect = parentEl.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const centerX = parentRect.left + parentRect.width / 2 + scrollX;
    const centerY = parentRect.top + parentRect.height / 2 + scrollY;

    subContainer.style.left = `${centerX}px`;
    subContainer.style.top = `${centerY}px`;

    const subItems = [
      { id: "rectangle", label: "Rectangle", icon: "square" },
      { id: "diamond", label: "Diamond", icon: "diamond" },
      { id: "ellipse", label: "Ellipse", icon: "circle" },
      { id: "arrow", label: "Arrow", icon: "arrow-right" },
      { id: "line", label: "Line", icon: "minus" }
    ];

    subItems.forEach((item, index) => {
      const subEl = document.createElement("div");
      subEl.className = "excalidraw-stylus-radial-subitem";
      subEl.setAttribute("data-tool-id", item.id);

      const angle = (360 / subItems.length) * index - 90;
      subEl.style.setProperty("--angle", `${angle}deg`);

      setIcon(subEl, item.icon);

      const label = document.createElement("span");
      label.className = "excalidraw-stylus-radial-subitem-label";
      label.innerText = item.label;
      subEl.appendChild(label);

      subContainer.appendChild(subEl);
    });

    document.body.appendChild(subContainer);

    requestAnimationFrame(() => {
      subContainer.classList.add("is-open");
    });

    return subContainer;
  }
}
