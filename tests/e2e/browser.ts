import { resolve } from "node:path";

export class TestBrowser {
  private view: any;
  public baseURL: string;

  constructor(baseURL: string = "http://127.0.0.1:3001") {
    this.baseURL = baseURL;
    this.view = new (Bun as any).WebView({
      width: 1280,
      height: 800,
    });
    this.initCDP();
  }

  private async initCDP() {
    try {
      await this.view.cdp("Page.enable", {});
      await this.view.cdp("Page.addScriptToEvaluateOnNewDocument", {
        source: "window.alert = () => {}; window.confirm = () => true;",
      });
    } catch {}
  }

  get rawView() {
    return this.view;
  }

  get url(): string {
    return this.view.url || "";
  }

  async goto(pathOrUrl: string) {
    const targetUrl = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `${this.baseURL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

    await this.view.navigate(targetUrl);
    // Disable blocking dialogs like alert()
    try {
      await this.view.evaluate("window.alert = () => {}; window.confirm = () => true;");
    } catch {}
    // Give HTMX / scripts a moment to attach
    await Bun.sleep(100);
  }

  async click(selector: string) {
    await this.view.click(selector);
    await Bun.sleep(50);
  }

  async fill(selector: string, value: string) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.value = ${JSON.stringify(value)};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        }
      })()
    `);
    await Bun.sleep(150);
  }

  async press(key: string) {
    await this.view.press(key);
    await Bun.sleep(50);
  }

  async setFileInput(selector: string, filePath: string) {
    const fullPath = resolve(filePath);
    const doc = await this.view.cdp("DOM.getDocument", {});
    const node = await this.view.cdp("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector,
    });
    if (!node || !node.nodeId) {
      throw new Error(`FileInput selector '${selector}' not found in DOM`);
    }
    await this.view.cdp("DOM.setFileInputFiles", {
      nodeId: node.nodeId,
      files: [fullPath],
    });
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await Bun.sleep(100);
  }

  async goBack() {
    await this.evaluate("window.history.back()");
    await Bun.sleep(200);
  }

  private evalPromise: Promise<any> = Promise.resolve();

  async evaluate<T = any>(expr: string): Promise<T> {
    const run = async () => {
      return await this.view.evaluate(expr);
    };
    this.evalPromise = this.evalPromise.then(run, run);
    return await this.evalPromise;
  }

  async innerText(selector: string): Promise<string> {
    return await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        return el ? (el.innerText || el.textContent || '') : '';
      })()
    `);
  }

  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        return el ? el.getAttribute(${JSON.stringify(attribute)}) : null;
      })()
    `);
  }

  async isVisible(selector: string): Promise<boolean> {
    return await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      })()
    `);
  }

  async waitForSelector(selector: string, timeoutMs: number = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const visible = await this.isVisible(selector);
      if (visible) return true;
      await Bun.sleep(50);
    }
    throw new Error(`Timeout (${timeoutMs}ms) waiting for selector '${selector}' to be visible`);
  }

  async getURL(): Promise<string> {
    try {
      return (await this.evaluate("window.location.href")) || this.view.url || "";
    } catch {
      return this.view.url || "";
    }
  }

  async waitForURL(pattern: string | RegExp, timeoutMs: number = 10000): Promise<void> {
    const start = Date.now();
    let currentUrl = "";
    while (Date.now() - start < timeoutMs) {
      try {
        await this.view.cdp("Page.handleJavaScriptDialog", { accept: true });
      } catch {}
      currentUrl = await this.getURL();
      const matches = typeof pattern === "string"
        ? currentUrl.includes(pattern)
        : pattern.test(currentUrl);
      if (matches) return;
      await Bun.sleep(100);
    }
    throw new Error(`Timeout (${timeoutMs}ms) waiting for URL matching '${pattern}', current: '${currentUrl}'`);
  }

  async login(username: string = "testuser", password: string = "testpassword123") {
    await this.goto("/login");
    await this.fill('input[name="username"]', username);
    await this.fill('input[name="password"]', password);
    await this.click('button[type="submit"]');
    await this.waitForURL(/\/$/);
  }

  async close() {
    try {
      await this.view.close();
    } catch {}
  }
}
