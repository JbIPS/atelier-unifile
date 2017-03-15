'use strict';

const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const restify = require('restify');

const server = restify.createServer({name: 'Portfolio'});
const PHOTOS_DIR = 'photos';

server.use(restify.bodyParser({
  maxBodySize: 0,
  mapParams: true,
  mapFiles: false,
  overrideParams: false,
  keepExtensions: false,
  uploadDir: Os.tmpdir(),
  multiples: true,
  hash: 'sha1'
}));

server.use(restify.CORS());

server.get('/photos', (req, res, next) => {
});

server.post('/photos', (req, res, next) => {
});


server.get(/\/.*/, restify.serveStatic({
  directory: './public',
  default: 'index.html'
}));

server.listen(3000);


