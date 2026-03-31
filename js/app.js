/**
 * Pexels Browser — Main Application Controller
 * Orchestrates API, UI, and Download modules.
 */
const App = (() => {
    // --- State ---
    let state = {
        query: '',
        filters: {},
        page: 1,
        totalResults: 0,
        hasMore: false,
        videos: [],
        isLoading: false,
        currentPreviewVideo: null,
    };

    const DEBOUNCE_MS = 350;
    let searchTimer = null;

    // --- Helpers ---
    function _getDefaultDownloadFolder() {
        try {
            if (typeof require !== 'undefined') {
                const os = require('os');
                const path = require('path');
                return path.join(os.homedir(), 'Desktop');
            }
        } catch (e) { /* not in Node */ }
        return '';
    }

    // --- Initialization ---
    function init() {
        UI.init();
        _bindEvents();
        _initDownloadListener();

        // Check for API key
        if (!PexelsAPI.hasApiKey()) {
            // No key found — show onboarding
        }

        // Check if download folder is set — will prompt on first download
        if (!localStorage.getItem('download_folder')) {
            // Default to user's home desktop; can be changed in settings
            localStorage.setItem('download_folder', _getDefaultDownloadFolder());
        }

        // If we have an API key, go straight to main screen
        if (PexelsAPI.hasApiKey()) {
            UI.hideOnboarding();
            _loadPopular();
        } else {
            UI.showOnboarding();
        }
    }

    // --- Event Bindings ---
    function _bindEvents() {
        // Onboarding
        const onboardingBtn = document.getElementById('onboarding-btn');
        const onboardingInput = document.getElementById('onboarding-api-key');
        onboardingBtn.addEventListener('click', _handleOnboardingSubmit);
        onboardingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') _handleOnboardingSubmit();
        });

        // Search
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        searchInput.addEventListener('input', _handleSearchInput);
        searchClear.addEventListener('click', () => {
            UI.clearSearch();
            state.query = '';
            _loadPopular();
        });

        // Filters — Orientation
        document.querySelectorAll('[data-filter="orientation"]').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('[data-filter="orientation"]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                _triggerSearch();
            });
        });

        // Filters — Resolution
        document.querySelectorAll('[data-filter="resolution"]').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('[data-filter="resolution"]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                _triggerSearch();
            });
        });

        // Filters — Duration
        const durationMin = document.getElementById('duration-min');
        const durationMax = document.getElementById('duration-max');
        durationMin.addEventListener('change', _triggerSearch);
        durationMax.addEventListener('change', _triggerSearch);

        // Load More
        document.getElementById('load-more-btn').addEventListener('click', _loadMore);

        // Modal
        document.getElementById('modal-backdrop').addEventListener('click', _closeModal);
        document.getElementById('modal-close').addEventListener('click', _closeModal);
        document.getElementById('preview-modal').addEventListener('click', (e) => e.stopPropagation());

        // Download buttons in modal (delegated)
        document.getElementById('modal-downloads').addEventListener('click', (e) => {
            const btn = e.target.closest('.download-btn');
            if (btn) _handleDownload(btn);
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', UI.openSettings);
        document.getElementById('settings-close').addEventListener('click', UI.closeSettings);
        document.getElementById('settings-save-btn').addEventListener('click', _handleSettingsSave);
        document.getElementById('browse-folder-btn').addEventListener('click', _handleBrowseFolder);

        // Download panel toggle
        document.getElementById('download-btn').addEventListener('click', () => {
            const panel = document.getElementById('download-panel');
            panel.classList.toggle('active');
        });
    }

    // --- Onboarding ---
    async function _handleOnboardingSubmit() {
        const input = document.getElementById('onboarding-api-key');
        const key = input.value.trim();
        if (!key) return;

        UI.setOnboardingLoading(true);
        UI.hideOnboardingError();

        const valid = await PexelsAPI.validateApiKey(key);
        if (valid) {
            PexelsAPI.setApiKey(key);
            UI.hideOnboarding();

            // Prompt for download folder
            const folder = await UI.pickFolder();
            if (folder) {
                localStorage.setItem('download_folder', folder);
            }

            _loadPopular();
        } else {
            UI.showOnboardingError('Invalid API key. Please check and try again.');
        }
        UI.setOnboardingLoading(false);
    }

    // --- Search ---
    function _handleSearchInput(e) {
        const q = e.target.value.trim();
        // Toggle clear button
        document.getElementById('search-clear').classList.toggle('visible', q.length > 0);

        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            if (q !== state.query) {
                state.query = q;
                _triggerSearch();
            }
        }, DEBOUNCE_MS);
    }

    function _triggerSearch() {
        state.page = 1;
        state.videos = [];
        state.filters = UI.getFilters();

        if (state.query) {
            _performSearch();
        } else {
            _loadPopular();
        }
    }

    async function _performSearch() {
        if (state.isLoading) return;
        state.isLoading = true;

        UI.showLoadingSkeletons();

        try {
            const result = await PexelsAPI.searchVideos(state.query, state.filters, state.page);
            state.videos = result.videos;
            state.totalResults = result.totalResults;
            state.hasMore = !!result.nextPage;

            if (result.videos.length === 0) {
                UI.showEmptyState(state.query);
            } else {
                UI.renderVideoGrid(result.videos, false);
            }
            UI.updateResultsCount(state.totalResults, state.query);
            UI.resetLoadMore(state.hasMore);
        } catch (err) {
            _handleApiError(err);
        } finally {
            state.isLoading = false;
        }
    }

    async function _loadPopular() {
        if (state.isLoading) return;
        state.isLoading = true;

        UI.showLoadingSkeletons();

        try {
            const result = await PexelsAPI.getPopularVideos(state.page);
            state.videos = result.videos;
            state.totalResults = result.totalResults;
            state.hasMore = !!result.nextPage;

            if (result.videos.length === 0) {
                UI.showEmptyState('');
            } else {
                UI.renderVideoGrid(result.videos, false);
            }
            UI.updateResultsCount(state.totalResults, '');
            UI.resetLoadMore(state.hasMore);
        } catch (err) {
            _handleApiError(err);
        } finally {
            state.isLoading = false;
        }
    }

    async function _loadMore() {
        if (state.isLoading || !state.hasMore) return;
        state.isLoading = true;
        state.page++;

        UI.showLoadingMore();

        try {
            const result = state.query
                ? await PexelsAPI.searchVideos(state.query, state.filters, state.page)
                : await PexelsAPI.getPopularVideos(state.page);

            state.videos = state.videos.concat(result.videos);
            state.hasMore = !!result.nextPage;

            UI.renderVideoGrid(result.videos, true);
            UI.resetLoadMore(state.hasMore);
        } catch (err) {
            _handleApiError(err);
            state.page--;
        } finally {
            state.isLoading = false;
        }
    }

    // --- Preview Modal ---
    function openPreview(video) {
        state.currentPreviewVideo = video;
        UI.showPreviewModal(video);
    }

    function _closeModal() {
        UI.hidePreviewModal();
        state.currentPreviewVideo = null;
    }

    // --- Download ---
    async function _handleDownload(btn) {
        const fileData = JSON.parse(btn.dataset.file);
        const videoId = btn.dataset.videoId;

        btn.classList.add('downloading');
        btn.textContent = '⏳ Starting...';

        try {
            await DownloadManager.downloadVideo(fileData, videoId);
            btn.textContent = '✓ Queued';
        } catch (err) {
            btn.classList.remove('downloading');
            btn.textContent = '⬇ Download';
            UI.showToast(`Download failed: ${err.message}`, 'error');
        }
    }

    function _initDownloadListener() {
        DownloadManager.onProgress((event) => {
            UI.updateDownloadPanel(DownloadManager.getQueue());
            if (event.type === 'complete') {
                UI.showToast(`Downloaded: ${event.item.filename}`, 'success');
                // Try to trigger Python bridge import
                _triggerAutoImport(event.item);
            }
            if (event.type === 'error') {
                UI.showToast(`Failed: ${event.item.filename} — ${event.error}`, 'error');
            }
        });
    }

    /**
     * After a successful download, attempt to trigger the Python bridge
     * to auto-import into DaVinci Resolve's Media Pool.
     */
    function _triggerAutoImport(item) {
        if (!item.filePath) return;

        try {
            if (typeof require !== 'undefined') {
                const { execFile } = require('child_process');
                const path = require('path');
                const bridgeScript = path.join(__dirname, '..', 'bridge', 'import_to_resolve.py');

                execFile('python3', [bridgeScript, '--file', item.filePath], (err, stdout, stderr) => {
                    if (err) {
                        console.warn('Auto-import failed:', err.message);
                        // Not critical — user can still drag from folder
                    } else {
                        console.log('Auto-imported:', stdout);
                        UI.showToast(`Imported to Media Pool: ${item.filename}`, 'success');
                    }
                });
            }
        } catch (e) {
            console.warn('Auto-import not available:', e.message);
        }
    }

    // --- Settings ---
    async function _handleSettingsSave() {
        const apiKey = document.getElementById('settings-api-key').value.trim();
        const downloadFolder = document.getElementById('settings-download-folder').value.trim();

        if (apiKey) {
            const valid = await PexelsAPI.validateApiKey(apiKey);
            if (valid) {
                PexelsAPI.setApiKey(apiKey);
                UI.showToast('API key updated', 'success');
            } else {
                UI.showToast('Invalid API key', 'error');
                return;
            }
        }

        if (downloadFolder) {
            localStorage.setItem('download_folder', downloadFolder);
            UI.showToast('Download folder updated', 'success');
        }

        UI.closeSettings();
    }

    async function _handleBrowseFolder() {
        const folder = await UI.pickFolder();
        if (folder) {
            document.getElementById('settings-download-folder').value = folder;
        }
    }

    // --- Error Handling ---
    function _handleApiError(err) {
        if (err.message === 'NO_API_KEY') {
            UI.showOnboarding();
        } else if (err.message === 'INVALID_API_KEY') {
            UI.showToast('Your API key is invalid. Please update it in Settings.', 'error');
        } else {
            UI.showToast(err.message, 'error');
        }
    }

    // Expose openPreview for card clicks
    return {
        init,
        openPreview,
    };
})();

// Boot
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
