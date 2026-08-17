const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const APP_URL = 'https://sellbodr.vercel.app'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'SellBodr',
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.loadURL(APP_URL)
  win.once('ready-to-show', () => win.show())

  // Open external links (marketplaces, docs) in browser, not in-app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  win.webContents.on('page-title-updated', (_, title) => {
    win.setTitle(title ? `${title} — SellBodr` : 'SellBodr')
  })
}

if (app.isPackaged) Menu.setApplicationMenu(null)

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
