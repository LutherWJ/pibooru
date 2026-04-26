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
        
        <form 
          action="/upload" 
          method="post" 
          enctype="multipart/form-data"
          style="max-width: 600px; margin-top: 20px;"
        >
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">File</label>
            <input 
              type="file" 
              name="file" 
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
            style="background: #3b82f6; color: #fff; font-weight: bold; padding: 10px 20px; border: none; cursor: pointer;"
          >
            Upload
          </button>
        </form>
      </section>
    </>
  );
};
