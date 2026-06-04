import moment from 'moment';
import path from 'path';

interface StorageBase {
    exists(fileName: string, targetDir?: string): Promise<boolean>;
    save(file: {name: string; path: string; type?: string}, targetDir?: string): Promise<string>;
    serve(): unknown;
    delete(fileName: string, targetDir?: string): Promise<void>;
    read(options: {path: string}): Promise<Buffer>;

    saveRaw(buffer: Buffer, targetPath: string): Promise<string>;
    urlToPath(url: string): string;
}

class StorageBase {
    readonly requiredFns!: readonly ['exists', 'save', 'serve', 'delete', 'read'];

    protected declare storagePath: string;

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['exists', 'save', 'serve', 'delete', 'read'],
            writable: false
        });
    }

    getTargetDir(baseDir?: string | null): string {
        const date = moment(),
            month = date.format('MM'),
            year = date.format('YYYY');

        if (baseDir) {
            return path.join(baseDir, year, month);
        }

        return path.join(year, month);
    }

    generateUnique(dir: string, name: string, ext: string | null, i: number): Promise<string> {
        let filename: string,
            append = '';

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

    getUniqueFileName(file: {name: string}, targetDir: string): Promise<string> {
        const ext = path.extname(file.name);
        let name: string;

        // poor extension validation
        // .1 or .342 is not a valid extension, .mp4 is though!
        if (!ext.match(/\.\d+$/)) {
            name = this.getSanitizedFileName(path.basename(file.name, ext));
            return this.generateUnique(targetDir, name, ext, 0);
        } else {
            name = this.getSanitizedFileName(path.basename(file.name));
            return this.generateUnique(targetDir, name, null, 0);
        }
    }

    getSanitizedFileName(fileName: string): string {
        // below only matches ascii characters, @, and .
        // unicode filenames like город.zip would therefore resolve to ----.zip
        return fileName.replace(/[^\w@.]/gi, '-');
    }
}

export = StorageBase;
