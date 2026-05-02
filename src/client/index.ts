/**
 * PiBooru Keyboard Manager
 * Handles hjkl/wasd navigation, focus management, and global shortcuts.
 */

(() => {
  class KeyboardManager {
    private activeIndex: number = 0;
    private autocompleteIndex: number = -1;
    private gridSelector: string = '#post-grid';
    private itemSelector: string = '[data-post-id]';

    constructor() {
      this.init();
    }

    private init() {
      // Use delegation for all events to be HTMX-friendly
      document.addEventListener('keydown', (e) => this.handleKeyDown(e));
      document.addEventListener('click', (e) => {
        // Prevent intercepting clicks in non-boosted forms (like Login)
        const target = e.target as HTMLElement;
        if (target.closest('form:not([hx-boost="true"]), [hx-boost="false"]')) {
          return;
        }

        this.handleMouseClick(e);
        this.handleToggleVisibility(e);
        this.handleModalClick(e);
      });
      document.addEventListener('focusout', (e) => this.handleFocusOut(e));
      document.addEventListener('focusin', (e) => this.handleFocusIn(e));
      
      // Cleanup and resets on HTMX navigation
      document.addEventListener('htmx:beforeRequest', () => this.cleanupMedia());
      document.addEventListener('htmx:beforeSwap', () => {
        this.cleanupMedia();
        this.autocompleteIndex = -1;
      });
      
      // Sync focus after swap (e.g. navigating pages via hx-boost)
      document.addEventListener('htmx:afterSwap', () => {
        this.syncFocus();
      });

      // Critical for Back button / History restoration
      document.addEventListener('htmx:beforeHistorySave', () => {
        this.cleanupMedia();
        // Force hide help modal before saving history to avoid ghosting
        this.hideHelp();
      });
      document.addEventListener('htmx:historyRestore', () => {
        this.cleanupMedia();
        // Delay slightly to allow the DOM to settle
        setTimeout(() => this.syncFocus(), 10);
      });
      window.addEventListener('popstate', () => this.cleanupMedia());

      // Initial focus sync
      this.syncFocus();
    }

    private goBack() {
      // If we have history within the app, go back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback for if post was opened in a new tab
        window.location.href = '/';
      }
    }

    private handleModalClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // Intercept Back to Gallery button
      if (target.id === 'back-to-search' || target.closest('#back-to-search')) {
        e.preventDefault();
        this.goBack();
        return;
      }

      if (target.id === 'help-link' || target.closest('#help-link')) {
        e.preventDefault();
        this.toggleHelp();
      }
      if (target.id === 'help-modal' || target.classList.contains('close-modal')) {
        this.hideHelp();
      }
    }

    private toggleHelp() {
      const modal = document.getElementById('help-modal');
      if (modal) {
        const isHidden = modal.style.display === 'none' || window.getComputedStyle(modal).display === 'none';
        modal.style.display = isHidden ? 'flex' : 'none';
      }
    }

    private hideHelp() {
      const modal = document.getElementById('help-modal');
      if (modal) modal.style.display = 'none';
    }

    private handleToggleVisibility(e: MouseEvent | null, triggerSelector?: string) {
      let toggleTrigger: HTMLElement | null = null;
      
      if (e) {
        const target = e.target as HTMLElement;
        toggleTrigger = target.closest('[data-toggle-visibility]') as HTMLElement;
      } else if (triggerSelector) {
        toggleTrigger = document.querySelector(triggerSelector);
      }
      
      if (toggleTrigger) {
        if (e) e.preventDefault();
        const selector = toggleTrigger.getAttribute('data-toggle-visibility');
        if (selector) {
          const targetEl = document.querySelector(selector) as HTMLElement;
          if (targetEl) {
            const isHidden = targetEl.style.display === 'none' || window.getComputedStyle(targetEl).display === 'none';
            targetEl.style.display = isHidden ? 'block' : 'none';
            
            // Focus textarea if opening the edit form
            if (isHidden) {
              const textarea = targetEl.querySelector('textarea');
              if (textarea) {
                // Use requestAnimationFrame to ensure focus happens AFTER the current event loop
                // this prevents the hotkey character (e.g. 'e') from being typed into the box.
                requestAnimationFrame(() => {
                  textarea.focus();
                  // Move cursor to end
                  const len = textarea.value.length;
                  textarea.setSelectionRange(len, len);
                });
              }
            } else {
              // If closing, move focus back to the link that opened it to avoid focus loss
              if (triggerSelector || (e && e.target)) {
                (toggleTrigger as HTMLElement).focus();
              }
            }
          }
        }
      }
    }

    private cleanupMedia() {
      // Find all media elements, even those not currently in the visible DOM but potentially leaked
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        try {
          const media = el as HTMLMediaElement;
          media.pause();
          media.src = ""; // Clear src to stop network activity
          media.load(); // Forces the browser to release the media resource
          
          // We DO NOT remove from DOM here anymore as it can disrupt HTMX's swap tracking
          // The swap itself will handle removal of the parent elements.
        } catch (e) {
          console.error("Failed to cleanup media element:", e);
        }
      });
    }

    private handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (target.matches(this.gridSelector)) {
        this.syncFocus();
      }

      // If focusing a tag search input, trigger suggestions if there's content
      if (target.tagName === 'INPUT' && target.id === 'tags') {
        const input = target as HTMLInputElement;
        if (input.value.length > 0) {
          // Manually trigger HTMX keyup to show suggestions
          (window as any).htmx.trigger(input, 'keyup');
        }
      }
    }

    private handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isExplicitlyUnboosted = !!target.closest('[hx-boost="false"]');
      const key = e.key.toLowerCase();

      // If we are in an explicitly un-boosted area (like Login), completely ignore all hotkeys
      if (isExplicitlyUnboosted) {
        return;
      }

      // Escape key hierarchy
      if (key === 'escape') {
        const modal = document.getElementById('help-modal');
        const modalIsVisible = modal && (modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        
        // 1. Help Modal
        if (modalIsVisible) {
          this.hideHelp();
          e.preventDefault();
          return;
        }

        // 2. Clear Suggestions (if active)
        const suggestionsContainer = document.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions');
        if (suggestionsContainer && suggestionsContainer.children.length > 0) {
          this.clearAutocomplete(suggestionsContainer);
          e.preventDefault();
          return;
        }

        // 3. Close Tag Editor
        const editForm = document.getElementById('edit-tags-form');
        const editFormIsVisible = editForm && (editForm.style.display !== 'none' && window.getComputedStyle(editForm).display !== 'none');
        if (editFormIsVisible) {
          this.handleToggleVisibility(null, '#edit-tags-link');
          e.preventDefault();
          return;
        }

        // 4. Blur Input
        if (isInput) {
          target.blur();
          this.syncFocus();
          return;
        }

        // 5. Navigate Back (only if none of the above and on post page)
        if (window.location.pathname.startsWith('/post/')) {
          e.preventDefault();
          this.goBack();
          return;
        }

        // Default: reset grid focus
        this.resetFocus();
        return;
      }

      if (isInput) {
        this.handleInputKey(e, target as HTMLInputElement | HTMLTextAreaElement);
        return;
      }

      switch (key) {
        // Navigation
        case 'h': case 'arrowleft': case 'a':
          if (!isInput) this.moveFocus(-1);
          break;
        case 'l': case 'arrowright': case 'd':
          if (!isInput) this.moveFocus(1);
          break;
        case 'k': case 'arrowup': case 'w':
          if (!isInput) this.moveFocusVertical(-1);
          break;
        case 'j': case 'arrowdown': case 's':
          if (!isInput) this.moveFocusVertical(1);
          break;

        // Selection
        case ' ':
        case 'enter':
          // Don't trigger active thumbnail if we are inside a form/input
          if (!isInput) {
            this.triggerActive();
          }
          break;

        // Shortcuts
        case 'q':
          e.preventDefault();
          this.focusSearch();
          break;
        case 'u':
          window.location.href = '/upload';
          break;
        case '?':
          this.toggleHelp();
          break;
        case 'z':
          this.navigatePage('prev');
          break;
        case 'x':
          this.navigatePage('next');
          break;
        case 'o':
          this.openOriginal();
          break;
        case 'e':
          e.preventDefault();
          this.focusTagEditor();
          break;
      }
    }

    private navigatePage(dir: 'next' | 'prev') {
      const link = document.querySelector(`#paginator a[rel="${dir}"]`) as HTMLElement;
      if (link) link.click();
    }

    private openOriginal() {
      const link = document.querySelector('section#options a[href^="/data/original/"]') as HTMLAnchorElement;
      if (link) window.open(link.href, '_blank');
    }

    private focusTagEditor() {
      const link = document.getElementById('edit-tags-link');
      if (link) link.click(); // This will trigger the toggle logic
    }

    private handleInputKey(e: KeyboardEvent, input: HTMLInputElement | HTMLTextAreaElement) {
      const suggestionsContainer = input.parentElement?.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions');
      
      // We don't return early if no container, because we want to handle Enter in textarea
      const suggestions = suggestionsContainer ? Array.from(suggestionsContainer.querySelectorAll('.suggestion-item')) as HTMLElement[] : [];
      
      if (suggestions.length > 0) {
        if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const delta = (e.key === 'ArrowUp') ? -1 : 1;
          this.autocompleteIndex = (this.autocompleteIndex + delta + suggestions.length) % suggestions.length;
          this.syncAutocomplete(suggestions);
          return;
        }

        if (e.key === 'Enter') {
          // If something is highlighted, or if we want to pick the first one by default
          if (this.autocompleteIndex === -1 && suggestions.length > 0) {
            this.autocompleteIndex = 0;
          }
          
          if (this.autocompleteIndex !== -1 && suggestions[this.autocompleteIndex]) {
            e.preventDefault();
            this.applySuggestion(input, suggestions[this.autocompleteIndex] as HTMLElement);
            if (suggestionsContainer) this.clearAutocomplete(suggestionsContainer);
            return;
          }
        }
      }

      // Special handling for Enter in primary tag inputs (search box or edit textarea)
      if (e.key === 'Enter' && (input.id === 'tags' || (input.tagName === 'TEXTAREA' && input.name === 'tags'))) {
        e.preventDefault();
        const form = input.closest('form');
        if (form) {
          // Trigger the submit button if it exists to ensure HTMX/boost works
          const submitBtn = form.querySelector('button[type="submit"]') as HTMLElement;
          if (submitBtn) {
            submitBtn.click();
          } else {
            form.submit();
          }
        }
        return;
      }

      // Reset index on other keys (except navigation keys handled above)
      if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Tab') {
        this.autocompleteIndex = -1;
      }
    }

    private handleMouseClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const suggestionItem = target.closest('.suggestion-item') as HTMLElement;
      
      if (suggestionItem) {
        const container = suggestionItem.closest('#suggestions-container, #edit-suggestions-container, #header-suggestions');
        if (container) {
          const input = container.parentElement?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (input) {
            this.applySuggestion(input, suggestionItem);
            this.clearAutocomplete(container);
            input.focus();
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    }

    private handleFocusOut(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Short delay to allow clicks on suggestions to process first
        setTimeout(() => {
          const suggestionsContainer = target.parentElement?.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions');
          if (suggestionsContainer) {
            // Only clear if the focus didn't move to something inside the suggestions
            if (!suggestionsContainer.contains(document.activeElement)) {
              this.clearAutocomplete(suggestionsContainer);
            }
          }
        }, 200);
      }
    }

    private syncAutocomplete(suggestions: HTMLElement[]) {
      suggestions.forEach((item, i) => {
        if (i === this.autocompleteIndex) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active');
        }
      });
    }

    private applySuggestion(input: HTMLInputElement | HTMLTextAreaElement, suggestion: HTMLElement) {
      const value = suggestion.getAttribute('data-tag-value');
      if (!value) return;

      const text = input.value;
      const cursorPos = input.selectionStart || 0;
      
      // Find the start of the current word
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastSpace = textBeforeCursor.lastIndexOf(' ');
      const start = lastSpace + 1;
      
      const newText = text.substring(0, start) + value + ' ' + text.substring(cursorPos);
      input.value = newText;
      
      // Move cursor to end of inserted tag
      const newPos = start + value.length + 1;
      input.setSelectionRange(newPos, newPos);
    }

    private clearAutocomplete(container: Element) {
      this.autocompleteIndex = -1;
      container.innerHTML = '';
    }

    private getItems(): HTMLElement[] {
      return Array.from(document.querySelectorAll(this.itemSelector));
    }

    private moveFocus(delta: number) {
      const items = this.getItems();
      if (items.length === 0) return;

      this.activeIndex = Math.max(0, Math.min(items.length - 1, this.activeIndex + delta));
      this.syncFocus();
    }

    private moveFocusVertical(direction: number) {
      const items = this.getItems();
      if (items.length < 2) return;

      // Calculate columns based on the vertical position of elements (handles flex-wrap)
      if (!items[0]) return;
      const firstItemTop = items[0].getBoundingClientRect().top;
      let columns = items.length;

      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        if (item && item.getBoundingClientRect().top > firstItemTop + 5) { // +5 for minor subpixel differences
          columns = i;
          break;
        }
      }

      this.moveFocus(direction * columns);
    }

    private syncFocus() {
      const items = this.getItems();
      const activeItem = items[this.activeIndex];

      if (activeItem) {
        // Remove active class from all
        items.forEach(item => {
          item.classList.remove('active-thumbnail');
        });

        // Add to active
        activeItem.classList.add('active-thumbnail');
        
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    private triggerActive() {
      const items = this.getItems();
      const activeItem = items[this.activeIndex];
      if (activeItem) {
        const link = activeItem.querySelector('a');
        if (link) link.click();
      }
    }

    private focusSearch() {
      const searchInput = document.getElementById('tags') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    private resetFocus() {
      this.activeIndex = 0;
      this.syncFocus();
      (document.activeElement as HTMLElement)?.blur();
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    (window as any).pibooru = new KeyboardManager();
  });
})();
