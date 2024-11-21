const moment = require('moment');
const path = require('path');

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

        return baseDir ? path.join(baseDir, year, month) : path.join(year, month);
    }

    async generateUnique(dir, name, ext, i = 0) {
        let filename;
        let append = i ? `-${i}` : '';

        filename = ext ? `${name}${append}${ext}` : `${name}${append}`;

        const exists = await this.exists(filename, dir);
        if (exists) {
            return this.generateUnique(dir, name, ext, i + 1);
        } else {
            return path.join(dir, filename);
        }
    }

    async getUniqueFileName(file, targetDir) {
        const ext = path.extname(file.name);
        const name = this.getSanitizedFileName(path.basename(file.name, ext));

        return this.generateUnique(targetDir, name, ext.match(/\.\d+$/) ? null : ext);
    }

    getSanitizedFileName(fileName) {
        return fileName.replace(/[^\w@.]/gi, '-');
    }
}

module.exports = StorageBase;
