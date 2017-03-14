'use script';

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
  /*multipartFileHandler: (part) => {
    const parts = [];
    part.on('data', (data) => {
      parts.push(data);
    });
    part.on('end', () => {
      Fs.writeFile()
    })
  },*/
  keepExtensions: false,
  uploadDir: Os.tmpdir(),
  multiples: true,
  hash: 'sha1'
}));

server.use(restify.CORS());

server.get('/photos', (req, res, next) => {
  const response = [];
  Fs.readdir(PHOTOS_DIR, (err, images) => {
    for(i of images) {
      response.push({
        title: i,
        url: Path.join(PHOTOS_DIR, i)
      });
    }
    res.send(200, response);
  });
});

server.post('/photos', (req, res, next) => {
  if(req.files.file.type === 'image/jpeg') {
    Fs.createReadStream(req.files.file.path).pipe(Fs.createWriteStream(Path.join(PHOTOS_DIR, req.body.title + '.jpg')))
    .on(() => {
      res.send(200);
    })
    .on((err) => {
      console.error('ERROR', err);
      res.send(500);
    });
  } else {
    console.log('Invalid format ' + req.files.file.type);
    res.send(400);
  }
});

server.listen(3000);


