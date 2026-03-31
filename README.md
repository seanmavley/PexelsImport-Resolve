# 🎬 Pexels Browser for DaVinci Resolve

Browse, preview, and download free HD & 4K stock video footage from [Pexels](https://www.pexels.com) — directly inside DaVinci Resolve.

![Pexels Browser Plugin](https://img.shields.io/badge/DaVinci_Resolve-15%2B_Studio-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pexels API](https://img.shields.io/badge/Pexels-API_v1-orange?style=flat-square)

---

## ✨ Features

- **🔍 Search** — Search thousands of free stock videos from Pexels
- **👁 Preview** — Watch videos before downloading with a built-in player
- **📐 Filter by Orientation** — Landscape, Portrait, or Square
- **⏱ Filter by Duration** — Set min/max duration in seconds
- **🎯 Filter by Resolution** — 4K (Ultra HD), Full HD (1080p), or HD (720p)
- **⬇ Download** — Multiple quality options per video with progress tracking
- **📁 Auto-Import** — Companion Python script to automatically import downloads into the Media Pool
- **🌙 Dark Theme** — Seamlessly matches DaVinci Resolve's dark interface

---

## 📋 Requirements

| Requirement | Details |
|---|---|
| **DaVinci Resolve Studio** | Version 15 or newer (including 18, 19, 20+). **Studio version required** — the free version does not support Workflow Integration Plugins. |
| **Pexels API Key** | Free — get one at [pexels.com/api](https://www.pexels.com/api/) |
| **Python 3** *(optional)* | Only needed if you want auto-import into the Media Pool |
| **Internet Connection** | Required for searching and downloading videos |

> ⚠️ **Note:** Workflow Integration Plugins are a **DaVinci Resolve Studio** feature. They are not available in the free version of DaVinci Resolve.

---

## 🚀 Installation

### Step 1: Locate the Plugins Directory

Find the Workflow Integration Plugins folder for your operating system:

| OS | Path |
|---|---|
| **Windows** | `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\` |
| **macOS** | `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/` |
| **Linux** | `/opt/resolve/Developer/Workflow Integration Plugins/` or `~/.local/share/DaVinciResolve/Support/Workflow Integration Plugins/` |

> 💡 **Tip:** If the `Workflow Integration Plugins` folder doesn't exist, create it manually.

### Step 2: Copy the Plugin

Copy the entire `PexelsBrowser` folder into the Workflow Integration Plugins directory:

```
Workflow Integration Plugins/
└── PexelsBrowser/
    ├── manifest.xml
    ├── index.html
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── api.js
    │   ├── app.js
    │   ├── download.js
    │   └── ui.js
    └── bridge/
        └── import_to_resolve.py
```

### Step 3: Restart DaVinci Resolve

Close and reopen DaVinci Resolve Studio for the plugin to be detected.

### Step 4: Open the Plugin

In DaVinci Resolve, go to:

```
Workspace → Workflow Integrations → Pexels Browser
```

The plugin panel will open within the Resolve interface.

---

## 🔧 First-Time Setup

### API Key

1. When you first open the plugin, you'll see the **onboarding screen**
2. Enter your Pexels API key (get one free at [pexels.com/api](https://www.pexels.com/api/))
3. Click **"Connect to Pexels"**
4. The key is saved locally in your browser storage — you only need to do this once

> You can update your API key anytime via the **Settings** panel (⚙ icon in the top-right).

### Download Folder

The plugin will ask where you'd like to save downloaded videos. You can change this anytime in **Settings → Download Folder**.

---

## 📖 How to Use

### Searching for Videos

1. Type a search term in the **search bar** (e.g., "ocean", "city timelapse", "nature")
2. Results will appear automatically after a short delay
3. Scroll down and click **"Load More"** for additional results

### Filtering Results

Use the **filter bar** below the search to narrow results:

| Filter | Options | Description |
|---|---|---|
| **Orientation** | All · Landscape · Portrait · Square | Filter by video aspect ratio |
| **Resolution** | All · 4K · Full HD · HD | Filter by minimum resolution |
| **Duration** | Min / Max (seconds) | Set a duration range |

Click a filter pill to activate it. Click **"All"** to reset that filter.

### Previewing Videos

- **Hover** over a video thumbnail to see a quick preview
- **Click** a video card to open the **full preview modal** with:
  - A full-size video player with playback controls
  - Video metadata (duration, resolution, orientation)
  - Photographer credit and link

### Downloading Videos

1. Click a video to open the preview modal
2. Scroll down to the **"Download Options"** section
3. Choose your preferred quality:
   - **4K** — 3840×2160 (Ultra HD)
   - **FHD** — 1920×1080 (Full HD)
   - **HD** — 1280×720 (HD)
   - **SD** — Lower resolutions
4. Click the **⬇ Download** button
5. Track progress in the **Downloads panel** (bottom-right corner)

Downloaded videos are saved to your configured download folder.

### Importing into the Timeline

**Option A — Manual Drag & Drop:**
1. Open your file manager and navigate to the download folder
2. Drag the downloaded `.mp4` file into the DaVinci Resolve **Media Pool**
3. From the Media Pool, drag it onto your **Timeline**

**Option B — Auto-Import with Python Bridge (recommended):**
See the [Auto-Import Bridge](#-auto-import-bridge) section below.

---

## 🔄 Auto-Import Bridge

The plugin includes a companion Python script that watches your download folder and automatically imports new videos into DaVinci Resolve's Media Pool.

### Setup

1. Make sure **Python 3** is installed on your system
2. Ensure DaVinci Resolve's scripting environment is set up:
   - The `RESOLVE_SCRIPT_API` environment variable should point to the Resolve scripting modules directory
   - See the [Resolve Scripting Guide](https://resolvedevdoc.readthedocs.io/) for setup instructions

### Usage

Open a terminal and run:

```bash
# Watch a folder and auto-import new videos
python3 bridge/import_to_resolve.py --watch /path/to/your/download/folder

# Or import a single file
python3 bridge/import_to_resolve.py --file /path/to/video.mp4
```

**Example:**

```bash
# Watch the Desktop for new downloads
python3 bridge/import_to_resolve.py --watch ~/Desktop

# Custom interval (check every 5 seconds instead of default 2)
python3 bridge/import_to_resolve.py --watch ~/Desktop --interval 5
```

### How It Works

1. The bridge script connects to the running DaVinci Resolve instance
2. It creates a **"Pexels Downloads"** folder in the Media Pool (if it doesn't exist)
3. It monitors the specified folder for new `.mp4`, `.mov`, `.avi`, or `.mkv` files
4. When a new file is detected (and fully downloaded), it's automatically imported
5. The script keeps running — press `Ctrl+C` to stop

> 💡 **Tip:** Keep this script running in a terminal alongside DaVinci Resolve for a seamless workflow. Downloaded videos will appear in **Media Pool → Pexels Downloads** automatically.

---

## ⚙ Settings

Access settings via the **⚙ gear icon** in the top-right corner:

| Setting | Description |
|---|---|
| **Pexels API Key** | Your Pexels API authentication key |
| **Download Folder** | Where downloaded videos are saved |

Click **"Save Settings"** to apply changes.

---

## 🗂 File Structure

```
PexelsBrowser/
├── manifest.xml              # Resolve plugin registration
├── index.html                # Main UI entry point
├── README.md                 # This file
├── css/
│   └── styles.css            # Dark-mode design system
├── js/
│   ├── api.js                # Pexels API client (search, popular, rate limiting)
│   ├── ui.js                 # UI rendering (grid, modal, filters, toasts)
│   ├── download.js           # Download manager with progress tracking
│   └── app.js                # Main application controller
└── bridge/
    └── import_to_resolve.py  # Python auto-import bridge
```

---

## ❓ Troubleshooting

### Plugin doesn't appear in Workspace → Workflow Integrations

- Verify you're using **DaVinci Resolve Studio** (not the free version)
- Check that the `PexelsBrowser` folder is in the correct plugins directory
- Ensure `manifest.xml` is at the root of the `PexelsBrowser` folder
- Restart DaVinci Resolve completely

### "Invalid API key" error

- Verify your API key at [pexels.com/api](https://www.pexels.com/api/)
- Make sure there are no extra spaces in the key
- Update the key in Settings (⚙)

### Videos won't load / search returns nothing

- Check your internet connection
- Make sure your API key is valid
- The Pexels API has a rate limit of 200 requests per hour — wait if exceeded

### Downloads not working

- Check that the download folder path exists and is writable
- In Settings, verify the folder path is correct
- If using the browser fallback, the file will be downloaded via your browser's download dialog

### Auto-import bridge can't connect to Resolve

- Make sure DaVinci Resolve is running before starting the bridge script
- Verify the `RESOLVE_SCRIPT_API` environment variable is set
- Check that scripting is enabled in Resolve: **DaVinci Resolve → Preferences → General → External scripting using: Local**

---

## 📄 License & Attribution

This plugin uses the [Pexels API](https://www.pexels.com/api/). All videos are provided by Pexels and their contributors under the [Pexels License](https://www.pexels.com/license/):

- ✅ Free for personal and commercial use
- ✅ No attribution required (but appreciated!)
- ❌ Do not sell unaltered copies of the videos
- ❌ Do not imply endorsement by Pexels or the photographer

---

## 🙏 Credits

- **Video content** provided by [Pexels](https://www.pexels.com) and their contributor community
- **Plugin** built for the DaVinci Resolve Workflow Integration framework
