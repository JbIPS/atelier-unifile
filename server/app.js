'use strict';

const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const restify = require('restify');
const sessions = require('client-sessions');
const Unifile = require('unifile');

const server = restify.createServer({name: 'Portfolio'});
const PHOTOS_DIR = 'photos';

// Init server

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
server.use(restify.queryParser());
server.use(sessions({
  cookieName: 'unifile',
  secret: 'silexlabs',
  duration: 24*60*60*1000,
  activeDuration: 1000*60*5
}));

// Init Unifile

const unifile = new Unifile();
unifile.use(new Unifile.DropboxConnector({
  clientId: '37mo489tld3rdi2',
  clientSecret: 'kqfzd11vamre6xr',
  redirectUri: 'http://localhost:3000/dropbox/oauth-callback'
}));

// Declare routes

server.get('/photos', (req, res, next) => {
  //const response = [];
  unifile.readdir(req.unifile, 'dropbox', 'atelier/' + PHOTOS_DIR)
  .map((image) => {
    return {
      title: image.name,
      url: '/photos/' + image.name
    }
  })
  .then((response) => {
    //console.log(response);
    res.send(200, response);
  })
  .catch((err) => {
    console.error(err);
    res.send(500);
  });
});

server.get('/photos/:id', (req, res, next) => {
  unifile.createReadStream(req.unifile, 'dropbox', 'atelier/' + PHOTOS_DIR + '/' + req.params.id)
  .pipe(res);
});

server.post('/photos', (req, res, next) => {
  let extension;
  switch(req.files.file.type) {
    case 'image/jpeg':
      extension = '.jpg';
      break;
    case 'image/png':
      extension = '.png';
      break;
    case 'image/gif':
      extension = '.gif';
      break;
    default:
      extension = null;
  }
  if(extension !== null) {
    Fs.createReadStream(req.files.file.path)
    .pipe(unifile.createWriteStream(req.unifile, 'dropbox', Path.join('atelier', PHOTOS_DIR, req.body.title + extension)))
    .on('end', () => {
      res.send(200);
    })
    .on('error', (err) => {
      console.error('ERROR', err);
      res.send(500);
    });
  } else {
    console.log('Invalid format ' + req.files.file.type);
    res.send(400);
  }
});

// login route
server.post('/dropbox/authorize', function(req, res) {
  unifile.getAuthorizeURL(req.unifile, 'dropbox')
  .catch((err) => {
    console.error('Error while authorizing Unifile', err);
    res.statusCode = 400;
    res.end();
  })
  .then((result) => {
    res.end(result);
  });
});

// register callback url
server.get('/dropbox/oauth-callback', function(req, res) {
  unifile.login(req.unifile, 'dropbox', req.params)
  .then(function(result) {
    //res.cookie('unifile_' + req.params.connector, result);
    res.end('<script>window.close();</script>');
  })
  .catch(function(err) {
    console.error('ERROR', err);
    res.send(500, err);
  });
});

server.get(/\/.*/, restify.serveStatic({
  directory: './public',
  default: 'index.html'
}));

server.listen(3000);


