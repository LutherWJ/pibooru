import { TestBrowser } from "./browser";

export async function createAuthenticatedBrowser(): Promise<TestBrowser> {
  const browser = new TestBrowser();
  await browser.login("testuser", "testpassword123");
  return browser;
}
