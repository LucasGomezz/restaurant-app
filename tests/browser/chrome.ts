/**
 * Minimal headless-Chrome driver over the DevTools protocol, for the
 * browser smoke test (tests/browser/smoke.ts). Needs `google-chrome`.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASE, type Session } from "../helpers.ts";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Exposed in every page: set a React-controlled field, click by visible text.
const PAGE_HELPERS = `
  window.__setValue = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return "missing " + selector;
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  };
  window.__clickText = (selector, text) => {
    const el = [...document.querySelectorAll(selector)].find((e) => e.textContent.trim().includes(text));
    if (!el) return "missing " + text;
    el.click();
    return "ok";
  };
`;

export type Browser = Awaited<ReturnType<typeof openChrome>>;

export async function openChrome(
  port: number,
  { flags = [], mobile = false }: { flags?: string[]; mobile?: boolean } = {},
) {
  const chrome = spawn(
    "google-chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-"))}`,
      "--no-first-run",
      "--hide-scrollbars",
      // Headless Chrome reports no mouse; pretend a desktop with one.
      ...(mobile
        ? []
        : ["--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"]),
      ...flags,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t: { type: string }) => t.type === "page");
    } catch {
      // Not listening yet.
    }
  }
  if (!target) throw new Error("Chrome did not start (is google-chrome installed?)");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  const pending = new Map<number, (value: unknown) => void>();
  /** Uncaught exceptions and console.error calls, in order. */
  const errors: string[] = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result ?? msg.error);
      pending.delete(msg.id);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      errors.push(`EXCEPTION ${(d.exception?.description ?? d.text).split("\n")[0]}`);
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(
        "CONSOLE " +
          msg.params.args
            .map((a: { value?: string; description?: string }) => a.value ?? a.description ?? "")
            .join(" ")
            .slice(0, 300),
      );
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const send = (method: string, params: object = {}): Promise<any> =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  for (const domain of ["Runtime", "Network", "Page", "DOM"]) await send(`${domain}.enable`);
  await send("Emulation.setDeviceMetricsOverride", {
    width: mobile ? 390 : 1280,
    height: mobile ? 844 : 900,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  });

  const evaluate = async (expression: string) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))
      .result?.value;

  return {
    errors,
    send,
    evaluate,
    async signIn(session: Session) {
      for (const [name, value] of session.cookies) {
        await send("Network.setCookie", { name, value, domain: "localhost", path: "/" });
      }
    },
    async goto(path: string, wait = 5000) {
      await send("Page.navigate", { url: BASE + path });
      await sleep(wait);
      await evaluate(PAGE_HELPERS);
    },
    async path() {
      return new URL(await evaluate("location.href")).pathname;
    },
    async setFiles(selector: string, files: string[]) {
      const { root } = await send("DOM.getDocument", { depth: -1 });
      const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
      if (!nodeId) return `missing ${selector}`;
      await send("DOM.setFileInputFiles", { nodeId, files });
      return "ok";
    },
    async screenshot(file: string) {
      const dir = process.env.SCREENSHOTS_DIR;
      if (!dir) return;
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(dir, file), Buffer.from(data, "base64"));
    },
    close() {
      ws.close();
      chrome.kill();
    },
  };
}
