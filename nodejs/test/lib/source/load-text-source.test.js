'use strict';

const path = require('path');
const fs = require('fs/promises');
const os = require('os');

const {
    loadTextSource,
    isHttpUrl,
} = require('../../../src/lib/source/load-text-source');

describe('isHttpUrl', () => {
    test('recognises http and https URLs', () => {
        expect(isHttpUrl('http://example.com')).toBe(true);
        expect(isHttpUrl('https://example.com/path')).toBe(true);
        expect(isHttpUrl('HTTPS://EXAMPLE.COM')).toBe(true);
    });

    test('rejects file paths, ftp, and non-strings', () => {
        expect(isHttpUrl('./local.json')).toBe(false);
        expect(isHttpUrl('/abs/path.json')).toBe(false);
        expect(isHttpUrl('ftp://example.com')).toBe(false);
        expect(isHttpUrl(42)).toBe(false);
        expect(isHttpUrl(null)).toBe(false);
    });
});

describe('loadTextSource', () => {
    test('delegates to fetchUrlText for http(s) sources', async () => {
        const fetchUrlText = jest.fn().mockResolvedValue('fetched');
        const readFileText = jest.fn();

        const text = await loadTextSource('https://example.com/x.json', {
            fetchUrlText,
            readFileText,
        });

        expect(text).toBe('fetched');
        expect(fetchUrlText).toHaveBeenCalledWith('https://example.com/x.json');
        expect(readFileText).not.toHaveBeenCalled();
    });

    test('delegates to readFileText for local paths', async () => {
        const fetchUrlText = jest.fn();
        const readFileText = jest.fn().mockResolvedValue('on-disk');

        const text = await loadTextSource('./fixtures/x.json', {
            fetchUrlText,
            readFileText,
        });

        expect(text).toBe('on-disk');
        expect(readFileText).toHaveBeenCalledWith('./fixtures/x.json');
        expect(fetchUrlText).not.toHaveBeenCalled();
    });

    test('reads an actual file when no deps are injected', async () => {
        const tmpFile = path.join(os.tmpdir(), `lts-${Date.now()}.txt`);
        await fs.writeFile(tmpFile, 'hello on disk', 'utf8');
        try {
            await expect(loadTextSource(tmpFile)).resolves.toBe('hello on disk');
        } finally {
            await fs.unlink(tmpFile);
        }
    });
});
