/*!
 * Node Dropbox 'Auth' test module
 *
 * Copyright(c) 2011 Luis merino <mail AT luismerino DOT name>
 * FreeBSD License
 */

require.paths.unshift(__dirname + '/../../support');

var Path = require('path');
var AsyncTest = require('async/lib/test');
var Auth = require('../../lib/auth');
var Helpers = require('../helpers');
var assert = require('assert');

/**
 * Test suite
 */
var tests = {
    
    name: 'auth',
    
    setUp: function(next) {
        if (!this.config) {
            var self = this;
            var configFile = Path.resolve(__dirname  + '/../../config/testing.json');
            
            Auth.loadConfig(configFile, function(err, config) {
                self.config = config;
                next();
            });
        }
        else
            next();
    },
    
    'test load config file': function(next) {
        var self = this;
        var configFile = Path.resolve(__dirname  + '/../../config/testing.json');
        
        Auth.loadConfig(configFile, function(err, config) {
            assert.ifError(err);
            assert.ok(config.server);
            assert.ok(config.contentServer);
            assert.equal(config.port, 80);
            assert.ok(config.requestTokenUrl);
            assert.ok(config.accessTokenUrl);
            assert.ok(config.authorizationUrl);
            assert.ok(config.trustedAccessTokenUrl);
            assert.ok(config.root === 'dropbox' || config.root === 'sandbox');
            assert.ok(config.appName);
            assert.ok(config.consumerKey);
            assert.ok(config.consumerSecret);
            assert.ok(config.testingUser);
            assert.ok(config.testingPassword);
            self.config = config;
            next();
        });
    },
    
    'test obtain oauth request token': function(next) {
        this.tokenPair = null;
        var oa = Helpers.newAuthenticator(this.config);
        var self = this;
        
        oa.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret) {
            assert.ifError(err);
            assert.ok(/[a-z0-9]{15}/.test(oAuthToken));
            assert.ok(/[a-z0-9]{15}/.test(oAuthTokenSecret));
            
            self.tokenPair = [oAuthToken, oAuthTokenSecret];
            next();
        });
    },
    
    'test authorize oauth request token': function(next) {
        var self = this;
        
        if (!this.tokenPair)
            this['test obtain oauth request token'](proceed);
        else
            proceed();
        
        function proceed() {
            assert.ok(self.tokenPair, 'Missing token pair');
            assert.notEqual(self.tokenPair.length, 0);
            var url = self.config.authorizationUrl + '?oauth_token=' + self.tokenPair[0];
            Helpers.loginAndAuthorize(url, self.config, next);
        }
    },
    
    'test obtain oauth access token': function(next) {
        var self = this;
        
        if (!this.tokenPair)
            this['test authorize oauth request token'](proceed);
        else
            proceed();
        
        function proceed() {
            var oa = Helpers.newAuthenticator(self.config);
            oa.getOAuthAccessToken(self.tokenPair[0], self.tokenPair[1],
                function(err, oAuthAccessToken, oAuthAccessTokenSecret) {
                    assert.ifError(err);
                    assert.ok(/[a-z0-9]{15}/.test(oAuthAccessToken));
                    assert.ok(/[a-z0-9]{15}/.test(oAuthAccessTokenSecret));
                    console.log('access_token: ' + oAuthAccessToken);
                    console.log('access_token_secret: ' + oAuthAccessTokenSecret);
                    next();
                });
        }
    }
};

var testcase = module.exports = AsyncTest.testcase(tests, 'node-dropbox', 20000);

if (require.main === module) {
    module.exports.exec();
}