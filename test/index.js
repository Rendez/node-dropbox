#!/usr/local/bin/node

/*!
 * Node Dropbox test runner
 *
 * Copyright(c) 2011 Luis merino <mail AT luismerino DOT name>
 * FreeBSD License
 */

try {
    process.chdir(__dirname);
} catch(e) {
    throw e;
}

if (process.argv.length < 3)
    return console.error('\n1 argument required. Please, pass the test\'s name as first argument.\n');
    
var args = process.argv.splice(2);
var testName = args.shift().replace(/\-/g, '').trim().toLowerCase();

try {
    var testcase = require('./dropbox/' + testName);
} catch(e) {
    console.error('\n\033[33mError: first argument does not match with any named test.');
    var dirs = require('fs').readdirSync(__dirname + '/dropbox').filter(function(f) {
        return /\.js$/.test(f);
    });
    console.log('\n\033[36m- Available tests:\n\n    \033[37m* ' + dirs.join('\n    * '));
    console.log('\nExample: \033[32mnode [test|index.js] ' + dirs.shift() + '\n\033[0m');
    return;
}

testcase.argv = args;
testcase.exec();
