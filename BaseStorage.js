const moment = require('moment');
const path = require('path');
const crypto = require('crypto');

// Most UNIX filesystems have a 255 bytes limit for the filename length
// We keep 2 additional bytes, to make space for a file suffix (e.g. "_o" for original files after transformation)
const MAX_FILENAME_BYTES = 253;

class StorageBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['exists', 'save', 'serve', 'delete', 'read'],
            writable: false
        });
    }

    /**
     * Returns the target directory for a given base directory
     *
     * @param {String} baseDir -- the base directory to save the file in
     * @returns {string} -- Returns a directory path with the format baseDir/YYYY/MM, e.g. content/images/2025/01
     */
    getTargetDir(baseDir) {
        const date = moment();
        const month = date.format('MM');
        const year = date.format('YYYY');

        if (baseDir) {
            return path.join(baseDir, year, month);
        }

        return path.join(year, month);
    }

    /**
     * Generates a unique and secure file path for a given file and target directory
     *
     * @param {Object} file
     * @param {String} file.name -- the name of the file
     * @param {String} targetDir -- the target directory to save the file in
     * @returns {string}
     */
    getUniqueSecureFilePath(file, targetDir) {
        const originalFileName = path.basename(file.name);
        const sanitizedFileName = this.sanitizeFileName(originalFileName);

        const ext = this.getFileExtension(sanitizedFileName); // e.g. ".png"
        const name = path.basename(sanitizedFileName, ext); // e.g. my-file
        const hash = this.generateSecureHash(); // e.g. 1a2b3c4d5e6f7890

        const newFileName = this.generateFileName({name, hash, ext}); // e.g. my-file-1a2b3c4d5e6f7890.png

        return path.join(targetDir, newFileName);
    }

    /**
     * Sanitizes the file name, to accept only ASCII characters, '@', and '.'
     * Replaces other characters with dashes.
     * Example: город.zip is replaced with ----.zip
     *
     * @param {String} fileName
     * @returns {String}
     */
    sanitizeFileName(fileName) {
        return fileName.replace(/[^\w@.]/gi, '-');
    }

    /**
     * Extracts the file extension from the filename, if it is a valid extension
     *
     * @param {string} fileName
     * @returns {string}
     */
    getFileExtension(filename) {
        const ext = path.extname(filename);

        // If the extension is not a valid extension, return an empty string
        if (!ext.match(/(\.[a-z0-9]{2,10})+$/i)) {
            return '';
        }

        return ext;
    }

    /**
     * Generates a secure hash for the filename, to make it very unlikely to be guessed and very likely to be unique
     * Uses 8 random bytes -> 8 * 8 = 64 bits of entropy -> 2^64 possible combinations (18 quintillion, i.e. 18 followed by 18 zeros)
     *
     * @returns {string}
     */
    generateSecureHash() {
        return crypto.randomBytes(8).toString('hex');
    }

        /**
     * Generates a filename with the following format: my-file-1a2b3c4d5e6f7890.png, with a filename length under MAX_FILENAME_LENGTH
     *
     * @param {String} name -- name of the file without extension, e.g. my-file. If needed, this will be truncated, so that the filename is under MAX_FILENAME_BYTES
     * @param {String} hash -- a secured hash to append the file, after the stem of the file, e.g. 1a2b3c4d5e6f
     * @param {String} ext -- the extension of the file, e.g. ".png"
     * @returns {String}
     */
    generateFileName({name, hash, ext = ''}) {
        const encoder = new TextEncoder();
        let filename = `${name}-${hash}${ext}`;

        const fileNameBytes = encoder.encode(filename);

        // If the filename has more bytes than the maximum allowed, truncate the name
        if (fileNameBytes.length > MAX_FILENAME_BYTES) {
            const nameBytes = encoder.encode(name);
            const bytesToRemove = fileNameBytes.length - MAX_FILENAME_BYTES;
            const truncatedNameBytes = nameBytes.slice(0, -bytesToRemove);

            const decoder = new TextDecoder();
            filename = `${decoder.decode(truncatedNameBytes)}-${hash}${ext}`;
        }

        return filename;
    }

    /**
     * [Deprecated] Returns a unique file path for a given file and target directory
     *
     * @param {Object} file
     * @param {string} file.name
     * @param {string} targetDir
     * @returns {Promise<string>}
     * @deprecated use getUniqueSecureFilePath instead
     */
    getUniqueFileName(file, targetDir) {
        logging.warn('getUniqueFileName is deprecated. Use getUniqueSecureFilePath instead.');

        var ext = path.extname(file.name), name;

        // poor extension validation
        // .1 or .342 is not a valid extension, .mp4 is though!
        if (!ext.match(/\.\d+$/)) {
            name = this.sanitizeFileName(path.basename(file.name, ext));
            return this.generateUnique(targetDir, name, ext, 0);
        } else {
            name = this.sanitizeFileName(path.basename(file.name));
            return this.generateUnique(targetDir, name, null, 0);
        }
    }

    /**
     * [Deprecated] Generates a unique file path using a numbering system, e.g. image.png, image-1.png, image-2.png, etc.
     * @param {String} dir
     * @param {String} name
     * @param {String} ext
     * @param {Number} i index
     * @returns {Promise<String>}
     * @deprecated use getUniqueSecureFilePath instead
     */
    generateUnique(dir, name, ext, i) {
        let filename;
        let append = '';

        if (i) {
            append = '-' + i;
        }

        if (ext) {
            filename = name + append + ext;
        } else {
            filename = name + append;
        }

        return this.exists(filename, dir).then((exists) => {
            if (exists) {
                i = i + 1;
                return this.generateUnique(dir, name, ext, i);
            } else {
                return path.join(dir, filename);
            }
        });
    }
}

module.exports = StorageBase;
