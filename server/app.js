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
  Fs.readdir(PHOTOS_DIR, (err, files) => {
     const photos = files.reduce((memo, file) => {
       if(!file.startsWith('.')) {
         memo.push({
           url: Path.join(PHOTOS_DIR, file),
           title: file.split('.')[0]
         });
       }
       return memo;
     }, []);
    res.send(photos);
  });
});

server.post('/photos', (req, res, next) => {
  console.log(req.params.title);
  console.log(req.files.file);
  let extension;
  switch(req.files.file.type) {
    case 'image/gif':
      extension = '.gif';
      break;
    case 'image/jpeg':
      extension = '.jpg';
      break;
    case 'image/png':
      extension = '.png';
      break;
    default:
      extension = null;
  }
  if(extension != null) {
    Fs.createReadStream(req.files.file.path)
      .pipe(Fs.createWriteStream(Path.join(PHOTOS_DIR, req.params.title + extension)))
      .on('error', (err) => {
        console.log('ERROR', err);
      })
      .on('finish', () => {
        console.log('Fini');
        res.send(201);
      });
  } else {
    res.send(400, `Not supported type: ${req.files.file.type}`);
  }
});

server.get('/photos/:title', (req, res, next) => {
  Fs.createReadStream(Path.join(PHOTOS_DIR, req.params.title))
  .pipe(res);
});

server.get(/\/.*/, restify.serveStatic({
  directory: './public',
  default: 'index.html'
}));

server.listen(3000);


