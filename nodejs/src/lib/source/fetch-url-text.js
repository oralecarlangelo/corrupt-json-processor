'use strict';

const https = require('https');
const http = require('http');

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_REDIRECTS = 5;

/**
 * Fetch a URL and return its body as a UTF-8 string. Follows up to
 * `maxRedirects` 3xx responses and rejects on non-2xx status, network errors,
 * or timeout.
 *
 * Implemented against the built-in `http`/`https` modules so it has zero
 * dependencies and works on Node 18+.
 *
 * @param {string} url
 * @param {{ timeoutMs?: number, maxRedirects?: number }} [options]
 * @returns {Promise<string>}
 */
function fetchUrlText(url, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

    return new Promise((resolve, reject) => {
        const visit = (currentUrl, redirectsRemaining) => {
            const client = currentUrl.startsWith('https') ? https : http;
            const req = client.get(currentUrl, (res) => {
                const status = res.statusCode ?? 0;
                if (status >= 300 && status < 400 && res.headers.location) {
                    if (redirectsRemaining <= 0) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    res.resume();
                    visit(res.headers.location, redirectsRemaining - 1);
                    return;
                }
                if (status < 200 || status >= 300) {
                    reject(new Error(`HTTP ${status} for ${currentUrl}`));
                    return;
                }

                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                res.on('error', reject);
            });
            req.on('error', reject);
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
            });
        };
        visit(url, maxRedirects);
    });
}

module.exports = { fetchUrlText, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_REDIRECTS };
