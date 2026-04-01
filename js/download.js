/**
 * Download Manager
 * Handles downloading video files from Pexels CDN with progress tracking.
 */
const DownloadManager = (() => {
    const queue = [];
    let activeDownloads = 0;
    const MAX_CONCURRENT = 2;
    const listeners = new Set();
    const _controllers = new Map(); // Store abort controllers / request objects keyed by item.id

    function _notify(event) {
        listeners.forEach(fn => fn(event));
    }

    function onProgress(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function _formatFilename(videoId, width, height) {
        return `pexels_${videoId}_${width}x${height}.mp4`;
    }

    /**
     * Download a video file. In a browser context this triggers a save-as download.
     * In Electron (Resolve Workflow Integration), it may have fs access.
     */
    async function downloadVideo(videoFile, videoId) {
        const filename = _formatFilename(videoId, videoFile.width, videoFile.height);

        const downloadItem = {
            id: `${videoId}_${videoFile.id}`,
            filename,
            progress: 0,
            status: "queued",
            url: videoFile.link,
            size: 0,
            downloaded: 0,
        };

        queue.push(downloadItem);
        _notify({ type: "queued", item: downloadItem });

        _processQueue();

        return downloadItem;
    }

    async function _processQueue() {
        if (activeDownloads >= MAX_CONCURRENT) return;

        const next = queue.find((item) => item.status === "queued");
        if (!next) return;

        next.status = "downloading";
        activeDownloads++;
        _notify({ type: "started", item: next });

        try {
            // Check if we have Node.js fs access (Electron / Resolve context)
            const hasNodeFS = typeof require !== "undefined";

            if (hasNodeFS) {
                await _downloadWithNode(next);
            } else {
                await _downloadWithBrowser(next);
            }

            if (next.status !== "cancelled") {
                next.status = "complete";
                next.progress = 100;
                _notify({ type: "complete", item: next });
            }
        } catch (err) {
            if (err.message === "CANCELLED" || next.status === "cancelled") {
                next.status = "cancelled";
                _notify({ type: "cancelled", item: next });
            } else {
                next.status = "error";
                next.error = err.message;
                _notify({ type: "error", item: next, error: err.message });
            }
        } finally {
            _controllers.delete(next.id);
            activeDownloads--;
            _processQueue();
        }
    }

    /**
     * Browser-based download using anchor click.
     */
    async function _downloadWithBrowser(item) {
        const controller = new AbortController();
        _controllers.set(item.id, { abort: () => controller.abort() });

        const response = await fetch(item.url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const reader = response.body.getReader();
        const contentLength = +response.headers.get("Content-Length") || 0;
        item.size = contentLength;

        const chunks = [];
        let receivedLength = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                item.downloaded = receivedLength;
                item.progress = contentLength ? Math.round((receivedLength / contentLength) * 100) : 0;
                _notify({ type: "progress", item: { ...item } });
            }

            const blob = new Blob(chunks, { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = item.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            if (err.name === "AbortError") throw new Error("CANCELLED");
            throw err;
        }
    }

    /**
     * Node.js / Electron download with filesystem write.
     */
    async function _downloadWithNode(item) {
        try {
            const fs = require("fs");
            const path = require("path");
            const https = require("https");
            const http = require("http");

            const downloadDir = localStorage.getItem("download_folder") || path.join(__dirname, "..", "downloads");

            // Create downloads dir if needed
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            const filePath = path.join(downloadDir, item.filename);

            return new Promise((resolve, reject) => {
                const protocol = item.url.startsWith("https") ? https : http;
                const options = new URL(item.url);

                const request = protocol.get(item.url, (response) => {
                    // Follow redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectProtocol = response.headers.location.startsWith("https") ? https : http;
                        const redirRequest = redirectProtocol.get(response.headers.location, (res) => {
                            _handleNodeResponse(res, filePath, item, resolve, reject, fs);
                        });
                        redirRequest.on("error", reject);
                        _controllers.set(item.id, {
                            request: redirRequest,
                            filePath,
                            fs,
                            reject,
                        });
                        return;
                    }
                    _handleNodeResponse(response, filePath, item, resolve, reject, fs);
                });

                request.on("error", reject);
                _controllers.set(item.id, {
                    request,
                    filePath,
                    fs,
                    reject,
                });
            });
        } catch (e) {
            // Fallback to browser download
            await _downloadWithBrowser(item);
        }
    }

    function _handleNodeResponse(response, filePath, item, resolve, reject, fs) {
        const contentLength = parseInt(response.headers["content-length"], 10) || 0;
        item.size = contentLength;
        let receivedLength = 0;

        const fileStream = fs.createWriteStream(filePath);

        // Store filestream for cancellation
        const ctrl = _controllers.get(item.id);
        if (ctrl) ctrl.fileStream = fileStream;

        response.pipe(fileStream);

        response.on("data", (chunk) => {
            receivedLength += chunk.length;
            item.downloaded = receivedLength;
            item.progress = contentLength ? Math.round((receivedLength / contentLength) * 100) : 0;
            _notify({ type: "progress", item: { ...item } });
        });

        fileStream.on("finish", () => {
            item.filePath = filePath;
            resolve();
        });

        fileStream.on("error", (err) => {
            if (err.message === "CANCELLED") return; // Handled by cancelDownload
            reject(err);
        });
    }

    function cancelDownload(id) {
        const item = queue.find((i) => i.id === id);
        if (!item) return;

        if (item.status === "queued") {
            item.status = "cancelled";
            _notify({ type: "cancelled", item });
            return;
        }

        if (item.status === "downloading") {
            item.status = "cancelled";
            const ctrl = _controllers.get(id);

            if (ctrl) {
                // Browser context
                if (ctrl.abort) ctrl.abort();

                // Node context
                if (ctrl.request) ctrl.request.destroy();
                if (ctrl.fileStream) ctrl.fileStream.destroy();

                // Cleanup partial file
                if (ctrl.filePath && ctrl.fs && ctrl.fs.existsSync(ctrl.filePath)) {
                    try {
                        ctrl.fs.unlinkSync(ctrl.filePath);
                    } catch (e) {
                        console.error("Failed to delete partial file:", e);
                    }
                }

                if (ctrl.reject) ctrl.reject(new Error("CANCELLED"));
            }
        }
    }

    function getQueue() {
        return [...queue];
    }

    function getActiveCount() {
        return activeDownloads;
    }

    function clearCompleted() {
        const remaining = queue.filter((item) => item.status !== "complete" && item.status !== "cancelled");
        queue.length = 0;
        queue.push(...remaining);
        _notify({ type: "cleared" });
    }

    return {
        downloadVideo,
        onProgress,
        getQueue,
        getActiveCount,
        clearCompleted,
        cancelDownload,
    };
})();

