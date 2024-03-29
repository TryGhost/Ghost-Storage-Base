const should = require('should'),
    Promise = require('bluebird'),
    StorageBase = require('../BaseStorage');

describe('Storage Base', function () {
    it('getSanitizedFileName: escape non accepted characters in filenames', function () {
        const storage = new StorageBase();
        storage.getSanitizedFileName('(abc*@#123).zip').should.eql('-abc-@-123-.zip');
    });

    it('getUniqueFileName: accepts jpg', function (done) {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            if (i < 2) {
                return Promise.resolve(true);
            } else {
                return Promise.resolve(false);
            }
        };

        storage.getUniqueFileName({name: 'something.jpg'}, 'target-dir')
            .then(function (filename) {
                filename.should.eql('target-dir/something-1.jpg');
                done();
            })
            .catch(done);
    });

    it('getUniqueFileName: accepts png', function (done) {
        const storage = new StorageBase();

        storage.exists = function () {
            return Promise.resolve(false);
        };

        storage.getUniqueFileName({name: 'something.png'}, 'target-dir')
            .then(function (filename) {
                filename.should.eql('target-dir/something.png');
                done();
            })
            .catch(done);
    });

    it('getUniqueFileName: accepts mp4', function (done) {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            if (i < 2) {
                return Promise.resolve(true);
            } else {
                return Promise.resolve(false);
            }
        };

        storage.getUniqueFileName({name: 'something.mp4'}, 'target-dir')
            .then(function (filename) {
                filename.should.eql('target-dir/something-1.mp4');
                done();
            })
            .catch(done);
    });

    it('getUniqueFileName: deny .1 extension', function (done) {
        const storage = new StorageBase();
        let i = 0;

        storage.exists = function () {
            i = i + 1;

            if (i < 2) {
                return Promise.resolve(true);
            } else {
                return Promise.resolve(false);
            }
        };

        storage.getUniqueFileName({name: 'something.1'}, 'target-dir')
            .then(function (filename) {
                filename.should.eql('target-dir/something.1-1');
                done();
            })
            .catch(done);
    });
});