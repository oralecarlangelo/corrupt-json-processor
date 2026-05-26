'use strict';

const http = require('http');
const { fetchUrlText } = require('../../../src/lib/source/fetch-url-text');

function startServer(handler) {
    return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({
                server,
                baseUrl: `http://127.0.0.1:${port}`,
                close: () =>
                    new Promise((res) => {
                        server.close(() => res());
                    }),
            });
        });
    });
}

describe('fetchUrlText (real local HTTP server)', () => {
    let ctx;

    afterEach(async () => {
        if (ctx) {
            await ctx.close();
            ctx = null;
        }
    });

    test('returns the response body for a 200', async () => {
        ctx = await startServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('hello world');
        });

        const text = await fetchUrlText(`${ctx.baseUrl}/ok`);
        expect(text).toBe('hello world');
    });

    test('follows redirects up to the limit', async () => {
        ctx = await startServer((req, res) => {
            if (req.url === '/start') {
                res.writeHead(302, { Location: `${ctx.baseUrl}/end` });
                res.end();
                return;
            }
            res.writeHead(200);
            res.end('arrived');
        });

        const text = await fetchUrlText(`${ctx.baseUrl}/start`);
        expect(text).toBe('arrived');
    });

    test('rejects when redirects exceed the cap', async () => {
        ctx = await startServer((req, res) => {
            res.writeHead(302, { Location: `${ctx.baseUrl}/loop` });
            res.end();
        });

        await expect(
            fetchUrlText(`${ctx.baseUrl}/loop`, { maxRedirects: 2 })
        ).rejects.toThrow(/Too many redirects/);
    });

    test('rejects on non-2xx status', async () => {
        ctx = await startServer((req, res) => {
            res.writeHead(500);
            res.end('boom');
        });

        await expect(fetchUrlText(`${ctx.baseUrl}/err`)).rejects.toThrow(/HTTP 500/);
    });

    test('rejects when the request times out', async () => {
        ctx = await startServer(() => {
            // Never respond — let the client timeout.
        });

        await expect(
            fetchUrlText(`${ctx.baseUrl}/slow`, { timeoutMs: 100 })
        ).rejects.toThrow(/timed out/);
    });
});
