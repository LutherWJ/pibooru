import type { FC } from 'hono/jsx';

/**
 * Upload Page View
 * Refactored to match Danbooru styling.
 */
export const Upload: FC = () => {
  return (
    <>
      <aside id="sidebar">
        <section class="sidebar-box">
          <h2>Upload Help</h2>
          <p style="font-size: 11px; color: #888;">
            Support for JPG, PNG, WEBP, GIF, MP4, and WebM.<br/><br/>
            Tags should be space-separated. Use <code>artist:name</code>, <code>character:name</code>, etc.
          </p>
        </section>
      </aside>

      <section id="content">
        <h1>Upload</h1>
        
        <div id="upload-container" style="display: flex; gap: 20px; align-items: flex-start; margin-top: 20px;">
          <form 
            id="upload-form"
            action="/upload" 
            method="post" 
            enctype="multipart/form-data"
            style="flex: 1; max-width: 500px;"
          >
            <div style="margin-bottom: 15px;">
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Files</label>
              <input 
                type="file" 
                id="file-input"
                name="file" 
                multiple
                required
                style="width: 100%; background: #000; color: #fff; padding: 5px; border: 1px solid #333;"
              />
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
              <div style="flex: 1;">
                <label style="display: block; font-weight: bold; margin-bottom: 5px;">Rating</label>
                <select 
                  name="rating" 
                  style="width: 100%; background: #000; color: #fff; padding: 5px; border: 1px solid #333;"
                >
                  <option value="s">Safe</option>
                  <option value="q">Questionable</option>
                  <option value="e">Explicit</option>
                </select>
              </div>
              
              <div style="flex: 2;">
                <label style="display: block; font-weight: bold; margin-bottom: 5px;">Source</label>
                <input 
                  type="text" 
                  name="source" 
                  placeholder="https://..."
                  style="width: 100%; background: #000; color: #fff; padding: 5px; border: 1px solid #333;"
                />
              </div>
            </div>

            <div style="margin-bottom: 15px; position: relative;">
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">Tags</label>
              <textarea 
                name="tags" 
                placeholder="artist:picasso character:mona_lisa general:smile"
                style="width: 100%; background: #000; color: #fff; padding: 5px; border: 1px solid #333; height: 100px; resize: vertical;"
                hx-get="/partials/tags/suggestions"
                hx-trigger="keyup changed delay:100ms"
                hx-target="#suggestions-container"
              ></textarea>
              <div id="suggestions-container" style="position: absolute; width: 100%; background: #222; z-index: 10;"></div>
            </div>

            <button 
              type="submit" 
              id="upload-button"
              style="background: #3b82f6; color: #fff; font-weight: bold; padding: 10px 20px; border: none; cursor: pointer;"
            >
              Upload
            </button>

            <div id="upload-queue" style="margin-top: 20px;">
              <h3 style="margin-bottom: 10px; font-size: 14px;">Queue</h3>
              <ul id="queue-list" style="list-style: none; padding: 0; max-height: 300px; overflow-y: auto; border: 1px solid #333; background: #111;">
                <li style="padding: 10px; color: #666; text-align: center;">No files selected</li>
              </ul>
            </div>
          </form>

          <div id="preview-container" style="flex: 1; border: 1px solid #333; background: #111; min-height: 400px; display: flex; align-items: center; justify-content: center; position: sticky; top: 10px; overflow: hidden;">
            <p id="preview-placeholder" style="color: #666;">No file selected</p>
            <div id="preview-content" style="display: none; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                {/* Images or videos will be injected here */}
            </div>
          </div>
        </div>
      </section>
      <script src="/public/js/upload.js"></script>
    </>
  );
};
