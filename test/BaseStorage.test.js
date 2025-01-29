const assert = require('assert').strict;
const path = require('path');

const StorageBase = require('../BaseStorage');
const MAX_FILENAME_BYTES = 253;

describe('Storage Base', function () {
    describe('sanitizeFileName', function () {
        it('replaces non-ascii characters by -- in filenames', function () {
            const storage = new StorageBase();
            assert.equal(storage.sanitizeFileName('(abc*@#123).zip'), '-abc-@-123-.zip');
        });

        it('leaves ascii characters as is', function () {
            const storage = new StorageBase();
            assert.equal(storage.sanitizeFileName('abc123.zip'), 'abc123.zip');
        });
    });

    describe('getFileExtension', function () {
        it('returns the extension of the file', function () {
            const storage = new StorageBase();
            assert.equal(storage.getFileExtension('abc123.zip'), '.zip');
        });

        it('returns an empty string if the extension is not a valid extension', function () {
            const storage = new StorageBase();
            assert.equal(storage.getFileExtension('abc123.1'), '');
        });

        it('returns an empty string if the file name has no extension', function () {
            const storage = new StorageBase();
            assert.equal(storage.getFileExtension('abc123'), '');
        });
    });

    describe('generateSecureHash', function () {
        it('returns a 16 character hash', function () {
            const storage = new StorageBase();
            assert.equal(storage.generateSecureHash().length, 16);
        });

        it('returns a different hash for each call', function () {
            const storage = new StorageBase();
            assert.notEqual(storage.generateSecureHash(), storage.generateSecureHash());
        });
    });

    describe('generateFilename', function () {
        it('returns a filename with the original name, a secured hash and extension', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const name = 'something';
            const ext = '.jpg';

            assert.equal(storage.generateFileName({name, hash, ext}), `${name}-${hash}${ext}`);
        });

        it('returns a filename with the original name and a secured hash when used without an extension', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const name = 'something';

            assert.equal(storage.generateFileName({name, hash}), `${name}-${hash}`);
        });

        it('truncates the basename to be under MAX_FILENAME_BYTES', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const ext = '.jpg';
            const lengthToRemove = '-'.length + hash.length + ext.length;

            const name = 'a'.repeat(MAX_FILENAME_BYTES);
            const truncatedName = 'a'.repeat(MAX_FILENAME_BYTES - lengthToRemove);

            assert.equal(storage.generateFileName({name, hash, ext}), `${truncatedName}-${hash}${ext}`);
        });

        it('truncates a multi-bytes basename to be under MAX_FILENAME_BYTES', function () {
            const storage = new StorageBase();
            const hash = 'a1b2c3d4e5f6';
            const ext = '.jpg';
            const lengthToRemove = '-'.length + hash.length + ext.length;

            const name = '🌴'.repeat(100); // 100 🌴 characters = 100 * 4 bytes = 400 bytes
            const truncatedName = '🌴'.repeat((MAX_FILENAME_BYTES - lengthToRemove) / 4);

            assert.equal(storage.generateFileName({name, hash, ext}), `${truncatedName}-${hash}${ext}`);
        });
    });

    describe('getUniqueSecureFilePath', function () {
        it('accepts a file with non-ascii characters', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: '(abc*@#123).zip'}, 'target-dir');

            assert.match(filePath, /target-dir\/-abc-@-123--\w{16}\.zip/);
        });

        it('accepts a file with a jpg extension', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: 'something.jpg'}, 'target-dir');

            assert.match(filePath, /target-dir\/something-\w{16}\.jpg/);
        });

        it('accepts a file with a png extension', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: 'something.png'}, 'target-dir');

            assert.match(filePath, /target-dir\/something-\w{16}\.png/);
        });

        it('accepts a file with a mp4 extension', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: 'something.mp4'}, 'target-dir');

            assert.match(filePath, /target-dir\/something-\w{16}\.mp4/);
        });

        it('accepts a file without extension', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: 'something'}, 'target-dir');

            assert.match(filePath, /target-dir\/something-\w{16}/);
        });

        it('accepts a file with an invalid extension .1', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: 'something.1'}, 'target-dir');

            assert.match(filePath, /target-dir\/something.1-\w{16}/);
        });

        it('does not generate the same filename when called 10 times with the same file', function () {
            const storage = new StorageBase();

            const filePaths = [];
            for (let i = 0; i < 10; i++) {
                filePaths.push(storage.getUniqueSecureFilePath({name: 'image.png'}, 'target-dir'));
            }

            assert.equal(filePaths.length, 10);
            assert.equal(filePaths.filter((filePath, index, self) => self.indexOf(filePath) === index).length, 10);
        });

        it('truncates an ascii filename to be under MAX_FILENAME_BYTES', function () {
            const storage = new StorageBase();
            const filePath = storage.getUniqueSecureFilePath({name: `a`.repeat(260) + '.png'}, 'target-dir');
            const fileName = path.basename(filePath);

            assert.equal(fileName.length, MAX_FILENAME_BYTES);
        });
    });
});
