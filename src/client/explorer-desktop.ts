/**
 * ============================================================================
 * MYBOORU FILE EXPLORER - DESKTOP UX ENGINE
 * ============================================================================
 * Provides rich desktop file manager capabilities:
 * - Multi-selection (Click, Ctrl+Click, Shift+Click, Ctrl+A, Escape)
 * - Rubber-band / Marquee selection box
 * - Native keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V, Delete/Backspace, F2, Enter)
 * - Multi-item HTML5 Drag-and-Drop (into folders and breadcrumb drop targets)
 * - In-page modals for New Folder, Rename, and Batch Deletion
 * - HTMX friendly (re-initializes on htmx:afterSwap)
 */

interface ClipboardData {
  action: "cut" | "copy";
  items: Array<{ type: "file" | "folder"; id: number; name: string; postId?: number }>;
}

class ExplorerDesktopManager {
  private selectedKeys: Set<string> = new Set();
  private lastAnchorKey: string | null = null;
  private isMarqueeActive: boolean = false;
  private marqueeEl: HTMLElement | null = null;
  private dragGhostEl: HTMLElement | null = null;
  private draggedPayload: ClipboardData | null = null;

  constructor() {
    this.init();
  }

  public init() {
    this.updateClipboardBadge();
    this.bindEvents();
    this.syncCutStyles();
  }

