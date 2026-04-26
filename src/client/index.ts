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
        this.handleMouseClick(e);
        this.handleToggleVisibility(e);
      });
      document.addEventListener('focusout', (e) => this.handleFocusOut(e));
      document.addEventListener('focusin', (e) => this.handleFocusIn(e));
      
      // Cleanup and resets on HTMX navigation
      document.addEventListener('htmx:beforeRequest', () => this.cleanupMedia());
      document.addEventListener('htmx:beforeSwap', () => {
        this.cleanupMedia();
        this.autocompleteIndex = -1;
      });

      // Initial focus sync
      this.syncFocus();
    }

    private handleToggleVisibility(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const toggleTrigger = target.closest('[data-toggle-visibility]') as HTMLElement;
      
      if (toggleTrigger) {
        e.preventDefault();
        const selector = toggleTrigger.getAttribute('data-toggle-visibility');
        if (selector) {
          const targetEl = document.querySelector(selector) as HTMLElement;
          if (targetEl) {
            const isHidden = targetEl.style.display === 'none' || window.getComputedStyle(targetEl).display === 'none';
            targetEl.style.display = isHidden ? 'block' : 'none';
            
            // Focus textarea if opening the edit form
            if (isHidden) {
              const textarea = targetEl.querySelector('textarea');
              if (textarea) textarea.focus();
            }
          }
        }
      }
    }

    private cleanupMedia() {
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        const media = el as HTMLMediaElement;
        media.pause();
        media.src = ""; // Force clear the source to stop buffering
        media.load();
        media.remove();
      });
    }

    private handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (target.matches(this.gridSelector)) {
        this.syncFocus();
      }
    }

    private handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        this.handleInputKey(e, target as HTMLInputElement | HTMLTextAreaElement);
        return;
      }

      switch (e.key.toLowerCase()) {
        // Navigation
        case 'h': case 'arrowleft': case 'a':
          this.moveFocus(-1);
          break;
        case 'l': case 'arrowright': case 'd':
          this.moveFocus(1);
          break;
        case 'k': case 'arrowup': case 'w':
          this.moveFocusVertical(-1);
          break;
        case 'j': case 'arrowdown': case 's':
          this.moveFocusVertical(1);
          break;

        // Selection
        case ' ':
        case 'enter':
          this.triggerActive();
          break;

        // Shortcuts
        case 'q':
          e.preventDefault();
          this.focusSearch();
          break;
        case 'u':
          window.location.href = '/upload';
          break;
        case 'escape':
          this.resetFocus();
          break;
      }
    }

    private handleInputKey(e: KeyboardEvent, input: HTMLInputElement | HTMLTextAreaElement) {
      const suggestionsContainer = input.parentElement?.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions');
      if (!suggestionsContainer) return;

      const suggestions = Array.from(suggestionsContainer.querySelectorAll('.suggestion-item')) as HTMLElement[];
      
      if (e.key === 'Escape') {
        input.blur();
        this.clearAutocomplete(suggestionsContainer);
        return;
      }

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
          
          if (this.autocompleteIndex !== -1) {
            e.preventDefault();
            this.applySuggestion(input, suggestions[this.autocompleteIndex]);
            this.clearAutocomplete(suggestionsContainer);
            return;
          }
        }
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
      
      // Trigger HTMX changed event if needed, but usually not necessary since we just updated the value
      // and the user might continue typing.
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
      const grid = document.querySelector(this.gridSelector);
      if (items.length === 0 || !grid) return;

      // Calculate columns in the grid
      const gridStyle = window.getComputedStyle(grid);
      const columns = gridStyle.getPropertyValue('grid-template-columns').split(' ').length;

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
