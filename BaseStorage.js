const moment = require('moment');
const path = require('path');
const crypto = require('crypto');

// Filesystems usually have a filename length limit -- 255 bytes is the standard limit on Unix-based systems
const MAX_FILENAME_BYTES = 255;

// When an uploaded file is transformed, we keep the original file with the '_o suffix
const ORIGINAL_SUFFIX = '_o';

class StorageBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['exists', 'save', 'serve', 'delete', 'read'],
            writable: false
        });
    }

    getTargetDir(baseDir) {
        const date = moment(),
            month = date.format('MM'),
            year = date.format('YYYY');

        if (baseDir) {
            return path.join(baseDir, year, month);
        }

        return path.join(year, month);
    }

    /** Generate a filename with the following format: my-file-1a2b3c4d5e6f_o.png, with a filename length under MAX_FILENAME_LENGTH
     *
     * @param {String} stem -- stem of the file without path nor extension, e.g. my-file. If needed, this will be truncated, so that the filename is under MAX_FILENAME_BYTES
     * @param {String} hash -- a secured hash to append the file, after the stem of the file, e.g. 1a2b3c4d5e6f
     * @param {String} ext -- the extension of the file, e.g. ".png"
     * @param {String} suffix -- optional, suffix to keep at the end of the stem, e.g. "_o"
     * @returns {String}
     */
    generateFilename({stem, hash, suffix = '', ext = ''}) {
        const encoder = new TextEncoder();
        let filename = `${stem}-${hash}${suffix}${ext}`;

        const fileNameBytes = encoder.encode(filename);

        // If the filename has more bytes than the maximum allowed, truncate the stem
        if (fileNameBytes.length > MAX_FILENAME_BYTES) {
            const stemBytes = encoder.encode(stem);
            const bytesToRemove = fileNameBytes.length - MAX_FILENAME_BYTES;
            const newStemBytes = stemBytes.slice(0, -bytesToRemove);

            const decoder = new TextDecoder();
            filename = `${decoder.decode(newStemBytes)}-${hash}${suffix}${ext}`;
        }

        return filename;
    }

    /** Generate a secure hash for the filename, to make it very unlikely to be guessed and very likely to be unique
     *  Uses 8 random bytes -> 8 * 8 = 64 bits of entropy -> 2^64 possible combinations (18 quintillion, i.e. 18 followed by 18 zeros)
     *
     *  @returns {String}
     */
    generateSecureHash() {
        return crypto.randomBytes(8).toString('hex');
    }

    /** Generate a unique and secure filename
     *
     * @param {String} stem -- stem of the file without path nor extension, e.g. my-file
     * @param {String} ext -- the extension of the file, e.g. ".png"
     * @param {String} suffix -- optional, suffix to keep at the end of the stem, e.g. "_o"
     * @returns {Promise<String>}
     */
    generateUniqueFilename({stem, suffix, ext}) {
        const hash = this.generateSecureHash();

        return this.generateFilename({stem, hash, suffix, ext});
    }

    /**
     * @param {Object} options
     * @param {Object} options.file
     * @param {String} options.file.name -- the name of the file
     * @param {String} options.file.suffix -- the suffix to use for the file, e.g. "_o"
     * @param {String} options.targetDir -- the target directory to save the file in
     * @returns {string} Generated unique file pathname
     */
    getUniquePathname({
        file: {
            name: fileName,
            suffix: fileSuffix = ORIGINAL_SUFFIX
        },
        targetDir
    }) {
        const basename = this.sanitizeBasename(path.basename(fileName));
        const ext = this.getFileExtension(basename);
        const suffix = this.getSuffix(basename, ext, fileSuffix);
        const stem = path.basename(basename, suffix + ext);

        const filename = this.generateUniqueFilename({stem, suffix, ext});

        return path.join(targetDir, filename);
    }

    /** Extracts the file extension from the filename, if it is a valid extension
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

    /** Extracts the given from the basename, if it exists
     *
     * @param {String} filename
     * @param {String} ext
     * @param {String} suffix
     * @returns {String}
     */
    getSuffix(filename, ext, suffix) {
        const stem = path.basename(filename, ext);

        // If the stem does not end with the suffix, return an empty string
        if (!stem.endsWith(suffix)) {
            return '';
        }

        return suffix;
    }

    /** Sanitizes the basename of the file, to accept only ASCII characters, '@', and '.'
     *  Replaces other characters with dashes.
     *  Example: город.zip is replaced with ----.zip
     *
     * @param {String} basename
     * @returns {String}
     */
    sanitizeBasename(basename) {
        return basename.replace(/[^\w@.]/gi, '-');
    }
}

module.exports = StorageBase;
