/*!
 * Node Dropbox 'Client' test module
 *
 * Copyright(c) 2011 Luis merino <mail AT luismerino DOT name>
 * FreeBSD License
 */

require.paths.unshift(__dirname + '/../../support');

var Path = require('path');
var AsyncTest = require('async/lib/test');
var Auth = require('../../lib/auth');
var Helpers = require('../helpers');
var Fs = require('fs');
var assert = require('assert');

/**
 * Fileops testing functions
 */
function test_delete_file(next) {
    this.client['delete']('dropbox', '/tohere', next);
}

function test_put_file(next) {
    var self = this;
    var path = '/file with spaces.txt';
    
    Fs.readFile(__dirname + '/../fixtures' + path, 'utf8', function(err, data) {
        assert.ifError(err);
        self.client.putFile('dropbox', path, data, function(err, data, resp) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);
            assert.ok(data.result);
            next(null, path);
        });
    });
}

function test_put_image(next) {
    var self = this;
    var path = '/sample_photo.jpg';
    
    Fs.readFile(__dirname + '/../fixtures' + path, 'binary', function(err, data) {
        assert.ifError(err);
        self.client.putFile('dropbox', path, data, 'image/jpg', function(err, data, resp) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);
            assert.ok(data.result);
            next(null, path);
        });
    });
}

function test_create_folder(next) {
    var self = this;
    var path = '/tohere';
    
    this.client.createFolder('dropbox', path, function(err, data, resp) {
        assert.ifError(err);
        assert.ok(resp.statusCode === 200 || resp.statusCode === 201);
        
        var properties = ['revision', 'thumb_exists', 'bytes', 'modified', 'path', 'is_dir', 'size', 'root', 'icon'];
        Object.keys(data).forEach(function(k) {
            assert.notEqual(properties.indexOf(k), -1,
                'Parameter \'' + k + '\' is not in the returned metadata.');
        });
        
        test_delete_file.call(self, next);
    });
}

function test_file_copy(next) {
    var fromPath = '/file with spaces.txt';
    var toPath = '/tohere/file with spaces.txt';
    var self = this;
    
    this.client.copy('dropbox', fromPath, toPath, function(err, data, resp) {
        assert.ifError(err);
        assert.equal(resp.statusCode, 200);
        
        var properties = ['revision', 'thumb_exists', 'bytes', 'modified', 'path', 'is_dir', 'size', 'root', 'mime_type', 'icon'];
        Object.keys(data).forEach(function(k) {
            assert.notEqual(properties.indexOf(k), -1,
                'Parameter \'' + k + '\' is not in the returned metadata.');
        });
        
        next();
    });
}

function test_file_move(next) {
    var fromPath = '/tohere/file with spaces.txt';
    var toPath = '/tohere/file with spaces.txt.temp';
    var self = this;
    
    this.client.move('dropbox', fromPath, toPath, function(err, data, resp) {
        assert.ifError(err);
        assert.equal(resp.statusCode, 200);
        
        self.client['delete']('dropbox', toPath, function(err, data, resp) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);
            
            var properties = ['revision', 'is_deleted', 'thumb_exists', 'bytes', 'modified', 'path', 'is_dir', 'size', 'root', 'mime_type', 'icon'];
            Object.keys(data).forEach(function(k) {
                assert.notEqual(properties.indexOf(k), -1,
                    'Parameter \'' + k + '\' is not in the returned metadata.');
            });
            
            next();
        });
    });
}

/**
 * Test suite
 */
