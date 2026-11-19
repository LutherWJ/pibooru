import type { FC } from "hono/jsx";
import type { DirectoryItemWithPost } from "../db/schema";
import type { DirectoryWithStats } from "../models/Directory";

interface ExplorerProps {
  currentDir: { id: number; parent_id: number | null; name: string };
  breadcrumbs: Array<{ id: number; name: string }>;
  subdirectories: DirectoryWithStats[];
  items: DirectoryItemWithPost[];
  viewMode?: "grid" | "list";
  sortBy?: "name" | "date" | "size";
  highlightPostId?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const ExplorerContent: FC<ExplorerProps> = ({
  currentDir,
  breadcrumbs,
  subdirectories,
  items,
  viewMode = "grid",
  sortBy = "name",
  highlightPostId,
}) => {
  return (
    <div id="explorer-content" class="explorer-content-container">
      {/* Breadcrumb Navigation */}
      <nav class="explorer-breadcrumbs" aria-label="Breadcrumb">
        <ol>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <li key={crumb.id} class={isLast ? "breadcrumb-active" : ""}>
                {isLast ? (
                  <span>{crumb.name}</span>
                ) : (
                  <>
                    <a
                      href={`/explorer?dir=${crumb.id}&view=${viewMode}&sort=${sortBy}`}
                      hx-get={`/explorer?dir=${crumb.id}&view=${viewMode}&sort=${sortBy}`}
                      hx-target="#explorer-content"
                      hx-swap="outerHTML"
                      hx-push-url={`/explorer?dir=${crumb.id}&view=${viewMode}&sort=${sortBy}`}
                      data-dir-id={crumb.id}
                      class="breadcrumb-drop-target"
                    >
                      {crumb.name}
                    </a>
                    <span class="breadcrumb-separator">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Action Toolbar */}
      <div class="explorer-toolbar">
        <div class="toolbar-group">
          <button
            type="button"
            class="button toolbar-btn"
            id="explorer-new-folder-btn"
            title="Create New Folder"
            onclick="window.showNewFolderModal()"
          >
            📁+ New Folder
          </button>
          <button
            type="button"
            class="button toolbar-btn"
            id="explorer-cut-btn"
            title="Cut selected items"
            onclick="window.explorerCutSelection()"
          >
            ✂️ Cut
          </button>
          <button
            type="button"
            class="button toolbar-btn"
            id="explorer-copy-btn"
            title="Copy selected items"
            onclick="window.explorerCopySelection()"
          >
            📋 Copy
          </button>
          <button
            type="button"
            class="button toolbar-btn"
            id="explorer-paste-btn"
            title="Paste items into current directory"
            onclick="window.explorerPaste()"
          >
            📥 Paste <span id="clipboard-badge" class="clipboard-badge" style="display:none;">(0)</span>
          </button>
          <button
            type="button"
            class="button toolbar-btn"
            id="explorer-rename-btn"
            title="Rename selected item"
            onclick="window.explorerRenameSelection()"
          >
            ✏️ Rename
          </button>
          <button
            type="button"
            class="button toolbar-btn text-red"
            id="explorer-delete-btn"
            title="Remove from folder or delete directory"
            onclick="window.explorerDeleteSelection()"
          >
            🗑️ Remove
          </button>
        </div>

        <div class="toolbar-group">
          <div class="view-toggle">
            <a
              href={`/explorer?dir=${currentDir.id}&view=grid&sort=${sortBy}`}
              hx-get={`/explorer?dir=${currentDir.id}&view=grid&sort=${sortBy}`}
              hx-target="#explorer-content"
              hx-swap="outerHTML"
              hx-push-url={`/explorer?dir=${currentDir.id}&view=grid&sort=${sortBy}`}
              class={`button view-btn ${viewMode === "grid" ? "active" : ""}`}
              title="Grid View"
            >
              ⊞ Grid
            </a>
            <a
              href={`/explorer?dir=${currentDir.id}&view=list&sort=${sortBy}`}
              hx-get={`/explorer?dir=${currentDir.id}&view=list&sort=${sortBy}`}
              hx-target="#explorer-content"
              hx-swap="outerHTML"
              hx-push-url={`/explorer?dir=${currentDir.id}&view=list&sort=${sortBy}`}
              class={`button view-btn ${viewMode === "list" ? "active" : ""}`}
              title="List View"
            >
              ☰ List
            </a>
          </div>

          <select
            id="explorer-sort-select"
            class="explorer-sort-select"
            onchange={`
              const sort = this.value;
              window.location.href = '/explorer?dir=${currentDir.id}&view=${viewMode}&sort=' + sort;
            `}
          >
            <option value="name" selected={sortBy === "name"}>Sort by Name</option>
            <option value="date" selected={sortBy === "date"}>Sort by Date</option>
            <option value="size" selected={sortBy === "size"}>Sort by Size</option>
          </select>
        </div>
      </div>

      {/* Directory Contents */}
      {subdirectories.length === 0 && items.length === 0 ? (
        <div class="explorer-empty-state">
          <div style="font-size: 40px; margin-bottom: 12px;">📁</div>
          <p style="font-size: 16px; font-weight: bold; margin-bottom: 6px;">This directory is empty.</p>
          <p style="color: #94a3b8; font-size: 13px;">
            Create subfolders using <strong>New Folder</strong>, or copy/move media files into this folder.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div class="explorer-grid" id="explorer-items-container">
          {/* Subdirectories in Grid */}
          {subdirectories.map((dir) => (
            <div
              key={`dir-${dir.id}`}
              class="explorer-item folder-item"
              data-type="folder"
              data-id={dir.id}
              data-name={dir.name}
              draggable={true}
              tabIndex={0}
            >
              <div class="item-icon folder-icon">📁</div>
              <div class="item-name" title={dir.name}>
                {dir.name}
              </div>
              <div class="item-meta">
                {dir.subdirectory_count > 0 && `${dir.subdirectory_count} folders, `}
                {dir.item_count} {dir.item_count === 1 ? "file" : "files"}
              </div>
            </div>
          ))}

          {/* Media Items in Grid */}
          {items.map((item) => {
            const isHighlight = highlightPostId === item.post_id;
            const thumbUrl = `/data/thumbs/${item.hash.slice(0, 2)}/${item.hash.slice(2, 4)}/${item.hash}.webp`;
            return (
              <div
                key={`item-${item.id}`}
                class={`explorer-item file-item ${isHighlight ? "highlighted" : ""}`}
                data-type="file"
                data-item-id={item.id}
                data-post-id={item.post_id}
                data-name={item.custom_name || `${item.hash}${item.extension}`}
                draggable={true}
                tabIndex={0}
              >
                <div class="item-thumb-wrapper">
                  <img
                    src={thumbUrl}
                    alt={item.custom_name || item.hash}
                    loading="lazy"
                    class="item-thumb"
                  />
                  <span class={`rating-pill rating-${item.rating}`}>{item.rating.toUpperCase()}</span>
                </div>
                <div class="item-name" title={item.custom_name || item.hash}>
                  {item.custom_name || `${item.hash.slice(0, 16)}...`}
                </div>
                <div class="item-meta">{formatBytes(item.size_bytes)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Table View */
        <div class="explorer-list-container">
          <table class="explorer-list-table">
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="explorer-items-container">
              {subdirectories.map((dir) => (
                <tr
                  key={`dir-row-${dir.id}`}
                  class="explorer-item folder-item"
                  data-type="folder"
                  data-id={dir.id}
                  data-name={dir.name}
                  draggable={true}
                >
                  <td class="text-center" style="font-size: 18px;">📁</td>
                  <td class="font-bold">
                    <a
                      href={`/explorer?dir=${dir.id}&view=${viewMode}&sort=${sortBy}`}
                      hx-get={`/explorer?dir=${dir.id}&view=${viewMode}&sort=${sortBy}`}
                      hx-target="#explorer-content"
                      hx-swap="outerHTML"
                      hx-push-url={`/explorer?dir=${dir.id}&view=${viewMode}&sort=${sortBy}`}
                    >
                      {dir.name}
                    </a>
                  </td>
                  <td class="text-muted">Folder</td>
                  <td class="text-muted">{dir.item_count} items</td>
                  <td class="text-muted">{new Date(dir.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.map((item) => {
                const isHighlight = highlightPostId === item.post_id;
                const name = item.custom_name || `${item.hash}${item.extension}`;
                return (
                  <tr
                    key={`item-row-${item.id}`}
                    class={`explorer-item file-item ${isHighlight ? "highlighted" : ""}`}
                    data-type="file"
                    data-item-id={item.id}
                    data-post-id={item.post_id}
                    data-name={name}
                    draggable={true}
                  >
                    <td class="text-center">
                      <span class={`rating-pill rating-${item.rating}`}>{item.rating.toUpperCase()}</span>
                    </td>
                    <td>
                      <a href={`/post/${item.post_id}`} class="file-name-link" title={name}>
                        {name}
                      </a>
                    </td>
                    <td class="text-muted">{item.extension.replace(".", "").toUpperCase()}</td>
                    <td class="text-muted">{formatBytes(item.size_bytes)}</td>
                    <td class="text-muted">{new Date(item.post_created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hidden container data attributes for client clipboard handling */}
      <div id="explorer-meta" data-current-dir={currentDir.id} style="display:none;" />
    </div>
  );
};

export const Explorer: FC<ExplorerProps> = (props) => {
  return (
    <div class="explorer-page">
      <ExplorerContent {...props} />

      {/* In-Page Modal: New Folder */}
      <div id="modal-new-folder" class="explorer-modal-backdrop">
        <div class="explorer-modal" role="dialog" aria-modal="true" aria-labelledby="modal-new-folder-title">
          <h3 id="modal-new-folder-title">📁 New Folder</h3>
          <p>Create a new subfolder in the current directory.</p>
          <input
            type="text"
            id="new-folder-name-input"
            placeholder="Folder name"
            onkeydown="if(event.key === 'Enter') window.submitNewFolder();"
          />
          <div class="explorer-modal-actions">
            <button type="button" class="button" onclick="window.hideExplorerModals()">Cancel</button>
            <button type="button" class="button btn-primary" onclick="window.submitNewFolder()">Create</button>
          </div>
        </div>
      </div>

      {/* In-Page Modal: Rename Item */}
      <div id="modal-rename" class="explorer-modal-backdrop">
        <div class="explorer-modal" role="dialog" aria-modal="true" aria-labelledby="modal-rename-title">
          <h3 id="modal-rename-title">✏️ Rename <span id="rename-type-label">Item</span></h3>
          <p>Enter the new name:</p>
          <input
            type="text"
            id="rename-input"
            placeholder="New name"
            onkeydown="if(event.key === 'Enter') window.submitRename();"
          />
          <div class="explorer-modal-actions">
            <button type="button" class="button" onclick="window.hideExplorerModals()">Cancel</button>
            <button type="button" class="button btn-primary" onclick="window.submitRename()">Rename</button>
          </div>
        </div>
      </div>

      {/* In-Page Modal: Delete / Remove Confirmation */}
      <div id="modal-confirm-delete" class="explorer-modal-backdrop">
        <div class="explorer-modal" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <h3 id="modal-delete-title">🗑️ Confirm Removal</h3>
          <p id="confirm-delete-message">Are you sure you want to remove the selected items?</p>
          <div class="explorer-modal-actions">
            <button type="button" class="button" onclick="window.hideExplorerModals()">Cancel</button>
            <button type="button" class="button text-red" onclick="window.submitBatchDelete()">Remove / Delete</button>
          </div>
        </div>
      </div>

      {/* Auto-scroll highlighted post script */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function checkHighlight() {
            const el = document.querySelector(".explorer-item.highlighted");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", checkHighlight);
          } else {
            checkHighlight();
          }
          document.addEventListener("htmx:afterSwap", checkHighlight);
        })();
      ` }} />

      {/* Bundled Client Modules */}
      <script src="/public/dist/explorer-desktop.js" defer></script>
      <script src="/public/dist/explorer-touch.js" defer></script>
    </div>
  );
};
