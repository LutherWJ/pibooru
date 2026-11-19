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
    private isSelectingSuggestion: boolean = false;

    constructor() {
      this.init();
    }

    private init() {
      // Use delegation for all events to be HTMX-friendly
      document.addEventListener('keydown', (e) => this.handleKeyDown(e));
      
      // Pointerdown for instantaneous, blur-free suggestion selection
      document.addEventListener('pointerdown', (e) => this.handleSuggestionPointerDown(e));

      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Toggle mobile viewer overlay menu
        if (target && typeof target.closest === 'function') {
          if (target.id === 'viewer-menu-toggle' || target.closest('#viewer-menu-toggle')) {
            e.preventDefault();
            const overlay = document.getElementById('viewer-overlay');
            if (overlay) overlay.classList.toggle('visible');
            return;
          }

          // Prevent intercepting clicks in non-boosted forms (like Login)
          if (target.closest('form:not([hx-boost="true"]), [hx-boost="false"]')) {
            return;
          }
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
        // Force hide help modal and lightbox before saving history to avoid ghosting
        this.hideHelp();
        this.hideLightbox();
      });
      document.addEventListener('htmx:historyRestore', () => {
        this.cleanupMedia();
        // Delay slightly to allow the DOM to settle
        setTimeout(() => this.syncFocus(), 10);
      });
      window.addEventListener('popstate', () => this.cleanupMedia());

      // Touch / Swipe Gestures for Clean Mode, Slideshow, and Post Detail
      let touchStartX = 0;
      let touchStartY = 0;

      document.addEventListener('touchstart', (e) => {
        const isSupportedPage = window.location.pathname.startsWith('/clean') ||
                                window.location.pathname.startsWith('/viewer') ||
                                window.location.pathname.startsWith('/post/');
        if (!isSupportedPage) return;
        const target = e.target as HTMLElement;
        if (target && typeof target.closest === 'function' && target.closest('input, textarea, button, a')) return;
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        const isSupportedPage = window.location.pathname.startsWith('/clean') ||
                                window.location.pathname.startsWith('/viewer') ||
                                window.location.pathname.startsWith('/post/');
        if (!isSupportedPage) return;
        const target = e.target as HTMLElement;
        if (target && typeof target.closest === 'function' && target.closest('input, textarea, button, a')) return;
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;

          const lightbox = document.getElementById('lightbox-modal');
          const isLightboxOpen = lightbox && (lightbox.style.display === 'flex' || window.getComputedStyle(lightbox).display === 'flex');

          // Horizontal swipe: left = next, right = prev
          if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
            if (window.location.pathname.startsWith('/clean')) {
              if (deltaX < 0) {
                this.cleanNavigate('next');
              } else {
                this.cleanNavigate('prev');
              }
            } else if (window.location.pathname.startsWith('/viewer')) {
              if (deltaX < 0) {
                this.navigatePage('next');
              } else {
                this.navigatePage('prev');
              }
            } else if (window.location.pathname.startsWith('/post/')) {
              if (deltaX < 0) {
                this.navigatePage('next');
              } else {
                this.navigatePage('prev');
              }
            }
            return;
          }

          // Vertical swipe down:
          // In clean mode -> delete!
          if (window.location.pathname.startsWith('/clean') && deltaY > 80 && Math.abs(deltaX) < 100) {
            this.cleanDelete();
            return;
          }

          // In lightbox -> close lightbox!
          if (isLightboxOpen && deltaY > 80 && Math.abs(deltaX) < 100) {
            this.hideLightbox();
            return;
          }

          // Tap gesture to toggle menu on viewer
          if (window.location.pathname.startsWith('/viewer') && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            const overlay = document.getElementById('viewer-overlay');
            if (overlay) {
              overlay.classList.toggle('visible');
            }
          }
        }
      }, { passive: true });

      // Initial focus sync
      this.syncFocus();

      // On clean mode, ensure focus is clear of inputs so keystrokes operate immediately
      if (window.location.pathname.startsWith('/clean')) {
        const active = document.activeElement as HTMLElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.blur();
        }
      }
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
      if (!target || typeof target.closest !== 'function') return;

      // Intercept Back to Gallery or Mobile Back button
      if (target.id === 'back-to-search' || target.closest('#back-to-search') ||
          target.id === 'mobile-back-btn' || target.closest('#mobile-back-btn')) {
        e.preventDefault();
        this.goBack();
        return;
      }

      // Mobile search drawer toggle
      if (target.id === 'mobile-search-toggle' || target.closest('#mobile-search-toggle')) {
        e.preventDefault();
        const drawer = document.getElementById('mobile-search-drawer');
        if (drawer) {
          const isOpen = drawer.classList.toggle('open');
          if (isOpen) {
            const inp = drawer.querySelector('input') as HTMLInputElement;
            if (inp) inp.focus();
          }
        }
        return;
      }

      // Open Lightbox on click of post image, mobile fullscreen button, or options link
      if (target.id === 'open-lightbox-btn' || target.closest('#open-lightbox-btn') ||
          target.id === 'mobile-fullscreen-trigger' || target.closest('#mobile-fullscreen-trigger') ||
          target.id === 'post-media-element' || target.closest('#post-media-element')) {
        e.preventDefault();
        this.showLightbox();
        return;
      }

      // Close Lightbox
      if (target.id === 'lightbox-close-btn' || target.closest('#lightbox-close-btn') ||
          target.id === 'lightbox-modal' || target.id === 'lightbox-content-area') {
        this.hideLightbox();
        return;
      }

      if (target.id === 'help-link' || target.closest('#help-link')) {
        e.preventDefault();
        this.toggleHelp();
      }
      if (target.id === 'help-modal' || (target.classList && target.classList.contains('close-modal'))) {
        this.hideHelp();
      }
    }

    private showLightbox() {
      const modal = document.getElementById('lightbox-modal');
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }

    private hideLightbox() {
      const modal = document.getElementById('lightbox-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
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
        if (target && typeof target.closest === 'function') {
          toggleTrigger = target.closest('[data-toggle-visibility]') as HTMLElement;
        }
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
      this.hideLightbox();
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
      if (target.tagName === 'INPUT' && (target.id === 'tags' || target.id === 'mobile-tags-input')) {
        const input = target as HTMLInputElement;
        if (input.value.length > 0) {
          // Manually trigger HTMX input to show suggestions
          (window as any).htmx.trigger(input, 'input');
        }
      }
    }

    private handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = !!(target && target.tagName && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable));
      const isExplicitlyUnboosted = !!(target && typeof target.closest === 'function' && target.closest('[hx-boost="false"]'));
      const key = e.key.toLowerCase();

      // If we are in an explicitly un-boosted area (like Login), completely ignore all hotkeys
      if (isExplicitlyUnboosted) {
        return;
      }

      // On Explorer page, delegate all keyboard management to explorer-desktop
      if (window.location.pathname.startsWith('/explorer')) {
        return;
      }

      // Escape key hierarchy
      if (key === 'escape') {
        // 1. Lightbox Modal
        const lightbox = document.getElementById('lightbox-modal');
        const lightboxIsVisible = lightbox && (lightbox.style.display === 'flex' || window.getComputedStyle(lightbox).display === 'flex');
        if (lightboxIsVisible) {
          this.hideLightbox();
          e.preventDefault();
          return;
        }

        const modal = document.getElementById('help-modal');
        const modalIsVisible = modal && (modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        
        // 2. Help Modal
        if (modalIsVisible) {
          this.hideHelp();
          e.preventDefault();
          return;
        }

        // 2. Clear Suggestions (if active)
        const suggestionsContainer = document.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions, #clean-suggestions-container, #viewer-suggestions-container');
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

        // 5. Exit Clean Mode directly to Gallery
        if (window.location.pathname.startsWith('/clean')) {
          e.preventDefault();
          window.location.href = '/';
          return;
        }

        // 6. Navigate Back (only if none of the above and on post/viewer page)
        if (window.location.pathname.startsWith('/post/') || window.location.pathname.startsWith('/viewer')) {
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

      // Viewer Navigation Overrides
      if (window.location.pathname.startsWith('/viewer')) {
        switch (key) {
          case 'l': case 'arrowright': case 'd':
            this.navigatePage('next');
            return;
          case 'h': case 'arrowleft': case 'a':
            this.navigatePage('prev');
            return;
          case '/': case 's': case 'q':
            e.preventDefault();
            const searchInput = document.getElementById('viewer-tags-input');
            if (searchInput) searchInput.focus();
            return;
          case '?':
            e.preventDefault();
            this.toggleHelp();
            return;
        }
      }

      // Clean Mode Navigation & Triage Overrides (Left-Handed Keystrokes & Vim/Arrows)
      if (window.location.pathname.startsWith('/clean')) {
        switch (key) {
          // Next / Keep: 'd', 'e', 'w', ' ' (Space), arrowright, 'l', 'j', 'enter', 'n'
          case 'd':
          case 'e':
          case 'w':
          case ' ':
          case 'arrowright':
          case 'l':
          case 'j':
          case 'enter':
          case 'n':
            e.preventDefault();
            this.cleanNavigate('next');
            return;

          // Prev: 'a', 'q', arrowleft, 'h', 'k', 'p'
          case 'a':
          case 'q':
          case 'arrowleft':
          case 'h':
          case 'k':
          case 'p':
            e.preventDefault();
            this.cleanNavigate('prev');
            return;

          // Delete & Next: 's', 'x', 'delete', 'backspace'
          case 's':
          case 'x':
          case 'delete':
          case 'backspace':
            e.preventDefault();
            this.cleanDelete();
            return;

          // Quick search focus: '/'
          case '/':
            e.preventDefault();
            const searchInput = document.getElementById('clean-tags-input') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
            return;

          case '?':
            e.preventDefault();
            this.toggleHelp();
            return;
        }
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
      const link = document.querySelector(`a[rel="${dir}"]`) as HTMLElement;
      if (link) link.click();
    }

    private cleanNavigate(dir: 'next' | 'prev') {
      const stage = document.getElementById('clean-media-element');
      const link = document.querySelector(dir === 'next' ? '#clean-next-btn, #clean-next-link' : '#clean-prev-btn, #clean-prev-link') as HTMLElement;
      if (link && !link.hasAttribute('disabled')) {
        if (stage) {
          stage.classList.add(dir === 'next' ? 'cleaning-next' : 'cleaning-prev');
        }
        if ((window as any).htmx) {
          (window as any).htmx.trigger(link, 'click');
        } else {
          link.click();
        }
      }
    }

    private cleanDelete() {
      const deleteBtn = document.getElementById('clean-delete-btn') as HTMLElement;
      if (deleteBtn && !deleteBtn.hasAttribute('disabled')) {
        const stage = document.getElementById('clean-media-element');
        if (stage) {
          stage.classList.add('cleaning-delete');
        }
        if ((window as any).htmx) {
          (window as any).htmx.trigger(deleteBtn, 'click');
        } else {
          deleteBtn.click();
        }
      }
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
      const suggestionsContainer = input.parentElement?.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions, #clean-suggestions-container, #viewer-suggestions-container');
      
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

      // Special handling for Enter in primary tag inputs (search box, clean tags, viewer tags, or edit textarea)
      if (e.key === 'Enter' && (input.id === 'tags' || input.id === 'clean-tags-input' || input.id === 'viewer-tags-input' || (input.tagName === 'TEXTAREA' && input.name === 'tags'))) {
        e.preventDefault();
        input.blur();
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

    private handleSuggestionPointerDown(e: PointerEvent | MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;
      const suggestionItem = target.closest('.suggestion-item') as HTMLElement;
      
      if (suggestionItem) {
        // Prevent input from losing focus / triggering focusout
        e.preventDefault();
        this.isSelectingSuggestion = true;
        const container = suggestionItem.closest('#suggestions-container, #edit-suggestions-container, #header-suggestions, #clean-suggestions-container, #viewer-suggestions-container, #mobile-suggestions-container');
        if (container) {
          const input = container.parentElement?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (input) {
            this.applySuggestion(input, suggestionItem);
            this.clearAutocomplete(container);
            input.focus();
          }
        }
        setTimeout(() => {
          this.isSelectingSuggestion = false;
        }, 300);
      }
    }

    private handleMouseClick(e: MouseEvent) {
      if (this.isSelectingSuggestion) return;
      const target = e.target as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;
      const suggestionItem = target.closest('.suggestion-item') as HTMLElement;
      
      if (suggestionItem) {
        const container = suggestionItem.closest('#suggestions-container, #edit-suggestions-container, #header-suggestions, #clean-suggestions-container, #viewer-suggestions-container, #mobile-suggestions-container');
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
      if (this.isSelectingSuggestion) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Short delay to allow clicks on suggestions to process first
        setTimeout(() => {
          if (this.isSelectingSuggestion) return;
          const suggestionsContainer = target.parentElement?.querySelector('#suggestions-container, #edit-suggestions-container, #header-suggestions, #clean-suggestions-container, #viewer-suggestions-container, #mobile-suggestions-container');
          if (suggestionsContainer) {
            // Only clear if the focus didn't move to something inside the suggestions
            if (!suggestionsContainer.contains(document.activeElement)) {
              this.clearAutocomplete(suggestionsContainer);
            }
          }
        }, 250);
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
      const cursorPos = input.selectionStart ?? text.length;
      
      // Find the start of the current word
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastSpace = textBeforeCursor.lastIndexOf(' ');
      const start = lastSpace + 1;
      
      // Find the end of the current word
      const textAfterCursor = text.substring(cursorPos);
      const firstSpaceAfter = textAfterCursor.indexOf(' ');
      const end = firstSpaceAfter === -1 ? text.length : cursorPos + firstSpaceAfter;

      const isPrefixOnly = value.endsWith(':');
      const suffix = isPrefixOnly ? '' : ' ';

      const newText = text.substring(0, start) + value + suffix + text.substring(end);
      input.value = newText;
      
      // Move cursor to end of inserted tag
      const newPos = start + value.length + suffix.length;
      input.setSelectionRange(newPos, newPos);

      // If user selected a prefix like "order:", trigger suggestions immediately for after the colon
      if ((window as any).htmx) {
        (window as any).htmx.trigger(input, 'input');
      }
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

  // Initialize on DOM load or immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window as any).pibooru = new KeyboardManager();
    });
  } else {
    (window as any).pibooru = new KeyboardManager();
  }
})();