var tests = {
    
    name: 'client',
    
    setUpSuite: function(next) {
        if (!this.accessToken)
            this.accessToken = testcase.argv[0] || process.argv[2];
        if (!this.accessTokenSecret)
            this.accessTokenSecret = testcase.argv[1] || process.argv[3];
        
        var self = this;
        var configFile = Path.resolve(__dirname  + '/../../config/testing.json');
        
        Auth.loadConfig(configFile, function(err, config) {
            if (err)
                assert.fail(err);
            
            self.client = Helpers.newClient(config, self.accessToken, self.accessTokenSecret);
            next();
        });
    },
    
    setUp: function(next) {
        if (!(this.accessToken && this.accessTokenSecret))
            throw new Error('Couldn\'t find access token and/or secret.');
        else if (!this.client)
            throw new Error('Couldn\'t load config file.');
        
        next();
    },
    
    'test get account info': function(next) {
        this.client.accountInfo(function(err, data) {
            assert.ifError(err);
            
            var properties = ['referral_link', 'display_name', 'uid', 'country', 'quota_info', 'email'];
            Object.keys(data).forEach(function(k) {
                assert.notEqual(properties.indexOf(k), -1,
                    'Parameter \'' + k + '\' is not in the returned metadata.');
            });
            next();
        });
    },
    
    'test put file': function(next) {
        test_put_file.call(this, next);
    },
    
    'test get file': function(next) {
        var self = this;
        
        test_put_file.call(self, function(err, fileName) {
            self.client.getFile('dropbox', encodeURI(fileName), function(err, data, resp) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 200);
                assert.equal(data.length, 28);
                next();
            });
        });
    },
    
    'test file ops': function(next) {
        var self = this;
        test_delete_file.call(self, function() {
            test_put_file.call(self, function() {
                test_create_folder.call(self, function() {
                    test_file_copy.call(self, function() {
                        test_file_move.call(self, next);
                    })
                });
            });
        });
    },
    
    'test file metadata': function(next) {
        var path = '/file with spaces.txt';
        var limit = 10000;
        var hash = list = null;
        
        this.client.metadata('dropbox', encodeURI(path), limit, hash, list, function(err, data, resp) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);
            
            var properties = ['revision', 'is_deleted', 'thumb_exists','bytes', 'modified', 'path', 'is_dir', 'size', 'root', 'hash', 'contents', 'mime_type', 'icon'];
            Object.keys(data).forEach(function(k) {
                assert.notEqual(properties.indexOf(k), -1,
                    'Parameter \'' + k + '\' is not in the returned metadata.');
            });
            next();
        });
    },
    
    'test get directory listing': function(next) {
        var path = '/';
        var limit = 10000;
        var hash = null;
        var list = true;
        
        this.client.metadata('dropbox', path, limit, hash, list, function(err, data, resp) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);
            
            var properties = ['root', 'hash', 'thumb_exists','bytes', 'path', 'is_dir', 'size', 'icon', 'contents'];
            Object.keys(data).forEach(function(k) {
                assert.notEqual(properties.indexOf(k), -1,
                    'Parameter \'' + k + '\' is not in the returned metadata.');
            });
            
            next();
        });
    },
    
    'test fetch thumbnail': function(next) {
        var self = this;
        var path = '/sample_photo.jpg';
        
        this.client['delete']('dropbox', path, function() {
            test_put_image.call(self, function() {
                self.client.getFile('dropbox', path, function(err, data, resp) {
                    assert.ifError(err);
                    assert.equal(resp.statusCode, 200);
                    assert.ok(data.length > 0);
                    self.client.thumbnail('dropbox', path, 'large', null, function(err, data, resp) {
                        assert.ifError(err);
                        next();
                    });
                });
            });
        });
    },
    
    'test fetch image': function(next) {
        var self = this;
        var path = '/sample_photo.jpg';
        
        this.client['delete']('dropbox', path, function() {
            test_put_image.call(self, function(err, fileName) {
                self.client.getFile('dropbox', encodeURI(fileName), function(err, data, resp) {
                    assert.ifError(err);
                    assert.equal(resp.statusCode, 200);
                    assert.ok(data.length > 9000);
                    next();
                });
            });
        });
    },
};

var testcase = module.exports = AsyncTest.testcase(tests, 'node-dropbox', 50000);

if (require.main === module) {
    module.exports.exec();
}