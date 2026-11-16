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
          <section>
            <h3>Clean Mode (/clean)</h3>
            <ul>
              <li><kbd>a</kbd> / <kbd>q</kbd><span>Prev post</span></li>
              <li><kbd>d</kbd> / <kbd>Space</kbd><span>Keep & Next</span></li>
              <li><kbd>s</kbd> / <kbd>x</kbd><span>Delete & Next</span></li>
              <li><kbd>/</kbd><span>Filter tags</span></li>
              <li><kbd>Escape</kbd><span>Exit to Gallery</span></li>
            </ul>
          </section>
        </div>
        <footer style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
          <a href="/wiki_pages" style="color: #38bdf8; font-size: 13px; font-weight: bold; text-decoration: none;">
            In-Depth Search & Query Syntax Guide →
          </a>
          <span style="font-size: 11px; color: #666;">Press Esc to close</span>
        </footer>
      </div>
    </div>
  );
};
