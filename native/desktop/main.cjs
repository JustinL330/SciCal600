const { app, BrowserWindow, net, protocol, session, shell } = require("electron");
const { existsSync, statSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_HOST = "scical600.local";
const APP_ORIGIN = `app://${APP_HOST}`;
const EXTERNAL_ORIGINS = new Set([
  "https://apidocs.hkma.gov.hk",
  "https://frankfurter.dev",
  "https://github.com",
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function appFileFor(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== APP_HOST) return null;

  const appRoot = path.join(app.getAppPath(), "dist");
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidate = path.resolve(appRoot, relativePath || "index.html");
  const rootPrefix = `${appRoot}${path.sep}`;
  if (candidate !== appRoot && !candidate.startsWith(rootPrefix)) return null;

  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (path.extname(relativePath)) return null;
  return path.join(appRoot, "index.html");
}

function openTrustedExternal(url) {
  try {
    if (EXTERNAL_ORIGINS.has(new URL(url).origin)) void shell.openExternal(url);
  } catch {
    // Ignore malformed or untrusted navigation targets.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 860,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: "#071019",
    title: "SciCal600",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openTrustedExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(`${APP_ORIGIN}/`)) return;
    event.preventDefault();
    openTrustedExternal(url);
  });

  window.webContents.on("dom-ready", () => {
    void window.webContents.executeJavaScript(
      "document.documentElement.dataset.native = 'desktop'",
    );
  });

  void window.loadURL(`${APP_ORIGIN}/`);
}

app.setName("SciCal600");
if (process.platform === "win32") app.setAppUserModelId("io.github.justinfromhkg.scical600");

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  protocol.handle("app", (request) => {
    try {
      const file = appFileFor(request.url);
      if (!file) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
