//var Zombie = require('zombie/lib');
var Auth = require('../lib/auth');
var Client = require('../lib/client');
//var Https = require('https');
var QS = require('qs');
//var Url = require('url');
var Path = require('path');
var Spawn = require('child_process').spawn;
var assert = require('assert');
//var failed = new Error('Login failed');

module.exports = {
    
    newAuthenticator: function(config) {
        var options = {
            requestTokenUrl: config.requestTokenUrl,
            accessTokenUrl: config.accessTokenUrl,
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
        };
        
        return new Auth.getInstance(options);
    },
    
    newClient: function(config, accessToken, accessTokenSecret) {
        var apiHost = config.server;
        var contentHost = config.contentServer;
        var port = config.port;
        var auth = this.newAuthenticator(config);
        
        return new Client(apiHost, contentHost, port, auth, accessToken, accessTokenSecret);
    },
    
    // Python's headless browser: uses module 'mechanize.Browser'.
    loginAndAuthorize: function(authorizationUrl, config, callback) {
        Path.exists(__dirname + '/token_authorize.py', function(exists) {
            if (!exists)
                return callback(new Error('\'token_authorize.py\' file could not be found.'));
            
            var credentials = {
                testing_user: config.testingUser,
                testing_password: config.testingPassword
            };
            var args = [authorizationUrl, JSON.stringify(credentials)];
            var child = Spawn('./token_authorize.py', args);
            
            child.stdout.on('data', function(stream) {
                console.log(stream.toString());
            });
            child.stderr.on('error', function(stream) {
                delete child;
                callback(new Error(stream + ''));
            });
            child.on('exit', function() {
                if (child) callback()
            });
        });
    }
    
    // Zombie (not working, throws JS compiling errors).
    /*loginAndAuthorize: function(token, config, callback) {
        var url = config.authorizationUrl + '?oauth_token=' + token;
        var parsedUrl = Url.parse(config.authorizationUrl);
        
        console.log('AUTHORIZING', url);
        
        var browser = new Zombie.Browser({ debug: true });
        browser.runScripts = false;
        browser.on('error', function(err) {
            console.log(err.stack);
        });
        // Load the authorization url
        browser.visit(url, function(err, browser) {
            // Fill email, password and submit form
            console.log('FIRST PAGE', browser.text('title') + '', browser.location.href);
            browser.runScripts = true;
            
            browser.
            fill('login_email', config.testingUser).
            fill('login_password', config.testingPassword).
            pressButton('login_submit', function(err, browser) {
                // Form submitted, new page loaded.
                console.log('RESULT URL', browser.location.href, browser.statusCode);
                
                browser.pressButton('allow_access', function(err) {
                    if (err)
                        return callback(err);
                    
                    console.log('TOKEN AUTHENTICATION ALLOWED!', token);
                    callback();
                });
            });
        });
    }*/
    
    // Custom mode (unknown mechanism, @todo dropbox team must reveal what requests really need for this to work).
    /*loginAndAuthorize: function(token, config, callback) {
        var url = Url.parse(config.authorizationUrl);
        console.log('AUTHORIZING', config.authorizationUrl, token);
        ;
        var options = {
            host: url.host,
            path: '/login?cont=' + config.authorizationUrl + '?oauth_token=' + token,
            headers: {}
        };
        
        // Enter login page
        var request = Https.get(options, function(response) {
            if (response.statusCode !== 200)
                return callback(failed);
            
            var data = '';
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', proceed);
            
            function proceed() {
                var tVar = data.match(/name\=\"t\" value\=\"(.+)\"/);
                if (!tVar)
                    return callback(failed);
                
                tVar = tVar[1];
                var body = {
                    't': tVar,
                    'login_email': config.testingUser,
                    'login_password': config.testingPassword,
                    'remember_me': '1',
                    'login_submit': 'Log in',
                    'cont': config.authorizationUrl + '?oauth_token=' + token
                };
                body = QS.stringify(body);
                
                var cookies = [];
                response.headers['set-cookie'].forEach(function(str) {
                    var m = str.match(/^(.+?=.+?);/);
                    if (m && m[1])
                        cookies.push(m[1]);
                });
                
                options.path = '/login';
                options.method = 'POST';
                options.headers['Content-Length'] = body.length;
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.headers['Cookie'] = cookies.join('; ');
                
                // Submit to login page
                request = Https.request(options, function(response) {
                    if (response.statusCode !== 302)
                        return callback(failed);
                    
                    body = {
                        't': tVar,
                        'allow_access': 'Allow',
                        'oauth_token': token 
                    };
                    body = QS.stringify(body);
                    
                    var cookies2 = [];
                    [].concat(cookies).concat(response.headers['set-cookie']).forEach(function(str) {
                        var m = str.match(/^(.+?=.+?);/);
                        if (m && m[1] && m[1] != 'oscar=; Domain=www.dropbox.com' && m[1] != 'grouch=; Domain=www.dropbox.com')
                            cookies2.push(m[1] + '; expires=Sun, 11-Oct-2012 18:56:04 GMT; Path=/; secure; httponly');
                    });
                    
                    options.path = url.pathname;
                    options.headers['Accept-Charset'] = 'ISO-8859-1,utf-8;q=0.7,*;q=0.3';
                    options.headers['Accept-Language'] = 'en-US,en;q=0.8';
                    options.headers['Accept-Encoding'] = 'gzip,deflate,sdch';
                    options.headers['Cache-Control'] = 'max-age=0';
                    options.headers['Content-Length'] = body.length;
                    options.headers['Cookie'] = cookies2.join(';') + '; puc=YzYzOWFjMSxkNDNiZjQ0; __utmz=145599457.1317976548.5.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=create%20dropbox%20app; __utma=145599457.1483670903099351600.1317898674.1318010545.1318014643.10; __utmc=145599457; __utmb=145599457.2.10.1318014643';
                    options.headers['Cache-Control'] = 'max-age=0';
                    options.headers['Connection'] = 'keep-alive';
                    options.headers['Host'] = 'www.dropbox.com';
                    options.headers['Origin'] = 'https://www.dropbox.com';
                    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_1) AppleWebKit/535.2 (KHTML, like Gecko) Chrome/15.0.874.83 Safari/535.2';
                    options.headers['Referer'] = 'https://www.dropbox.com/0/oauth/authorize?oauth_token=' + token;
                    
                    // Allow token authorization
                    request = Https.request(options, function(response) {
                        console.log(response.statusCode, response.headers);
                        
                        if (response.statusCode !== 500)
                            return callback(null, token);
                    });
                    
                    request.on('error', callback);
                    request.write(body);
                    request.end();
                });
                
                request.on('error', callback);
                request.write(body);
                request.end();
            }
        });
        
        request.on('error', callback);
        request.end();
    }*/
};