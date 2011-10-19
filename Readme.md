NodeJs Dropbox API Client
===

__node-dropbox__ is a Client providing communication between NodeJS and the __Dropbox API__ version 0 (and soon to be version 1).

The implementation's client contains full API coverage as in Dropbox's web docs, mobile docs might include some extra functionality and URLs; not discarded as to implemented soon. __node-oauth__ is the middleware used to perform the OAuth 1.0 requests.

Fully tested against Dropbox API (http://api.dropbox.com & http://api-content.dropbox.com).

Running Tests
===
Two options:
 * Running $node test/index.js [testfile]
 * Running $node/test dropbox/[testfile]

__Notes:__ To run the test file __client.js__ two arguments are required: the base64-encoded tokens key and token secret.

Node Compatibility
===
0.4.x

__Notes:__ Further testing of previous versions is on the to-do list.

Author
===
Luis Merino &lt;mail AT luismerino DOT name&gt;

License
===
[FreeBSD License](./License.md)