const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;

// ─── Auto Updater Config ────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(win) {
  if (isDev) return; // Skip in dev mode

  autoUpdater.on("update-available", (info) => {
    win.webContents.executeJavaScript(
      `console.log("[AutoUpdate] Update available: v${info.version}");`
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "업데이트 준비 완료",
        message: `새 버전(v${info.version})이 다운로드되었습니다.\n지금 재시작하여 업데이트하시겠습니까?`,
        buttons: ["지금 재시작", "나중에"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  autoUpdater.on("error", (err) => {
    console.log("[AutoUpdate] Error:", err.message);
  });

  // Check for updates every 30 minutes
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30 * 60 * 1000);
}

// ─── Window ─────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Poten Manager",
    icon: path.join(__dirname, "../public/favicon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#ffffff",
  });

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // win.webContents.openDevTools(); // uncomment to debug
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Start auto updater after window is ready
  win.webContents.on("did-finish-load", () => {
    setupAutoUpdater(win);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
