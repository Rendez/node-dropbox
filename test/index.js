#!/usr/bin/env node

if (process.argv.length < 3)
    return console.error('\n1 argument required. Please, pass the test\'s name as first argument.\n');
    
var args = process.argv.splice(2);
var testName = args.shift().replace(/\-/g, '').trim().toLowerCase();

try {
    var testcase = require('./dropbox/' + testName);
} catch(e) {
    return console.error('\nArgument does not match with any named test.\n');
}

testcase.argv = args;
testcase.exec();
