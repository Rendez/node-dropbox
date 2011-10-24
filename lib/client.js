/*!
 * Node Dropbox 'Client' module
 *
 * Copyright(c) 2011 Luis merino <mail AT luismerino DOT name>
 * FreeBSD License
 */
 
module.exports.VERSION = '0.1.0';

/**
 * Module dependencies.
 */
 
var Util = require('./util');
var Multipart = Util.Multipart;

/**
 * Dropbox API version.
 */

var API_VERSION = module.exports.API_VERSION = 0;

/**
 * Class Client.
 *
 * @param {apiHost} string API host's path.
 * @param {contentHost} string API content host's path.
 * @param {post} number Connection port.
 * @param {auth} object OAuth instance.
 * @param {accessToken} string Pre-authorized access token hash.
 * @param {accessTokenSecret} string Access token secret hash.
 *
 * @return {Client} object
 */

var Client = module.exports = function(apiHost, contentHost, port, auth, accessToken, accessTokenSecret) {
    this.apiHost = apiHost;
    this.contentHost = contentHost;
    this.port = port;
    this.auth = auth;
    this.tokens = [accessToken, accessTokenSecret];
    this._init();
};

(function() {
    
    /**
     * Public methods
     */
    
    // Dropbox accounts
    this.accountInfo = function accountInfo(callback) {
        this.get(routes.gen(arguments), callback);
    };
    
    // Files and metadata
    this.getFile = function files(root, path, callback) {
        this._assertRoot(root);
        this._getRequestBody(this.get(routes.gen(arguments, 2)), callback);
    };
    
    this.putFile = function files(root, path, content, ctype, callback) {
        this._assertRoot(root);
        if (!callback) {
            callback = ctype;
            ctype = null;
        }
        
        // Extract the file name from path, using the last node separated by '/'.
        var name;
        path = path.split('/');
        name = path.pop();
        arguments[1] = path.join('/');
        
        var url = routes.gen(arguments, 2);
        var binary = Util.isBinaryType(ctype);
        var body = [];
        
        // Start multipart constructor, pass binary option if mime requires it.
        this.multipart = new Multipart(null, binary);
        
        this.multipart.on('data', function(data) {
            body.push(data);
        });
        this.multipart.on('end', function() {
            this.post(url, Buffer.concat(body), {file: name}, callback);
        }.bind(this));
        
        this.multipart.addParameter(name, content, ctype).end();
    };
    
    this.metadata = function metadata(root, path, fileLimit, hash, list, callback) {
        this._assertRoot(root);
        this.get(routes.gen(arguments, 5), callback);
    };
    
    this.thumbnail = function thumbnail(root, path, size, format, callback) {
        this._assertRoot(root);
        this._getRequestBody(this.get(routes.gen(arguments, 4)), callback);
    };
    
    // File operations
    this.copy = function copy(root, fromPath, toPath, callback) {
        this._assertRoot(root);
        this.post(routes.gen(arguments), {from_path: fromPath, to_path: toPath, root: root}, callback);
    };
    
    this.createFolder = function createFolder(root, path, callback) {
        this._assertRoot(root);
        this.post(routes.gen(arguments), {root: root, path: path}, callback);
    };
    
    this['delete'] = function _delete(root, path, callback) {
        this._assertRoot(root);
        this.post(routes.gen(arguments), {root: root, path: path}, callback);
    };
    
    this.move = function move(root, fromPath, toPath, callback) {
        this._assertRoot(root);
        this.post(routes.gen(arguments), {from_path: fromPath, to_path: toPath, root: root}, callback);
    };
    
    /**
     * Internal methods
     */
    
    this.get = function(url, callback) {
        return this.request('get', url, callback);
    };
    
    this.post = function(url, params, extraParams, callback) {
        if (typeof extraParams === 'function')
            callback = extraParams;
        else if (extraParams && typeof extraParams === 'object')
            params = {_params: params, _extra: extraParams};
        
        return this.request('post', url, params, callback);
    };
    
    this.request = function(method, url, params, callback) {
        if (['get', 'post'].indexOf(method) < 0)
            throw new Error('\'' + method.toUpperCase() + '\' requests are not allowed.');
        
        if (method === 'get') {
            callback = params;
            params = null;
        }
        
        var handler = callback
            ? (function(err, data, response) {
                return this._responseHandler(err, data, response, callback);
            }).bind(this)
            : null;
        
        if (method === 'get')
            return this.auth.get(this._buildUrl(url), this.tokens[0], this.tokens[1], handler);
        
        var encoding = null;
        if (params._params && params._extra) {
            encoding = 'multipart/form-data; boundary=' + this.multipart.boundary;
            return this.auth.post(this._buildUrl(url), this.tokens[0], this.tokens[1], params._params, params._extra, encoding, handler);
        }
        else
            return this.auth.post(this._buildUrl(url), this.tokens[0], this.tokens[1], params, null, handler);
    };
    
    /**
     * Private methods
     */
    
    this._responseHandler = function(err, data, response, callback) {
        var obj = {};
        try {
            obj = JSON.parse(data);
        }
        catch(e) {
            obj = null;
        }
        
        if (obj.error) {
            var msg = obj.error;
            var status;
            
            if (typeof msg === 'object')
                msg = JSON.stringify(msg);
            if (err.statusCode)
                status = err.statusCode;
            else {
                var match;
                if (match = msg.match(/^\s*(\d+)?\b/))
                    status = match[1];
            }
            if (!err instanceof Error)
                err = new Error();
            
            err.statusCode = status;
            err.message = msg || (data && data.message);
            
            callback(err, obj || data, response);
        }
        else
            callback(null, obj || data, response);
    };
    
    this._getRequestBody = function(request, callback) {
        request.on('response', function(response) {
            var data = [];
            //response.setEncoding('utf8');
            response.on('data', function(chunk) {
                data.push(chunk);
            });
            response.on('end', function() {
                afterRequest(response, data);
            });
        });
        request.on('error', function(err) {
            callback(err);
        });
        request.end();
        
        function afterRequest(response, data) {
            var binary = Util.isBinaryType(response.headers['content-type']);
            data = Buffer.concat(data);
            
            if (response.statusCode >= 200 && response.statusCode <= 299)
                callback(null, !binary ? data.toString('utf8') : data, response);
            else
                callback(new Error('Dropbox unknown error.'), data, response);
        }
    };
    
    this._buildUrl = function(path) {
        var fullUrl = path;
        
        if (!/^http:\/\//.test(path))
            fullUrl = (this.port === 80 ? 'http://' : 'https://') + path;
        
        return fullUrl;
    };
    
    this._assertRoot = function(root) {
        if (['dropbox', 'sandbox'].indexOf(root) < 0)
            throw new Error('Passed argument \'root\' must be \'dropbox\' or \'sandbox\'.');
    };
    
    this._init = function() {
        routes = routes.call(this);
    };
    
    var routes = function() {
        var ver = '/' + API_VERSION;
        var URL_MAP = {
            accountInfo: this.apiHost + ver + '/account/info',
            files: this.contentHost + ver + '/files/{root}{path}',
            metadata: this.apiHost + ver + '/metadata/{root}{path}?file_limit={file_limit}&hash={hash}&list={list}',
            thumbnail: this.contentHost + ver + '/thumbnails/{root}{path}?size={size}&format={format}',
            copy: this.apiHost + ver + '/fileops/copy',
            createFolder: this.apiHost + ver + '/fileops/create_folder',
            _delete: this.apiHost + ver + '/fileops/delete',
            move: this.apiHost + ver + '/fileops/move'
        };
        var _slice = Array.prototype.slice, x, i;
        
        for (x in URL_MAP) {
            i = 0;
            URL_MAP[x] = URL_MAP[x].replace(/\{[^{}]*\}/g, function() {
                return '{' + i++ + '}';
            });
        }
        
        URL_MAP.gen = function(args, n) {
            var fn = args.callee.name;
            if (undefined === n || null === n)
                return this[fn];
            
            var replacements = {};
            _slice.call(args, 0, n).forEach(function(arg, i) {
                replacements[i] = (undefined !== arg && null !== arg) ? arg : '';
            });
            return Util._t(this[fn], replacements);
        };
        
        return URL_MAP;
    };
        
}).call(Client.prototype);