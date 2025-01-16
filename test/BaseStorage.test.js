const should = require('should');
const Promise = require('bluebird');
const StorageBase = require('../BaseStorage');
const assert = require('assert').strict;

const MAX_FILENAME_BYTES = 255;

describe('Storage Base', function () {
    describe('sanitizeBasename', function () {
        it('sanitizeBasename: escape non accepted characters in filenames', function () {
            const storage = new StorageBase();
            storage.sanitizeBasename('(abc*@#123).zip').should.eql('-abc-@-123-.zip');
        });
    });

    describe('getUniquePathname', function () {
        it('accepts jpg', function () {
            const storage = new StorageBase();
            const pathname = storage.getUniquePathname({file: {name: 'something.jpg'}, targetDir: 'target-dir'});

            assert.match(pathname, /target-dir\/something-\w{16}\.jpg/);
        });

        it('accepts png', function () {
            const storage = new StorageBase();
            const pathname = storage.getUniquePathname({file: {name: 'something.png'}, targetDir: 'target-dir'});

            assert.match(pathname, /target-dir\/something-\w{16}\.png/);
        });

        it('accepts mp4', function () {
            const storage = new StorageBase();
            const pathname = storage.getUniquePathname({file: {name: 'something.mp4'}, targetDir: 'target-dir'});

            assert.match(pathname, /target-dir\/something-\w{16}\.mp4/);
        });

        it('ignores invalid extension .1', function () {
            const storage = new StorageBase();
            const pathname = storage.getUniquePathname({file: {name: 'something.1'}, targetDir: 'target-dir'});

            assert.match(pathname, /target-dir\/something.1-\w{16}/);
        });
    });

    describe('generateSecureHash', function () {
        it('should return a 16 character hash', function () {
            const storage = new StorageBase();
            assert.equal(storage.generateSecureHash().length, 16);
        });

        it('should return a different hash for each call', function () {
            const storage = new StorageBase();
            assert.notEqual(storage.generateSecureHash(), storage.generateSecureHash());
        });
    });

    describe('generateFilename', function () {
        it('should return a filename with the original name, a secured hash, suffix and extension', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const stem = 'something';
            const suffix = '_o';
            const ext = '.jpg';

            assert.equal(storage.generateFilename({stem, hash, suffix, ext}), `${stem}-${hash}${suffix}${ext}`);
        });

        it('should return a filename with the original name, a secured hash and suffix, when used without an extension', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const stem = 'something';
            const suffix = '_o';

            assert.equal(storage.generateFilename({stem, hash, suffix}), `${stem}-${hash}${suffix}`);
        });

        it('should return a filename with the original name, a secured hash and extension, when used without a suffix', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const stem = 'something';
            const ext = '.jpg';

            assert.equal(storage.generateFilename({stem, hash, ext}), `${stem}-${hash}${ext}`);
        });

        it('should return a filename with the original name and a secured hash, when used without a suffix and extension', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const stem = 'something';

            assert.equal(storage.generateFilename({stem, hash}), `${stem}-${hash}`);
        });

        it('should truncate the basename to be under MAX_FILENAME_BYTES', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const suffix = '_o';
            const ext = '.jpg';
            const lengthToRemove = '-'.length + hash.length + suffix.length + ext.length;
            const stem = 'a'.repeat(MAX_FILENAME_BYTES);
            const truncatedStem = 'a'.repeat(MAX_FILENAME_BYTES - lengthToRemove);

            assert.equal(storage.generateFilename({stem, hash, suffix, ext}), `${truncatedStem}-${hash}${suffix}${ext}`);
        });

        it('should truncate a multi-bytes basename to be under MAX_FILENAME_BYTES', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const suffix = '_o';
            const ext = '.jpg';
            const lengthToRemove = '-'.length + hash.length + suffix.length + ext.length;

            const stem = '🌴'.repeat(100); // 100 🌴 characters = 100 * 4 bytes = 400 bytes
            const truncatedStem = '🌴'.repeat((MAX_FILENAME_BYTES - lengthToRemove) / 4);

            assert.equal(storage.generateFilename({stem, hash, suffix, ext}), `${truncatedStem}-${hash}${suffix}${ext}`);
        });
    });
});
