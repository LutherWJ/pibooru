/**
 * ============================================================================
 * EXPERIMENTAL MOBILE TOUCH EXPLORER
 * ============================================================================
 * Segregated client-side touch module for the File Explorer.
 *
 * Provides a long-press (500ms) hold to enter drag-and-drop mode on touchscreens.
 * Moving a finger over a folder and releasing drops the file into that directory.
 *
 * STRICTLY GATED TO TOUCHSCREENS:
 * Completely dormant on desktops and mouse-driven pointer devices.
 * Isolated from core keyboard and mouse logic for easy inspection or removal.
 */

(function initMobileTouchExplorer() {
  // Strict Touchscreen & Coarse-Pointer Guard
  const isCoarseTouch =
    ("ontouchstart" in window) ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  if (!isCoarseTouch) {
    return; // Do nothing on non-touch devices
  }

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isDragging = false;
  let draggedElement: HTMLElement | null = null;
  let ghostElement: HTMLElement | null = null;
  let currentDropTarget: HTMLElement | null = null;

  let startX = 0;
  let startY = 0;

  function cleanupDrag() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (ghostElement) {
      ghostElement.remove();
      ghostElement = null;
    }
    if (draggedElement) {
      draggedElement.classList.remove("touch-dragging");
      draggedElement = null;
    }
    if (currentDropTarget) {
      currentDropTarget.classList.remove("touch-drop-hover");
      currentDropTarget = null;
    }
    isDragging = false;
  }

  document.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;
      const target = (e.target as HTMLElement).closest(".file-item") as HTMLElement | null;
      if (!target) return;

      startX = touch.clientX;
      startY = touch.clientY;
      draggedElement = target;

      // Start long-press timer (500ms)
      longPressTimer = setTimeout(() => {
        isDragging = true;

        // Subtle haptic feedback if supported by browser/device
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {}
        }

        // Highlight dragged item
        target.classList.add("touch-dragging");

        // Create floating ghost element following finger
        ghostElement = target.cloneNode(true) as HTMLElement;
        ghostElement.id = "touch-drag-ghost";
        ghostElement.style.position = "fixed";
        ghostElement.style.zIndex = "99999";
        ghostElement.style.pointerEvents = "none";
        ghostElement.style.opacity = "0.85";
        ghostElement.style.width = "100px";
        ghostElement.style.height = "100px";
        ghostElement.style.transform = "translate(-50%, -50%) scale(1.05)";
        ghostElement.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
        ghostElement.style.border = "2px solid #38bdf8";
        ghostElement.style.borderRadius = "8px";
        ghostElement.style.left = `${touch.clientX}px`;
        ghostElement.style.top = `${touch.clientY}px`;
        document.body.appendChild(ghostElement);
      }, 500);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (!draggedElement) return;
      const touch = e.touches[0]!;

      // If user moved significantly before 500ms, cancel long press (normal scrolling)
      if (!isDragging) {
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        if (dx > 12 || dy > 12) {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
        return;
      }

      // We are in drag mode: prevent page scroll while dragging
      e.preventDefault();

      if (ghostElement) {
        ghostElement.style.left = `${touch.clientX}px`;
        ghostElement.style.top = `${touch.clientY}px`;
      }

      // Check element currently underneath the touch point
      const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
      const folderTarget = elUnder?.closest(".folder-item") as HTMLElement | null;

      if (folderTarget !== currentDropTarget) {
        if (currentDropTarget) {
          currentDropTarget.classList.remove("touch-drop-hover");
        }
        currentDropTarget = folderTarget;
        if (currentDropTarget) {
          currentDropTarget.classList.add("touch-drop-hover");
        }
      }
    },
    { passive: false }
  );

  document.addEventListener("touchend", () => {
    if (isDragging && draggedElement && currentDropTarget) {
      const targetDirId = currentDropTarget.getAttribute("data-id");
      const itemId = draggedElement.getAttribute("data-item-id");
      const itemName = draggedElement.getAttribute("data-name") || "file";
      const folderName = currentDropTarget.getAttribute("data-name") || "folder";

      if (targetDirId && itemId) {
        // Execute relocation into target folder
        fetch("/explorer/paste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cut",
            itemIds: [parseInt(itemId, 10)],
            targetDirId: parseInt(targetDirId, 10),
          }),
        }).then((res) => {
          if (res.ok) {
            window.location.reload();
          } else {
            res.text().then((msg) => alert(`Failed to move: ${msg}`));
          }
        });
      }
    }

    cleanupDrag();
  });

  document.addEventListener("touchcancel", cleanupDrag);
})();
