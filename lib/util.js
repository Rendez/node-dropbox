/**
 * Node Dropbox 'Util' module
 * Copyright(c) 2011 Luis merino <mail@luismerino.name>
 * FreeBSD License
 */

/**
 * Module dependencies.
 */

var Sys = require('sys');
var EventEmitter = require('events').EventEmitter;

/**
 * Multipart class with purpose of forming multipart
 * body and headers strings for POST request.
 *
 * Completely based on the CoffeeScript example found at 
 * <http://fuzzycom.eu/posts/57> by Vincent Hellot <vincenthellot.tel>.
 *
 * @author Luis Merino <mail@luismerino.name>
 */

var Multipart = exports.Multipart = function(boundary, useBuffers) {
    EventEmitter.call(this);
    
    this.boundaryLength = 0;
    this.randomBoundaryPartLength = 32;
    this.boundary = boundary || this.getBoundary();
    this.crlf = '\r\n';
    this.useBuffers = useBuffers;
};

Sys.inherits(Multipart, EventEmitter);

(function() {
    
    // algorithm borrowed from curl Curl_FormBoundary
    this.getBoundary = function() {
        var allowedChars = '0123456789abcdef';
        var boundary = '';
        var i = 0;
        var len = this.boundaryLength - this.randomBoundaryPartLength;
        
        for (i = 0; i < len; i++)
            boundary += '-';
        
        for (i = 0; i < this.randomBoundaryPartLength; i++)
            boundary += allowedChars[Math.floor(Math.random() * 15 + 1)];
        
        return boundary;
    };
    
    this.write = function(str) {
        this.emit('data', this.useBuffers ? new Buffer(str, 'binary') : str);
    };
    
    this.addParameter = function(name, value, ctype) {
        this.write('--' + this.boundary);
        this.write(this.crlf);
        this.write('Content-Disposition: form-data; name="file"; filename="' + name + '"');
        this.write(this.crlf);
        this.write('Content-Type: ' + (ctype || 'text/plain')/* + '; charset=utf8'*/);
        this.write(this.crlf);
        this.write(this.crlf);
        this.write(value);
        this.write(this.crlf);
        
        return this;
    };
    
    this.end = function() {
        this.write('--' + this.boundary);
        this.write('--');
        this.emit('end');
    };
    
}).call(Multipart.prototype);

/**
 * String substitution function. Uses {value} pattern.
 *
 * Example:
 *   exports._t('www.{domain}.com', {domain: 'dropbox'}); // <- returns www.dropbox.com
 *
 * @param {str} String.
 * @param {object} Object contains the replacement values.
 * @returns String string with replacements applied.
 *
 * @author Luis Merino <mail@luismerino.name>
 */
 
exports._t = function(str, object) {
    return String(str).replace(/\\?\{([^{}]+)\}/g, function(match, name) {
        if (match.charAt(0) == '\\') return match.slice(1);
            return (object[name] != null) ? object[name] : '';
    });
};

/**
 * Utility function to check if the passed mime type behaves with binary encoding.
 *
 * @param {type} String mime type string.
 * @returns Boolean.
 *
 * @author Luis Merino <mail@luismerino.name>
 */

exports.isBinaryType = (function() {
    var mimeTypes = [
        'image/',
        'application/',
        'video/',
        'audio/'
    ];
    var dflt = 'text/plain';
    
    return function(type) {
        return mimeTypes.some(function(mtype) {
            return (type || dflt).match('^' + mtype);
        });
    }
})();

/**
 * From 'node-bufferjs' Buffer.concat by <AJ ONeal> (and Contributors).
 * Returns a new Buffer with the contents of b1, [...b2, ...b3],
 * or with the contents of all buffers in the Array.
 *
 * @see https://github.com/coolaj86/node-bufferjs
 */
 
(function() {
    "use strict";

    function concat(bufs) {
        var buffer, length = 0, index = 0;

        if (!Array.isArray(bufs)) {
            bufs = Array.prototype.slice.call(arguments);
        }
        for (var i=0, l=bufs.length; i<l; i++) {
            buffer = bufs[i];
            if (!Buffer.isBuffer(buffer)) {
                buffer = bufs[i] = new Buffer(buffer);
            }
            length += buffer.length;
        }
        buffer = new Buffer(length);

        bufs.forEach(function (buf, i) {
            buf = bufs[i];
            buf.copy(buffer, index, 0, buf.length);
            index += buf.length;
            delete bufs[i];
        });

        return buffer;
    }
    
    Buffer.concat = concat;

})();