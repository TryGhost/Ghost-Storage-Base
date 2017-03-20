var should = require('should'),
    StorageBase = require('../BaseStorage');

describe('Storage Base', function () {
    it('escape non accepted characters in filenames', function () {
        var storage = new StorageBase();
        storage.getSanitizedFileName('(abc*@#123).zip').should.eql('-abc-@-123-.zip');
    });
});