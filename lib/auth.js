/*!
 * Node Dropbox 'Auth' module.
 *
 * Wrapper for OAuth module instances. Includes utility function for loading
 * JSON file containing configuration parameters.
 *
 * Copyright(c) 2011 Luis merino <mail AT luismerino DOT name>
 * FreeBSD License
 */

/**
 * Module dependencies.
 */

var OAuth = require('node-oauth').OAuth;

/**
 * Fixes for POST requests which facilitates sending a body as a string, e.g.
 * 'multipart' and add extra oauth parameters at the same time. It removes the
 * previous blocking logic limited to just one or the other behavior.
 */

OAuth.prototype._putOrPost = function(method, url, oauth_token, oauth_token_secret, post_body, extra_params, post_content_type, callback) {
    if (typeof post_content_type === 'function') {
        callback = post_content_type;
        post_content_type = null;
    }
    
    if (!(typeof post_body === 'string' || Buffer.isBuffer(post_body))) {
        post_content_type = 'application/x-www-form-urlencoded';
        extra_params = post_body;
        post_body = null;
    }
    
    return this._performSecureRequest(oauth_token, oauth_token_secret, method, url, extra_params, post_body, post_content_type, callback);
};

OAuth.prototype.post = function(url, oauth_token, oauth_token_secret, post_body, extra_params, post_content_type, callback) {
    return this._putOrPost("POST", url, oauth_token, oauth_token_secret, post_body, extra_params, post_content_type, callback);
};

/**
 * Returns a new oauth instance using the passed configuration options.
 *
 * @param {options} object.
 * @return {OAuth} object
 */

exports.getInstance = function(options) {
    var defaults = {
        version: '1.0',
        signatureMethod: 'HMAC-SHA1'
    };
    
    var oa = new OAuth(
        options.requestTokenUrl,
        options.accessTokenUrl,
        options.consumerKey,
        options.consumerSecret,
        defaults.version,
        null,
        defaults.signatureMethod
    );
    
    return oa;
};

/**
 * Reads a config file and parses it as an object.
 *
 * @param {options} object.
 * @return {OAuth} object
 */

exports.loadConfig = function(path, callback) {
    require('fs').readFile(path, 'utf8', function(err, config) {
        if (err)
            return callback(err);
        
        var config;
        try {
            config = JSON.parse(config);
        } catch(e) {
            config = e;
        } finally {
            callback(null, config);
        }
    });
};