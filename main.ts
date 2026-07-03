import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";
import { RadialMenu } from "./RadialMenu";

interface ExcalidrawStylusRadialSettings {
  enableDebug: boolean;
}

const DEFAULT_SETTINGS: ExcalidrawStylusRadialSettings = {
  enableDebug: false
};

export default class ExcalidrawStylusRadialPlugin extends Plugin {
  public settings: ExcalidrawStylusRadialSettings = DEFAULT_SETTINGS;
  private activeMenu: RadialMenu | null = null;
  private lastPenButtonDownTime = 0;

  async onload() {
    console.log("Loading Excalidraw Stylus Radial Plugin");
    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new ExcalidrawStylusRadialSettingTab(this.app, this));

    // Using capture: true to intercept the events before the Excalidraw canvas handles them.
    this.registerDomEvent(
      document,
      "pointerdown",
      this.handlePointerDown,
      { capture: true }
    );

    this.registerDomEvent(
      document,
      "pointerup",
      this.handlePointerUp,
      { capture: true }
    );
    
    this.registerDomEvent(
      document,
      "contextmenu",
      this.handleContextMenu,
      { capture: true }
    );
  }

  onunload() {
    console.log("Unloading Excalidraw Stylus Radial Plugin");
    this.closeActiveMenu();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (this.settings.enableDebug && e.pointerType === "pen") {
      new Notice(`DOWN: btn=${e.button} btns=${e.buttons} pres=${e.pressure}`);
    }

    // Only target EMR stylus inputs
    if (e.pointerType !== "pen") return;

    // Detect S Pen side button click:
    // button === 2: standard secondary/right click
    // button === 5: eraser/alternate pen button (often fired by S Pen)
    // buttons === 2: active bitmask indicating secondary click
    const isSPenButton = e.button === 2 || e.button === 5 || e.buttons === 2;
    if (!isSPenButton) return;

    const target = e.target as HTMLElement;
    // Check if the gesture occurred inside an Excalidraw canvas leaf
    const isInsideExcalidraw = !!target.closest(
      ".excalidraw-container, .workspace-leaf-content[data-type=\"excalidraw\"]"
    );

    if (!isInsideExcalidraw) return;

    this.lastPenButtonDownTime = Date.now();

    e.preventDefault();
    e.stopPropagation();

    this.openRadialMenu(e.clientX, e.clientY, target);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.settings.enableDebug && e.pointerType === "pen") {
      new Notice(`UP: btn=${e.button} btns=${e.buttons} pres=${e.pressure}`);
    }

    if (e.pointerType !== "pen") return;

    const isSPenButton = e.button === 2 || e.button === 5 || e.buttons === 2;
    if (!isSPenButton) return;

    const target = e.target as HTMLElement;
    const isInsideExcalidraw = !!target.closest(
      ".excalidraw-container, .workspace-leaf-content[data-type=\"excalidraw\"]"
    );

    if (isInsideExcalidraw) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInsideExcalidraw = !!target.closest(
      ".excalidraw-container, .workspace-leaf-content[data-type=\"excalidraw\"]"
    );

    if (!isInsideExcalidraw) return;

    const pe = e as PointerEvent;
    const pointerType = pe.pointerType;

    if (this.settings.enableDebug) {
      new Notice(`CTX: type=${pointerType} btn=${e.button} btns=${pe.buttons}`);
    }

    // Android WebViews fire contextmenu with empty pointerType when S Pen button is pressed and tapped.
    // We check if pointerType is falsy/empty, if we had a recent stylus button pointerdown,
    // or if the browser did pass pen pointerType details with secondary buttons.
    const isSPenButtonTap = !pointerType || pointerType === "";
    const isRecentSPen = (Date.now() - this.lastPenButtonDownTime) < 1000;
    const isPen = pointerType === "pen" && (e.button === 2 || e.button === 5);

    if (isSPenButtonTap || isRecentSPen || isPen) {
      e.preventDefault();
      e.stopPropagation();

      // Only launch the menu if it wasn't already triggered by pointerdown recently
      if (!isRecentSPen) {
        this.openRadialMenu(e.clientX, e.clientY, target);
      }
    }
  };

  private openRadialMenu(x: number, y: number, target: HTMLElement) {
    this.closeActiveMenu();
    this.activeMenu = new RadialMenu(this, () => {
      this.activeMenu = null;
    });
    this.activeMenu.open(x, y, target);
  }

  private closeActiveMenu() {
    if (this.activeMenu) {
      this.activeMenu.close();
      this.activeMenu = null;
    }
  }
}

class ExcalidrawStylusRadialSettingTab extends PluginSettingTab {
  plugin: ExcalidrawStylusRadialPlugin;

  constructor(app: App, plugin: ExcalidrawStylusRadialPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Excalidraw Stylus Radial Settings" });

    new Setting(containerEl)
      .setName("Enable Debug Mode")
      .setDesc("Show debug Notice toasts on screen for pointer events, buttons, tool switching, and actions.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableDebug)
          .onChange(async (value) => {
            this.plugin.settings.enableDebug = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
