const moment = require('moment');
const path = require('path');
const crypto = require('crypto');

// Filesystems usually have a filename length limit -- 255 bytes is the standard limit on Unix-based systems
const MAX_FILENAME_BYTES = 255;

// When an uploaded file is transformed, the original file is stored with the suffix '_o'
const ORIGINAL_SUFFIX = '_o';

class StorageBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['exists', 'save', 'serve', 'delete', 'read'],
            writable: false
        });
    }

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
     * @param {Object} options
     * @param {Object} options.file
     * @param {String} options.file.name -- the name of the file
     * @param {String} options.file.suffix -- the suffix to use for the file, e.g. "_o"
     * @param {String} options.targetDir -- the target directory to save the file in
     * @returns {string}
     */
    getUniqueSecureFilePath({
        file: {
            name: fileName,
            suffix: fileSuffix = ORIGINAL_SUFFIX
        },
        targetDir
    }) {
        const sanitizedFileName = this.sanitizeFileName(path.basename(fileName));
        const ext = this.getFileExtension(sanitizedFileName);
        const suffix = this.getSuffix({fileName: sanitizedFileName, ext, suffix: fileSuffix});
        const stem = path.basename(sanitizedFileName, suffix + ext);
        const hash = this.generateSecureHash();

        const filename = this.generateFileName({stem, hash, suffix, ext});

        return path.join(targetDir, filename);
    }

    /** Sanitizes the file name, to accept only ASCII characters, '@', and '.'
     *  Replaces other characters with dashes.
     *  Example: город.zip is replaced with ----.zip
     *
     * @param {String} fileName
     * @returns {String}
     */
    sanitizeFileName(fileName) {
        return fileName.replace(/[^\w@.]/gi, '-');
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

    /** Extracts the given suffix from the file name, if it exists
     *
     * @param {Object} options
     * @param {String} options.fileName
     * @param {String} options.ext
     * @param {String} options.suffix
     * @returns {String}
     */
    getSuffix({fileName, ext = '', suffix = ''}) {
        const stem = path.basename(fileName, ext);

        // If the stem does not end with the suffix, return an empty string
        if (!stem.endsWith(suffix)) {
            return '';
        }

        return suffix;
    }

    /** Generate a secure hash for the filename, to make it very unlikely to be guessed and very likely to be unique
     *  Uses 8 random bytes -> 8 * 8 = 64 bits of entropy -> 2^64 possible combinations (18 quintillion, i.e. 18 followed by 18 zeros)
     *
     *  @returns {String}
     */
    generateSecureHash() {
        return crypto.randomBytes(8).toString('hex');
    }

    /** Generate a filename with the following format: my-file-1a2b3c4d5e6f_o.png, with a filename length under MAX_FILENAME_LENGTH
     *
     * @param {String} stem -- stem of the file without path nor extension, e.g. my-file. If needed, this will be truncated, so that the filename is under MAX_FILENAME_BYTES
     * @param {String} hash -- a secured hash to append the file, after the stem of the file, e.g. 1a2b3c4d5e6f
     * @param {String} ext -- the extension of the file, e.g. ".png"
     * @param {String} suffix -- optional, suffix to keep at the end of the stem, e.g. "_o"
     * @returns {String}
     */
    generateFileName({stem, hash, suffix = '', ext = ''}) {
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

    /** Deprecated: use getUniqueSecureFilePath instead
     * @param {Object} file
     * @param {String} file.name
     * @param {String} targetDir
     *
     * @returns {Promise<String>} unique file path
     * @deprecated
     */
    getUniqueFileName(file, targetDir) {
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
     * Deprecated alongside getUniqueFileName: use getUniqueSecureFilePath instead
     * @param {String} dir
     * @param {String} name
     * @param {String} ext
     * @param {Number} i index
     * @returns {Promise<String>}
     * @deprecated
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
