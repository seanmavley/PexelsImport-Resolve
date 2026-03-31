/**
 * Pexels API Client
 * Handles all communication with the Pexels REST API.
 */
const PexelsAPI = (() => {
    const BASE_URL = 'https://api.pexels.com';
    const PER_PAGE = 24;

    // --- Rate Limiting ---
    let requestTimestamps = [];
    const RATE_LIMIT = 190; // stay under the 200/hour cap
    const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

    function _getApiKey() {
        return localStorage.getItem('pexels_api_key') || '';
    }

    function _checkRateLimit() {
        const now = Date.now();
        requestTimestamps = requestTimestamps.filter(t => now - t < RATE_WINDOW);
        if (requestTimestamps.length >= RATE_LIMIT) {
            throw new Error('Rate limit approaching. Please wait a few minutes before searching again.');
        }
        requestTimestamps.push(now);
    }

    async function _request(endpoint, params = {}) {
        const apiKey = _getApiKey();
        if (!apiKey) {
            throw new Error('NO_API_KEY');
        }

        _checkRateLimit();

        const url = new URL(`${BASE_URL}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && value !== 'all') {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': apiKey
            }
        });

        if (response.status === 401) {
            throw new Error('INVALID_API_KEY');
        }

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Search for videos.
     * @param {string} query - Search term
     * @param {Object} filters - {orientation, size}
     * @param {number} page - Page number
     */
    async function searchVideos(query, filters = {}, page = 1) {
        const params = {
            query,
            per_page: PER_PAGE,
            page,
            orientation: filters.orientation || undefined,
            size: filters.size || undefined,
        };

        const data = await _request('/videos/search', params);

        // Client-side duration filtering (API doesn't support duration param)
        if (filters.minDuration || filters.maxDuration) {
            data.videos = data.videos.filter(video => {
                const dur = video.duration;
                if (filters.minDuration && dur < filters.minDuration) return false;
                if (filters.maxDuration && dur > filters.maxDuration) return false;
                return true;
            });
        }

        return {
            videos: data.videos || [],
            totalResults: data.total_results || 0,
            page: data.page || page,
            perPage: data.per_page || PER_PAGE,
            nextPage: data.next_page || null,
            prevPage: data.prev_page || null,
        };
    }

    /**
     * Get popular / trending videos.
     */
    async function getPopularVideos(page = 1) {
        const data = await _request('/videos/popular', {
            per_page: PER_PAGE,
            page,
        });

        return {
            videos: data.videos || [],
            totalResults: data.total_results || 0,
            page: data.page || page,
            perPage: data.per_page || PER_PAGE,
            nextPage: data.next_page || null,
        };
    }

    /**
     * Get a single video by ID.
     */
    async function getVideo(id) {
        return _request(`/videos/videos/${id}`);
    }

    /**
     * Check if the stored API key is valid.
     */
    async function validateApiKey(key) {
        const prev = _getApiKey();
        localStorage.setItem('pexels_api_key', key);
        try {
            await _request('/videos/popular', { per_page: 1 });
            return true;
        } catch (e) {
            localStorage.setItem('pexels_api_key', prev);
            return false;
        }
    }

    function hasApiKey() {
        return !!_getApiKey();
    }

    function setApiKey(key) {
        localStorage.setItem('pexels_api_key', key);
    }

    function getRemainingRequests() {
        const now = Date.now();
        requestTimestamps = requestTimestamps.filter(t => now - t < RATE_WINDOW);
        return RATE_LIMIT - requestTimestamps.length;
    }

    return {
        searchVideos,
        getPopularVideos,
        getVideo,
        validateApiKey,
        hasApiKey,
        setApiKey,
        getRemainingRequests,
    };
})();
