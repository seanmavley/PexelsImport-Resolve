/**
 * UI Rendering Engine
 * Handles all DOM manipulation, rendering, and user interaction.
 */
const UI = (() => {
    // --- DOM References (populated on init) ---
    let els = {};

    function init() {
        els = {
            app: document.getElementById('app'),
            onboarding: document.getElementById('onboarding-screen'),
            mainScreen: document.getElementById('main-screen'),
            searchInput: document.getElementById('search-input'),
            searchClear: document.getElementById('search-clear'),
            videoGrid: document.getElementById('video-grid'),
            resultsCount: document.getElementById('results-count'),
            resultsBar: document.getElementById('results-bar'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            loadMoreContainer: document.getElementById('load-more-container'),
            // Filters
            filterOrientation: document.querySelectorAll('[data-filter="orientation"]'),
            filterResolution: document.querySelectorAll('[data-filter="resolution"]'),
            durationMin: document.getElementById('duration-min'),
            durationMax: document.getElementById('duration-max'),
            // Modal
            modalBackdrop: document.getElementById('modal-backdrop'),
            modal: document.getElementById('preview-modal'),
            modalClose: document.getElementById('modal-close'),
            modalVideo: document.getElementById('modal-video'),
            modalTitle: document.getElementById('modal-title'),
            modalAuthor: document.getElementById('modal-author'),
            modalMeta: document.getElementById('modal-meta'),
            modalDownloads: document.getElementById('modal-downloads'),
            // Settings
            settingsPanel: document.getElementById('settings-panel'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsClose: document.getElementById('settings-close'),
            apiKeyInput: document.getElementById('settings-api-key'),
            downloadFolderInput: document.getElementById('settings-download-folder'),
            settingsSaveBtn: document.getElementById('settings-save-btn'),
            browseFolderBtn: document.getElementById('browse-folder-btn'),
            // Download panel
            downloadPanel: document.getElementById('download-panel'),
            downloadPanelBody: document.getElementById('download-panel-body'),
            downloadBtn: document.getElementById('download-btn'),
            downloadBadge: document.getElementById('download-badge'),
            // Onboarding
            onboardingInput: document.getElementById('onboarding-api-key'),
            onboardingBtn: document.getElementById('onboarding-btn'),
            onboardingError: document.getElementById('onboarding-error'),
            // Toast
            toastContainer: document.getElementById('toast-container'),
        };
    }

    // --- Onboarding ---
    function showOnboarding() {
        els.onboarding.classList.remove('hidden');
        els.mainScreen.classList.add('hidden');
    }

    function hideOnboarding() {
        els.onboarding.classList.add('hidden');
        els.mainScreen.classList.remove('hidden');
    }

    function setOnboardingLoading(loading) {
        els.onboardingBtn.disabled = loading;
        els.onboardingBtn.textContent = loading ? 'Validating...' : 'Connect to Pexels';
    }

    function showOnboardingError(msg) {
        els.onboardingError.textContent = msg;
        els.onboardingError.classList.add('visible');
    }

    function hideOnboardingError() {
        els.onboardingError.classList.remove('visible');
    }

    // --- Video Grid ---
    function renderVideoGrid(videos, append = false) {
        if (!append) {
            els.videoGrid.innerHTML = '';
        }

        videos.forEach((video, idx) => {
            const card = _createVideoCard(video, append ? els.videoGrid.children.length + idx : idx);
            els.videoGrid.appendChild(card);
        });
    }

    function _createVideoCard(video, index) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;
        card.dataset.videoId = video.id;

        // Find best thumbnail image
        const thumb = video.image || '';
        // Find preview video (smallest file for hover preview)
        const previewFile = _getPreviewFile(video.video_files);
        // Get best resolution info
        const bestFile = _getBestFile(video.video_files);
        const resLabel = bestFile ? `${bestFile.width}×${bestFile.height}` : '';
        const qualityBadge = _getQualityBadge(bestFile);
        const duration = _formatDuration(video.duration);

        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${thumb}" alt="Video by ${_escapeHtml(video.user.name)}" loading="lazy">
                ${previewFile ? `<video src="${previewFile.link}" muted loop preload="none"></video>` : ''}
                <div class="video-badges">
                    <span class="badge badge-duration">${duration}</span>
                    <span class="badge ${qualityBadge.class}">${qualityBadge.label}</span>
                </div>
                <div class="play-overlay">
                    <div class="play-button"></div>
                </div>
            </div>
            <div class="video-info">
                <div class="video-author">
                    <div class="author-avatar">${video.user.name.charAt(0).toUpperCase()}</div>
                    <span class="author-name">${_escapeHtml(video.user.name)}</span>
                </div>
                <span class="video-resolution">${resLabel}</span>
            </div>
        `;

        // Hover: play preview
        card.addEventListener('mouseenter', () => {
            const vid = card.querySelector('.video-thumbnail video');
            if (vid) {
                vid.currentTime = 0;
                vid.play().catch(() => {});
            }
        });
        card.addEventListener('mouseleave', () => {
            const vid = card.querySelector('.video-thumbnail video');
            if (vid) {
                vid.pause();
                vid.currentTime = 0;
            }
        });

        // Click: open modal
        card.addEventListener('click', () => {
            if (window.App && window.App.openPreview) {
                window.App.openPreview(video);
            }
        });

        return card;
    }

    function _getPreviewFile(files) {
        if (!files || !files.length) return null;
        // Get smallest mp4 for hover preview
        const mp4s = files.filter(f => f.file_type === 'video/mp4');
        if (!mp4s.length) return files[0];
        mp4s.sort((a, b) => (a.width || 0) - (b.width || 0));
        return mp4s[0];
    }

    function _getBestFile(files) {
        if (!files || !files.length) return null;
        const mp4s = files.filter(f => f.file_type === 'video/mp4');
        if (!mp4s.length) return files[0];
        mp4s.sort((a, b) => (b.width || 0) - (a.width || 0));
        return mp4s[0];
    }

    function _getQualityBadge(file) {
        if (!file) return { label: 'SD', class: 'badge-hd' };
        const w = file.width || 0;
        if (w >= 3840) return { label: '4K', class: 'badge-4k' };
        if (w >= 1920) return { label: 'FHD', class: 'badge-hd' };
        if (w >= 1280) return { label: 'HD', class: 'badge-hd' };
        return { label: 'SD', class: '' };
    }

    function _formatDuration(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Results bar ---
    function updateResultsCount(total, query) {
        if (total > 0) {
            els.resultsBar.classList.remove('hidden');
            els.resultsCount.innerHTML = query
                ? `<span>${total.toLocaleString()}</span> results for "${_escapeHtml(query)}"`
                : `<span>${total.toLocaleString()}</span> trending videos`;
        } else {
            els.resultsBar.classList.add('hidden');
        }
    }

    // --- Loading States ---
    function showLoadingSkeletons(count = 12) {
        els.videoGrid.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skel = document.createElement('div');
            skel.className = 'skeleton-card';
            skel.innerHTML = `
                <div class="skeleton-thumb"></div>
                <div class="skeleton-info">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-text"></div>
                </div>
            `;
            els.videoGrid.appendChild(skel);
        }
    }

    function showLoadingMore() {
        els.loadMoreBtn.disabled = true;
        els.loadMoreBtn.innerHTML = '<div class="spinner"></div>';
    }

    function resetLoadMore(hasMore) {
        els.loadMoreBtn.disabled = false;
        els.loadMoreBtn.textContent = 'Load More';
        els.loadMoreContainer.classList.toggle('hidden', !hasMore);
    }

    // --- Empty State ---
    function showEmptyState(query) {
        els.videoGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🎬</div>
                <div class="empty-title">No videos found</div>
                <div class="empty-desc">Try a different search term or adjust your filters</div>
            </div>
        `;
        els.loadMoreContainer.classList.add('hidden');
    }

    // --- Preview Modal ---
    function showPreviewModal(video) {
        // Set video
        const bestFile = _getBestFile(video.video_files);
        els.modalVideo.src = bestFile ? bestFile.link : '';
        els.modalVideo.load();

        // Title & author
        els.modalTitle.textContent = `Video #${video.id}`;
        els.modalAuthor.innerHTML = `by <a href="${video.user.url}" target="_blank" rel="noopener">${_escapeHtml(video.user.name)}</a>`;

        // Metadata
        els.modalMeta.innerHTML = `
            <div class="meta-item">
                <span class="meta-icon">⏱</span>
                ${_formatDuration(video.duration)}
            </div>
            <div class="meta-item">
                <span class="meta-icon">📐</span>
                ${bestFile ? `${bestFile.width}×${bestFile.height}` : 'N/A'}
            </div>
            ${video.width && video.height ? `
            <div class="meta-item">
                <span class="meta-icon">🖼</span>
                ${video.width > video.height ? 'Landscape' : video.width < video.height ? 'Portrait' : 'Square'}
            </div>` : ''}
        `;

        // Download options
        const mp4Files = (video.video_files || [])
            .filter(f => f.file_type === 'video/mp4')
            .sort((a, b) => (b.width || 0) - (a.width || 0));

        els.modalDownloads.innerHTML = mp4Files.map(file => {
            const w = file.width || 0;
            let qClass = 'sd';
            let qLabel = 'SD';
            if (w >= 3840) { qClass = 'uhd'; qLabel = '4K'; }
            else if (w >= 1920) { qClass = 'hd'; qLabel = 'FHD'; }
            else if (w >= 1280) { qClass = 'hd'; qLabel = 'HD'; }

            return `
                <div class="download-option">
                    <div class="download-option-info">
                        <span class="download-quality-badge ${qClass}">${qLabel}</span>
                        <span class="download-specs">${file.width}×${file.height} · ${file.quality || 'mp4'}</span>
                    </div>
                    <button class="download-btn" data-file-id="${file.id}" data-video-id="${video.id}"
                            data-file='${JSON.stringify(file).replace(/'/g, "&apos;")}'>
                        ⬇ Download
                    </button>
                </div>
            `;
        }).join('');

        // Show modal
        els.modalBackdrop.classList.add('active');
        els.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hidePreviewModal() {
        els.modalBackdrop.classList.remove('active');
        els.modal.classList.remove('active');
        els.modalVideo.pause();
        els.modalVideo.src = '';
        document.body.style.overflow = '';
    }

    // --- Settings Panel ---
    function openSettings() {
        els.apiKeyInput.value = localStorage.getItem('pexels_api_key') || '';
        els.downloadFolderInput.value = localStorage.getItem('download_folder') || '';
        els.settingsPanel.classList.add('active');
    }

    function closeSettings() {
        els.settingsPanel.classList.remove('active');
    }

    // --- Download Panel ---
    function updateDownloadPanel(queue) {
        const active = queue.filter(i => i.status === 'downloading' || i.status === 'queued');
        const completed = queue.filter(i => i.status === 'complete');
        const hasItems = queue.length > 0;

        // Badge
        if (active.length > 0) {
            els.downloadBadge.textContent = active.length;
            els.downloadBadge.classList.add('visible');
        } else {
            els.downloadBadge.classList.remove('visible');
        }

        // Panel visibility
        els.downloadPanel.classList.toggle('active', hasItems);

        // Render items
        els.downloadPanelBody.innerHTML = queue.map(item => {
            let statusText = '';
            let icon = '📥';
            if (item.status === 'queued') { statusText = 'Queued'; icon = '⏳'; }
            else if (item.status === 'downloading') {
                statusText = `${item.progress}% · ${_formatBytes(item.downloaded)} / ${_formatBytes(item.size)}`;
                icon = '⬇';
            }
            else if (item.status === 'complete') { statusText = 'Complete'; icon = '✅'; }
            else if (item.status === 'error') { statusText = `Error: ${item.error}`; icon = '❌'; }

            return `
                <div class="download-queue-item">
                    <div class="download-item-icon">${icon}</div>
                    <div class="download-item-info">
                        <div class="download-item-name">${_escapeHtml(item.filename)}</div>
                        <div class="download-item-status">${statusText}</div>
                        ${item.status === 'downloading' ? `
                        <div class="download-progress-bar">
                            <div class="download-progress-fill" style="width: ${item.progress}%"></div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function _formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    // --- Toast ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        els.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- Search ---
    function getSearchQuery() {
        return els.searchInput.value.trim();
    }

    function clearSearch() {
        els.searchInput.value = '';
        els.searchClear.classList.remove('visible');
    }

    // --- Filters ---
    function getFilters() {
        let orientation = 'all';
        els.filterOrientation.forEach(pill => {
            if (pill.classList.contains('active')) orientation = pill.dataset.value;
        });

        let resolution = 'all';
        els.filterResolution.forEach(pill => {
            if (pill.classList.contains('active')) resolution = pill.dataset.value;
        });

        const minDur = parseInt(els.durationMin.value) || 0;
        const maxDur = parseInt(els.durationMax.value) || 0;

        return {
            orientation: orientation !== 'all' ? orientation : undefined,
            size: resolution !== 'all' ? resolution : undefined,
            minDuration: minDur || undefined,
            maxDuration: maxDur || undefined,
        };
    }

    // --- Folder Picker ---
    async function pickFolder() {
        // Try Electron dialog
        try {
            if (typeof require !== 'undefined') {
                const { dialog } = require('electron').remote || require('@electron/remote');
                const result = await dialog.showOpenDialog({
                    properties: ['openDirectory'],
                    title: 'Choose Download Folder',
                });
                if (!result.canceled && result.filePaths.length > 0) {
                    return result.filePaths[0];
                }
            }
        } catch (e) {
            // Not in Electron or remote not available
        }
        // Fallback: prompt
        const folder = prompt(
            'Enter the full path to your download folder:',
            localStorage.getItem('download_folder') || ''
        );
        return folder;
    }

    return {
        init,
        showOnboarding,
        hideOnboarding,
        setOnboardingLoading,
        showOnboardingError,
        hideOnboardingError,
        renderVideoGrid,
        updateResultsCount,
        showLoadingSkeletons,
        showLoadingMore,
        resetLoadMore,
        showEmptyState,
        showPreviewModal,
        hidePreviewModal,
        openSettings,
        closeSettings,
        updateDownloadPanel,
        showToast,
        getSearchQuery,
        clearSearch,
        getFilters,
        pickFolder,
    };
})();