  private isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
  }

  private getAllItemElements(): HTMLElement[] {
    const container = document.getElementById("explorer-items-container");
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(".explorer-item"));
  }

  private getItemKey(el: HTMLElement): string {
    const type = el.getAttribute("data-type") || "file";
    const id = el.getAttribute("data-id") || el.getAttribute("data-item-id") || "0";
    return `${type}:${id}`;
  }

  private getItemData(el: HTMLElement): { type: "file" | "folder"; id: number; name: string; postId?: number } {
    const type = (el.getAttribute("data-type") || "file") as "file" | "folder";
    const id = parseInt(el.getAttribute("data-id") || el.getAttribute("data-item-id") || "0", 10);
    const name = el.getAttribute("data-name") || "";
    const postIdStr = el.getAttribute("data-post-id");
    const postId = postIdStr ? parseInt(postIdStr, 10) : undefined;
    return { type, id, name, postId };
  }

  // ==========================================================================
  // SELECTION HANDLING
  // ==========================================================================

  public selectItem(key: string, clearOthers: boolean = true) {
    if (clearOthers) {
      this.selectedKeys.clear();
    }
    this.selectedKeys.add(key);
    this.lastAnchorKey = key;
    this.updateVisualSelection();
  }

  public toggleItem(key: string) {
    if (this.selectedKeys.has(key)) {
      this.selectedKeys.delete(key);
    } else {
      this.selectedKeys.add(key);
    }
    this.lastAnchorKey = key;
    this.updateVisualSelection();
  }

  public selectRange(targetKey: string, keepExisting: boolean = false) {
    const items = this.getAllItemElements();
    if (items.length === 0) return;

    if (!this.lastAnchorKey) {
      this.selectItem(targetKey, !keepExisting);
      return;
    }

    const anchorIdx = items.findIndex(el => this.getItemKey(el) === this.lastAnchorKey);
    const targetIdx = items.findIndex(el => this.getItemKey(el) === targetKey);

    if (anchorIdx === -1 || targetIdx === -1) {
      this.selectItem(targetKey, !keepExisting);
      return;
    }

    if (!keepExisting) {
      this.selectedKeys.clear();
    }

    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);

    for (let i = start; i <= end; i++) {
      this.selectedKeys.add(this.getItemKey(items[i]!));
    }

    this.updateVisualSelection();
  }

  public selectAll() {
    const items = this.getAllItemElements();
    this.selectedKeys.clear();
    for (const item of items) {
      this.selectedKeys.add(this.getItemKey(item));
    }
    if (items.length > 0) {
      this.lastAnchorKey = this.getItemKey(items[0]!);
    }
    this.updateVisualSelection();
  }

  public clearSelection() {
    this.selectedKeys.clear();
    this.lastAnchorKey = null;
    this.updateVisualSelection();
  }

  private updateVisualSelection() {
    const items = this.getAllItemElements();
    for (const item of items) {
      const key = this.getItemKey(item);
      if (this.selectedKeys.has(key)) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    }

    // Update Toolbar Button Labels & Disabled States
    const count = this.selectedKeys.size;
    const cutBtn = document.getElementById("explorer-cut-btn");
    const copyBtn = document.getElementById("explorer-copy-btn");
    const renameBtn = document.getElementById("explorer-rename-btn");
    const deleteBtn = document.getElementById("explorer-delete-btn");

    if (cutBtn) cutBtn.textContent = count > 1 ? `✂️ Cut (${count})` : "✂️ Cut";
    if (copyBtn) copyBtn.textContent = count > 1 ? `📋 Copy (${count})` : "📋 Copy";
    if (renameBtn) {
      (renameBtn as HTMLButtonElement).disabled = count !== 1;
      renameBtn.style.opacity = count === 1 ? "1" : "0.5";
    }
    if (deleteBtn) {
      deleteBtn.textContent = count > 1 ? `🗑️ Remove (${count})` : "🗑️ Remove";
      (deleteBtn as HTMLButtonElement).disabled = count === 0;
      deleteBtn.style.opacity = count > 0 ? "1" : "0.5";
    }
  }

  // ==========================================================================
  // CLIPBOARD OPERATIONS (CUT, COPY, PASTE)
  // ==========================================================================

  public cutSelection() {
    if (this.selectedKeys.size === 0) return;

    const items = this.getSelectedItemsData();
    const clip: ClipboardData = { action: "cut", items };
    sessionStorage.setItem("mybooru_explorer_clipboard", JSON.stringify(clip));

    this.updateClipboardBadge();
    this.syncCutStyles();
  }

  public copySelection() {
    if (this.selectedKeys.size === 0) return;

    const items = this.getSelectedItemsData();
    const clip: ClipboardData = { action: "copy", items };
    sessionStorage.setItem("mybooru_explorer_clipboard", JSON.stringify(clip));

    this.updateClipboardBadge();
    this.syncCutStyles();
  }

  public async paste(targetDirId?: number) {
    const raw = sessionStorage.getItem("mybooru_explorer_clipboard");
    if (!raw) return;

    let clip: ClipboardData;
    try {
      clip = JSON.parse(raw);
    } catch {
      return;
    }

    if (!clip.items || clip.items.length === 0) return;

    const currentDir = targetDirId || parseInt(document.getElementById("explorer-meta")?.getAttribute("data-current-dir") || "1", 10);
    const itemIds = clip.items.filter(i => i.type === "file").map(i => i.id);
    const folderIds = clip.items.filter(i => i.type === "folder").map(i => i.id);

    try {
      const res = await fetch("/explorer/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: clip.action,
          itemIds,
          folderIds,
          targetDirId: currentDir
        })
      });

      if (res.ok) {
        if (clip.action === "cut") {
          sessionStorage.removeItem("mybooru_explorer_clipboard");
        }
        this.reloadView();
      } else {
        const msg = await res.text();
        alert(`Paste failed: ${msg}`);
      }
    } catch (err: any) {
      alert(`Paste error: ${err.message}`);
    }
  }

  private getSelectedItemsData(): Array<{ type: "file" | "folder"; id: number; name: string; postId?: number }> {
    const items = this.getAllItemElements();
    const result: Array<{ type: "file" | "folder"; id: number; name: string; postId?: number }> = [];

    for (const item of items) {
      const key = this.getItemKey(item);
      if (this.selectedKeys.has(key)) {
        result.push(this.getItemData(item));
      }
    }
    return result;
  }

  private updateClipboardBadge() {
    try {
      const raw = sessionStorage.getItem("mybooru_explorer_clipboard");
      const badge = document.getElementById("clipboard-badge");
      if (!badge) return;

      if (raw) {
        const clip = JSON.parse(raw) as ClipboardData;
        if (clip.items && clip.items.length > 0) {
          badge.textContent = `(${clip.items.length} ${clip.action})`;
          badge.style.display = "inline";
          return;
        }
      }
      badge.style.display = "none";
    } catch {}
  }

  private syncCutStyles() {
    const items = this.getAllItemElements();
    for (const item of items) {
      item.classList.remove("clipboard-cut");
    }

    try {
      const raw = sessionStorage.getItem("mybooru_explorer_clipboard");
      if (!raw) return;
      const clip = JSON.parse(raw) as ClipboardData;
      if (clip.action !== "cut" || !clip.items) return;

      const cutKeys = new Set(clip.items.map(i => `${i.type}:${i.id}`));
      for (const item of items) {
        if (cutKeys.has(this.getItemKey(item))) {
          item.classList.add("clipboard-cut");
        }
      }
    } catch {}
  }

  // ==========================================================================
  // IN-PAGE MODALS (NEW FOLDER, RENAME, CONFIRM DELETE)
  // ==========================================================================

  public showNewFolderModal() {
    const modal = document.getElementById("modal-new-folder");
    const input = document.getElementById("new-folder-name-input") as HTMLInputElement | null;
    if (!modal || !input) return;

    input.value = "New Folder";
    modal.classList.add("visible");
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  public showRenameModal() {
    if (this.selectedKeys.size !== 1) return;
    const selected = this.getSelectedItemsData()[0];
    if (!selected) return;

    const modal = document.getElementById("modal-rename");
    const input = document.getElementById("rename-input") as HTMLInputElement | null;
    const typeLabel = document.getElementById("rename-type-label");
    if (!modal || !input) return;

    if (typeLabel) typeLabel.textContent = selected.type === "folder" ? "Folder" : "File";
    input.value = selected.name;
    modal.setAttribute("data-target-type", selected.type);
    modal.setAttribute("data-target-id", selected.id.toString());
    modal.classList.add("visible");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  public showDeleteConfirmModal() {
    if (this.selectedKeys.size === 0) return;
    const selected = this.getSelectedItemsData();
    const modal = document.getElementById("modal-confirm-delete");
    const message = document.getElementById("confirm-delete-message");
    if (!modal || !message) return;

    const folderCount = selected.filter(i => i.type === "folder").length;
    const fileCount = selected.filter(i => i.type === "file").length;

    if (selected.length === 1) {
      const item = selected[0]!;
      if (item.type === "folder") {
        message.textContent = `Are you sure you want to delete the folder "${item.name}" and all subfolders? Media files inside will not be deleted.`;
      } else {
        message.textContent = `Remove "${item.name}" from this directory? The original media post will not be deleted.`;
      }
    } else {
      const parts: string[] = [];
      if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? "s" : ""}`);
      if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? "s" : ""}`);
      message.textContent = `Remove/delete ${parts.join(" and ")}? (Original media posts will not be deleted).`;
    }

    modal.classList.add("visible");
  }

  public hideAllModals() {
    document.querySelectorAll(".explorer-modal-backdrop.visible").forEach(m => m.classList.remove("visible"));
  }

  public async submitNewFolder() {
    const input = document.getElementById("new-folder-name-input") as HTMLInputElement | null;
    if (!input || !input.value.trim()) return;

    const currentDir = document.getElementById("explorer-meta")?.getAttribute("data-current-dir") || "1";
    const name = input.value.trim();
    const form = new FormData();
    form.append("parent_id", currentDir);
    form.append("name", name);

    this.hideAllModals();

    try {
      const res = await fetch("/explorer/folders", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json() as any;
        const folder = data.folder;
        this.insertNewFolderToDOM(folder);
      } else {
        alert(`Error: ${await res.text()}`);
      }
    } catch (err: any) {
      alert(`Error creating folder: ${err.message}`);
    }
  }

  private insertNewFolderToDOM(folder: { id: number; name: string }) {
    const emptyState = document.querySelector(".explorer-empty-state");
    if (emptyState) {
      this.reloadView();
      return;
    }

    const currentUrl = new URL(window.location.href);
    const view = currentUrl.searchParams.get("view") || "grid";
    const sort = currentUrl.searchParams.get("sort") || "name";

    const container = document.getElementById("explorer-items-container");
    if (!container) return;

    if (view === "grid") {
      const folderDiv = document.createElement("div");
      folderDiv.className = "explorer-item folder-item";
      folderDiv.setAttribute("data-type", "folder");
      folderDiv.setAttribute("data-id", folder.id.toString());
      folderDiv.setAttribute("data-name", folder.name);
      folderDiv.draggable = true;
      folderDiv.tabIndex = 0;
      folderDiv.innerHTML = `
        <div class="item-icon folder-icon">📁</div>
        <div class="item-name" title="${folder.name}">${folder.name}</div>
        <div class="item-meta">0 files</div>
      `;
      // Prepend to folders or before the first file item
      const firstFile = container.querySelector(".file-item");
      if (firstFile) {
        container.insertBefore(folderDiv, firstFile);
      } else {
        container.appendChild(folderDiv);
      }
    } else {
      const tr = document.createElement("tr");
      tr.className = "explorer-item folder-item";
      tr.setAttribute("data-type", "folder");
      tr.setAttribute("data-id", folder.id.toString());
      tr.setAttribute("data-name", folder.name);
      tr.draggable = true;
      tr.innerHTML = `
        <td class="text-center" style="font-size: 18px;">📁</td>
        <td class="font-bold">
          <a href="/explorer?dir=${folder.id}&view=${view}&sort=${sort}"
             hx-get="/explorer?dir=${folder.id}&view=${view}&sort=${sort}"
             hx-target="#explorer-content"
             hx-swap="outerHTML"
             hx-push-url="/explorer?dir=${folder.id}&view=${view}&sort=${sort}"
             data-dir-id="${folder.id}"
             class="breadcrumb-drop-target">
            ${folder.name}
          </a>
        </td>
        <td class="text-muted">Folder</td>
        <td class="text-muted">0 items</td>
        <td class="text-muted">${new Date().toLocaleDateString()}</td>
      `;
      const firstFile = container.querySelector(".file-item");
      if (firstFile) {
        container.insertBefore(tr, firstFile);
      } else {
        container.appendChild(tr);
      }
    }
  }

  public async submitRename() {
    const modal = document.getElementById("modal-rename");
    const input = document.getElementById("rename-input") as HTMLInputElement | null;
    if (!modal || !input || !input.value.trim()) return;

    const type = modal.getAttribute("data-target-type");
    const id = modal.getAttribute("data-target-id");
    if (!type || !id) return;
    const newName = input.value.trim();

    // Optimistically update the DOM element
    const currentContainer = document.getElementById("explorer-items-container");
    const el = currentContainer?.querySelector<HTMLElement>(
      type === "folder" ? `.folder-item[data-id="${id}"]` : `.file-item[data-item-id="${id}"]`
    );
    const oldName = el?.getAttribute("data-name") || "";

    if (el) {
      el.setAttribute("data-name", newName);
      const nameEl = el.querySelector(".item-name") || el.querySelector(".file-name-link");
      if (nameEl) {
        nameEl.textContent = newName;
        nameEl.setAttribute("title", newName);
      }
    }
    this.hideAllModals();

    const endpoint = type === "folder" ? `/explorer/folders/${id}/rename` : `/explorer/items/${id}/rename`;
    const form = new FormData();
    form.append("name", newName);

    try {
      const res = await fetch(endpoint, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      // Revert name on error
      if (el) {
        el.setAttribute("data-name", oldName);
        const nameEl = el.querySelector(".item-name") || el.querySelector(".file-name-link");
        if (nameEl) {
          nameEl.textContent = oldName;
          nameEl.setAttribute("title", oldName);
        }
      }
      alert(`Rename failed (name restored): ${err.message}`);
    }
  }

  public async submitBatchDelete() {
    const selected = this.getSelectedItemsData();
    if (selected.length === 0) return;

    const itemIds = selected.filter(i => i.type === "file").map(i => i.id);
    const folderIds = selected.filter(i => i.type === "folder").map(i => i.id);

    // Optimistically detach elements from DOM
    const elementsToRemove: Array<{ el: HTMLElement; parent: HTMLElement; next: Node | null }> = [];
    const currentContainer = document.getElementById("explorer-items-container");
    if (currentContainer) {
      for (const item of selected) {
        const el = currentContainer.querySelector<HTMLElement>(
          item.type === "folder" ? `.folder-item[data-id="${item.id}"]` : `.file-item[data-item-id="${item.id}"]`
        );
        if (el && el.parentElement) {
          elementsToRemove.push({ el, parent: el.parentElement, next: el.nextSibling });
        }
      }
    }

    for (const entry of elementsToRemove) {
      entry.el.remove();
    }
    this.selectedKeys.clear();
    this.hideAllModals();
    this.updateVisualSelection();

    try {
      const res = await fetch("/explorer/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, folderIds })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      // Rollback / Re-insert items
      for (const entry of elementsToRemove) {
        entry.parent.insertBefore(entry.el, entry.next);
      }
      this.updateVisualSelection();
      alert(`Delete failed (items restored): ${err.message}`);
    }
  }

  private reloadView() {
    const content = document.getElementById("explorer-content");
    if (content && (window as any).htmx) {
      // Refresh current directory through HTMX push or location reload
      const currentUrl = window.location.href;
      (window as any).htmx.ajax("GET", currentUrl, { target: "#explorer-content", swap: "outerHTML" });
    } else {
      window.location.reload();
    }
  }

  // ==========================================================================
  // EVENT BINDINGS (CLICK, KEYBOARD, MARQUEE, DRAG & DROP)
  // ==========================================================================

  private bindEvents() {
    // 1. Delegated Click for Selection
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore clicks inside modals
      if (target.closest(".explorer-modal")) return;

      // Backdrop click closes modal
      if (target.classList.contains("explorer-modal-backdrop")) {
        this.hideAllModals();
        return;
      }

      // Check if click was on an explorer item
      const item = target.closest(".explorer-item") as HTMLElement | null;
      if (item) {
        const key = this.getItemKey(item);
        if (e.ctrlKey || e.metaKey) {
          this.toggleItem(key);
        } else if (e.shiftKey) {
          this.selectRange(key, false);
        } else {
          this.selectItem(key, true);
        }
        return;
      }

      // Check if click was on empty background of explorer items
      const isContainer = target.id === "explorer-items-container" || target.closest("#explorer-items-container");
      const isToolbar = target.closest(".explorer-toolbar");
      const isBreadcrumb = target.closest(".explorer-breadcrumbs");

      if (isContainer && !isToolbar && !isBreadcrumb && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        this.clearSelection();
      }
    });

    // 2. Double-Click to Navigate
    document.addEventListener("dblclick", (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest(".explorer-item") as HTMLElement | null;
      if (!item) return;

      const data = this.getItemData(item);
      if (data.type === "folder") {
        const currentUrl = new URL(window.location.href);
        const view = currentUrl.searchParams.get("view") || "grid";
        const sort = currentUrl.searchParams.get("sort") || "name";
        const targetUrl = `/explorer?dir=${data.id}&view=${view}&sort=${sort}`;
        if ((window as any).htmx) {
          (window as any).htmx.ajax("GET", targetUrl, { target: "#explorer-content", swap: "outerHTML", pushUrl: true });
        } else {
          window.location.href = targetUrl;
        }
      } else if (data.postId) {
        window.location.href = `/post/${data.postId}`;
      }
    });

    // 3. Desktop Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      // Suppress if typing in an input
      if (this.isInputFocused()) {
        if (e.key === "Escape") {
          this.hideAllModals();
        }
        return;
      }

      const key = e.key.toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (key === "escape") {
        this.hideAllModals();
        this.clearSelection();
        return;
      }

      if (isCtrlOrMeta && key === "c") {
        e.preventDefault();
        this.cutSelection(); // will set action='copy' or 'cut'
        this.copySelection();
        return;
      }

      if (isCtrlOrMeta && key === "x") {
        e.preventDefault();
        this.cutSelection();
        return;
      }

      if (isCtrlOrMeta && key === "v") {
        e.preventDefault();
        this.paste();
        return;
      }

      if (isCtrlOrMeta && key === "a") {
        e.preventDefault();
        this.selectAll();
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (this.selectedKeys.size > 0) {
          e.preventDefault();
          this.showDeleteConfirmModal();
        }
        return;
      }

      if (key === "f2") {
        if (this.selectedKeys.size === 1) {
          e.preventDefault();
          this.showRenameModal();
        }
        return;
      }

      if (key === "enter") {
        if (this.selectedKeys.size === 1) {
          const selected = this.getSelectedItemsData()[0];
          if (selected) {
            e.preventDefault();
            if (selected.type === "folder") {
              const currentUrl = new URL(window.location.href);
              const view = currentUrl.searchParams.get("view") || "grid";
              const sort = currentUrl.searchParams.get("sort") || "name";
              window.location.href = `/explorer?dir=${selected.id}&view=${view}&sort=${sort}`;
            } else if (selected.postId) {
              window.location.href = `/post/${selected.postId}`;
            }
          }
        }
        return;
      }

      // Arrow Key Navigation
      if (key === "arrowright" || key === "arrowleft" || key === "arrowup" || key === "arrowdown") {
        this.handleArrowNavigation(e);
      }
    });

    // 4. Marquee (Rubber-band) Selection
    this.bindMarquee();

    // 5. HTML5 Drag and Drop
    this.bindDragAndDrop();

    // 6. HTMX Swap Handler
    document.addEventListener("htmx:afterSwap", (e: any) => {
      if (e.detail?.target?.id === "explorer-content") {
        this.clearSelection();
        this.updateClipboardBadge();
        this.syncCutStyles();
      }
    });
  }

  // ==========================================================================
  // ARROW KEY NAVIGATION
  // ==========================================================================

  private handleArrowNavigation(e: KeyboardEvent) {
    const items = this.getAllItemElements();
    if (items.length === 0) return;

    e.preventDefault();
    const key = e.key.toLowerCase();

    let currentIndex = -1;
    if (this.lastAnchorKey) {
      currentIndex = items.findIndex(el => this.getItemKey(el) === this.lastAnchorKey);
    }

    if (currentIndex === -1) {
      const firstKey = this.getItemKey(items[0]!);
      this.selectItem(firstKey, true);
      return;
    }

    let nextIndex = currentIndex;
    const isGrid = !document.querySelector(".explorer-list-table");

    if (key === "arrowright") {
      nextIndex = Math.min(items.length - 1, currentIndex + 1);
    } else if (key === "arrowleft") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (key === "arrowdown") {
      if (isGrid) {
        // Approximate column step in grid
        const cols = this.getGridColumnCount();
        nextIndex = Math.min(items.length - 1, currentIndex + cols);
      } else {
        nextIndex = Math.min(items.length - 1, currentIndex + 1);
      }
    } else if (key === "arrowup") {
      if (isGrid) {
        const cols = this.getGridColumnCount();
        nextIndex = Math.max(0, currentIndex - cols);
      } else {
        nextIndex = Math.max(0, currentIndex - 1);
      }
    }

    const nextEl = items[nextIndex];
    if (nextEl) {
      const nextKey = this.getItemKey(nextEl);
      if (e.shiftKey) {
        this.selectRange(nextKey, true);
      } else {
        this.selectItem(nextKey, true);
      }
      nextEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  private getGridColumnCount(): number {
    const container = document.getElementById("explorer-items-container");
    if (!container) return 1;
    const items = Array.from(container.querySelectorAll<HTMLElement>(".explorer-item"));
    if (items.length < 2) return 1;

    const firstTop = items[0]!.offsetTop;
    let count = 0;
    for (const item of items) {
      if (item.offsetTop === firstTop) count++;
      else break;
    }
    return Math.max(1, count);
  }

  // ==========================================================================
  // RUBBER-BAND MARQUEE SELECTION
  // ==========================================================================

  private bindMarquee() {
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    let cachedItemRects: Array<{ key: string; rect: DOMRect }> = [];

    document.addEventListener("mousedown", (e: MouseEvent) => {
      // Left mouse button only
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore if clicking on item, toolbar, breadcrumbs, or modals
      if (
        target.closest(".explorer-item") ||
        target.closest(".explorer-toolbar") ||
        target.closest(".explorer-breadcrumbs") ||
        target.closest(".explorer-modal") ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("select")
      ) {
        return;
      }

      const container = document.getElementById("explorer-items-container");
      if (!container || !container.contains(target)) return;

      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;
      this.isMarqueeActive = true;
      cachedItemRects = [];

      const onMouseMove = (moveEv: MouseEvent) => {
        if (!this.isMarqueeActive) return;

        const deltaX = moveEv.clientX - startX;
        const deltaY = moveEv.clientY - startY;

        if (!hasMoved && Math.hypot(deltaX, deltaY) > 5) {
          hasMoved = true;
          if (!moveEv.ctrlKey && !moveEv.metaKey && !moveEv.shiftKey) {
            this.selectedKeys.clear();
          }
          this.createMarqueeElement();
          // Cache item rects once on marquee start to eliminate layout thrashing
          cachedItemRects = this.getAllItemElements().map((item) => ({
            key: this.getItemKey(item),
            rect: item.getBoundingClientRect(),
          }));
        }

        if (hasMoved && this.marqueeEl) {
          const left = Math.min(startX, moveEv.clientX);
          const top = Math.min(startY, moveEv.clientY);
          const width = Math.abs(deltaX);
          const height = Math.abs(deltaY);

          this.marqueeEl.style.left = `${left}px`;
          this.marqueeEl.style.top = `${top}px`;
          this.marqueeEl.style.width = `${width}px`;
          this.marqueeEl.style.height = `${height}px`;

          const marqueeRect = {
            left,
            top,
            right: left + width,
            bottom: top + height,
          };

          for (const entry of cachedItemRects) {
            const rect = entry.rect;
            const intersects = !(
              rect.right < marqueeRect.left ||
              rect.left > marqueeRect.right ||
              rect.bottom < marqueeRect.top ||
              rect.top > marqueeRect.bottom
            );

            if (intersects) {
              this.selectedKeys.add(entry.key);
            } else if (!moveEv.ctrlKey && !moveEv.metaKey) {
              this.selectedKeys.delete(entry.key);
            }
          }
          this.updateVisualSelection();
        }
      };

      const onMouseUp = (upEv: MouseEvent) => {
        this.isMarqueeActive = false;
        cachedItemRects = [];
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (this.marqueeEl) {
          this.marqueeEl.remove();
          this.marqueeEl = null;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  private createMarqueeElement() {
    if (this.marqueeEl) this.marqueeEl.remove();
    this.marqueeEl = document.createElement("div");
    this.marqueeEl.className = "explorer-marquee";
    this.marqueeEl.style.position = "fixed";
    document.body.appendChild(this.marqueeEl);
  }

  // ==========================================================================
  // MULTI-ITEM HTML5 DRAG & DROP
  // ==========================================================================

  private bindDragAndDrop() {
    // 1. Drag Start on items
    document.addEventListener("dragstart", (e: DragEvent) => {
      const target = (e.target as HTMLElement).closest(".explorer-item") as HTMLElement | null;
      if (!target || !e.dataTransfer) return;

      const key = this.getItemKey(target);
      if (!this.selectedKeys.has(key)) {
        this.selectItem(key, true);
      }

      const selected = this.getSelectedItemsData();
      this.draggedPayload = { action: "cut", items: selected };

      // Set custom drag ghost image
      this.createDragGhost(selected.length);
      if (this.dragGhostEl) {
        e.dataTransfer.setDragImage(this.dragGhostEl, 20, 20);
      }

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/json", JSON.stringify(this.draggedPayload));
    });

    document.addEventListener("dragend", () => {
      this.draggedPayload = null;
      if (this.dragGhostEl) {
        this.dragGhostEl.remove();
        this.dragGhostEl = null;
      }
      document.querySelectorAll(".drag-target-hover").forEach(el => el.classList.remove("drag-target-hover"));
    });

    // 2. Drag Over Folders or Breadcrumb Links
    document.addEventListener("dragover", (e: DragEvent) => {
      const dropTarget = this.getValidDropTarget(e.target as HTMLElement);
      if (!dropTarget || !e.dataTransfer) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dropTarget.classList.add("drag-target-hover");
    });

    document.addEventListener("dragleave", (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("drag-target-hover")) {
        target.classList.remove("drag-target-hover");
      }
    });

    // 3. Drop on Folder or Breadcrumb
    document.addEventListener("drop", async (e: DragEvent) => {
      const dropTarget = this.getValidDropTarget(e.target as HTMLElement);
      if (!dropTarget) return;

      e.preventDefault();
      dropTarget.classList.remove("drag-target-hover");

      const targetDirId = parseInt(
        dropTarget.getAttribute("data-id") || dropTarget.getAttribute("data-dir-id") || "0",
        10
      );
      if (!targetDirId) return;

      let payload = this.draggedPayload;
      if (!payload && e.dataTransfer) {
        try {
          payload = JSON.parse(e.dataTransfer.getData("application/json"));
        } catch {}
      }

      if (!payload || !payload.items || payload.items.length === 0) return;

      const itemIds = payload.items.filter(i => i.type === "file").map(i => i.id);
      const folderIds = payload.items.filter(i => i.type === "folder").map(i => i.id);

      // Optimistically detach dragged elements from current directory view
      const elementsToRemove: Array<{ el: HTMLElement; parent: HTMLElement; next: Node | null }> = [];
      const currentContainer = document.getElementById("explorer-items-container");
      if (currentContainer) {
        for (const item of payload.items) {
          const el = currentContainer.querySelector<HTMLElement>(
            item.type === "folder" ? `.folder-item[data-id="${item.id}"]` : `.file-item[data-item-id="${item.id}"]`
          );
          if (el && el.parentElement) {
            elementsToRemove.push({ el, parent: el.parentElement, next: el.nextSibling });
          }
        }
      }

      for (const entry of elementsToRemove) {
        entry.el.remove();
        this.selectedKeys.delete(this.getItemKey(entry.el));
      }
      this.updateVisualSelection();

      // Optimistically increment badge on target folder if visible
      const isVisibleFolder = dropTarget.classList.contains("folder-item");
      const targetMeta = isVisibleFolder ? (dropTarget.querySelector(".item-meta") || dropTarget.querySelector("td:nth-child(4)")) : null;
      let prevMetaText = "";
      if (targetMeta) {
        prevMetaText = targetMeta.textContent || "";
        const fileMatch = prevMetaText.match(/(\d+)\s+file/);
        if (fileMatch) {
          const currentCount = parseInt(fileMatch[1]!, 10);
          const newCount = currentCount + itemIds.length;
          targetMeta.textContent = prevMetaText.replace(/\d+\s+file(s?)/, `${newCount} file${newCount === 1 ? "" : "s"}`);
        }
      }

      try {
        const res = await fetch("/explorer/paste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cut",
            itemIds,
            folderIds,
            targetDirId
          })
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }
      } catch (err: any) {
        // Rollback optimistic removal
        for (const entry of elementsToRemove) {
          entry.parent.insertBefore(entry.el, entry.next);
        }
        if (targetMeta && prevMetaText) {
          targetMeta.textContent = prevMetaText;
        }
        this.updateVisualSelection();
        alert(`Drop relocation failed (items restored): ${err.message}`);
      }
    });
  }

  private getValidDropTarget(el: HTMLElement | null): HTMLElement | null {
    if (!el) return null;

    // Check if target is a folder item in the grid/list
    const folderItem = el.closest(".folder-item") as HTMLElement | null;
    if (folderItem) {
      // Don't allow dropping items into themselves
      if (this.draggedPayload?.items.some(i => i.type === "folder" && i.id.toString() === folderItem.getAttribute("data-id"))) {
        return null;
      }
      return folderItem;
    }

    // Check if target is a breadcrumb link
    const breadcrumb = el.closest(".breadcrumb-drop-target") as HTMLElement | null;
    if (breadcrumb && breadcrumb.hasAttribute("data-dir-id")) {
      const breadcrumbDirId = breadcrumb.getAttribute("data-dir-id");
      const currentDirId = document.getElementById("explorer-meta")?.getAttribute("data-current-dir");
      // Don't drop into the currently active directory
      if (breadcrumbDirId === currentDirId) return null;
      return breadcrumb;
    }

    return null;
  }

  private createDragGhost(count: number) {
    if (this.dragGhostEl) this.dragGhostEl.remove();
    this.dragGhostEl = document.createElement("div");
    this.dragGhostEl.className = "explorer-drag-ghost";
    this.dragGhostEl.textContent = `📁 Moving ${count} item${count > 1 ? "s" : ""}`;
    document.body.appendChild(this.dragGhostEl);
  }
}

// Global initialization & window exports for inline action buttons
(function initDesktopExplorer() {
  const isTouchDevice =
    ("ontouchstart" in window) ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  // Still allow desktop shortcuts/drag if a touch device has a mouse/keyboard attached,
  // but ensure manager is instantiated once
  const manager = new ExplorerDesktopManager();

  // Export functions to window for toolbar buttons
  (window as any).showNewFolderModal = () => manager.showNewFolderModal();
  (window as any).explorerCutSelection = () => manager.cutSelection();
  (window as any).explorerCopySelection = () => manager.copySelection();
  (window as any).explorerPaste = () => manager.paste();
  (window as any).explorerRenameSelection = () => manager.showRenameModal();
  (window as any).explorerDeleteSelection = () => manager.showDeleteConfirmModal();
  (window as any).submitNewFolder = () => manager.submitNewFolder();
  (window as any).submitRename = () => manager.submitRename();
  (window as any).submitBatchDelete = () => manager.submitBatchDelete();
  (window as any).hideExplorerModals = () => manager.hideAllModals();
})();
