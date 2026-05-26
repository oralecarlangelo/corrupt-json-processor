'use strict';

const { stripHtmlTags } = require('../../src/lib/strip-html-tags');

describe('stripHtmlTags', () => {
    test('strips listed open and close tags', () => {
        expect(stripHtmlTags('<b>hi</b>', ['b'])).toBe('hi');
    });

    test('does not strip tags not in the list (e.g. <span>)', () => {
        expect(stripHtmlTags('<span>hi</span>', ['b', 'i'])).toBe('<span>hi</span>');
    });

    test('strips multiple tag types in one pass', () => {
        expect(stripHtmlTags('<b>x</b> <i>y</i>', ['b', 'i'])).toBe('x y');
    });

    test('preserves inner content between tags', () => {
        expect(stripHtmlTags('Gadget <b>42</b>', ['b'])).toBe('Gadget 42');
    });

    test('is case-insensitive', () => {
        expect(stripHtmlTags('<B>x</B>', ['b'])).toBe('x');
    });

    test('tolerates attributes', () => {
        expect(stripHtmlTags('<b class="emph">x</b>', ['b'])).toBe('x');
    });

    test('tolerates self-closing form', () => {
        expect(stripHtmlTags('foo<br/>bar', ['br'])).toBe('foobar');
    });

    test('does not match a tag whose name starts with a listed tag (e.g. <bold>)', () => {
        expect(stripHtmlTags('<bold>x</bold>', ['b'])).toBe('<bold>x</bold>');
    });

    test('returns non-string input unchanged', () => {
        expect(stripHtmlTags(42, ['b'])).toBe(42);
        expect(stripHtmlTags(null, ['b'])).toBe(null);
        expect(stripHtmlTags(undefined, ['b'])).toBe(undefined);
    });

    test('returns input unchanged when tagNames is empty or not an array', () => {
        expect(stripHtmlTags('<b>x</b>', [])).toBe('<b>x</b>');
        expect(stripHtmlTags('<b>x</b>', null)).toBe('<b>x</b>');
    });

    test('throws TypeError on invalid tag name', () => {
        expect(() => stripHtmlTags('x', ['<script>'])).toThrow(TypeError);
        expect(() => stripHtmlTags('x', [''])).toThrow(TypeError);
        expect(() => stripHtmlTags('x', [42])).toThrow(TypeError);
    });
});
