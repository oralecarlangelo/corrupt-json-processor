'use strict';

const fs = require('fs/promises');

/**
 * Read a file's contents as a UTF-8 string. Thin async wrapper around
 * `fs.readFile` so that `loadTextSource` can treat URL and local-file
 * sources uniformly (both async).
 *
 * @param {string} filePath
 * @returns {Promise<string>}
 */
function readFileText(filePath) {
    return fs.readFile(filePath, 'utf8');
}

module.exports = { readFileText };
