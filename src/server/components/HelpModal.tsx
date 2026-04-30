import type { FC } from 'hono/jsx';

/**
 * HelpModal Component
 * Displays a keyboard shortcuts overlay.
 */
export const HelpModal: FC = () => {
  return (
    <div id="help-modal" style="display: none;" data-hx-history="false">
      <div class="help-modal-content">
        <header>
          <h2>Keyboard Shortcuts</h2>
          <span class="close-modal">&times;</span>
        </header>
        <div class="help-grid">
          <section>
            <h3>Navigation</h3>
            <ul>
              <li><kbd>hjkl</kbd> / <kbd>wasd</kbd><span>Move focus</span></li>
              <li><kbd>Space</kbd> / <kbd>Enter</kbd><span>Open post</span></li>
              <li><kbd>z</kbd> / <kbd>x</kbd><span>Prev / Next page</span></li>
              <li><kbd>Escape</kbd><span>Back / Close</span></li>
            </ul>
          </section>
          <section>
            <h3>Global</h3>
            <ul>
              <li><kbd>q</kbd><span>Focus search</span></li>
              <li><kbd>u</kbd><span>Upload</span></li>
              <li><kbd>?</kbd><span>Show this help</span></li>
            </ul>
          </section>
          <section>
            <h3>Post View</h3>
            <ul>
              <li><kbd>e</kbd><span>Edit tags</span></li>
              <li><kbd>f</kbd><span>Favorite</span></li>
              <li><kbd>[</kbd> / <kbd>]</kbd><span>Prev / Next post</span></li>
              <li><kbd>o</kbd><span>Open original</span></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
