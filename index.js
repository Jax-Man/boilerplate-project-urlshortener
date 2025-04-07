require('dotenv').config();
let bodyParser = require('body-parser');
const { nanoid } = require('nanoid');
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('node:dns');
const url = require('url');
const { MongoClient } = require("mongodb");

// Set up mongoDB for data holding
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const db = client.db('Urlshortener').collection('urls');
db.createIndex({ original_url: 1},{ unique: true });
//get unique ID
module.exports.createID = () => {
  return nanoid(10)
}

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
//set up body parser
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());


app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Log all documents in the collection


// url shortener
app.route('/api/shorturl').post(function(req, res) {
  var { url: longUrl } = req.body;
  
  //initiate hostName var and search for it
  var hostName;
  try {
    const parsedUrl = new URL(longUrl);
    hostName = parsedUrl.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' })
  }

  // Use dns.lookup to validate the hostname
  dns.lookup(hostName, (err, address, family) => {
    if (err) {
      // If not findable return err
      return res.json({ error: 'invalid url' });
    }

    
  
     
    // If document count = 0, get the shortUrl
    var shortUrl = nanoid(10);

    // this function does two things. 
    // First: it tries to find the url with attributing short_url
    //    this is to stop multiple short_urls leading to the same link
    // Second: if the long_url is unique it will add it as a new document 
      db.findOneAndUpdate(
        { original_url: longUrl },
        { $set: 
          { original_url: longUrl, short_url: shortUrl }
        },
        { upsert: true }
      );
    
      res.json({ original_url: longUrl, short_url: shortUrl });
    });
});

app.route('/api/shorturl/:redirect').get(function middleware(req, res, next) {
    async function findUrl() {
      try {
        //define query
        const query = { short_url: req.params.redirect };
        // define options
        const options = {  
          projection: { _id: 0, original_url: 1, short_url: 1 }
        };
        //execute query
        var url = await db.findOne(query, options);
        
        console.log(url);
        
      } finally {
      res.redirect(url.original_url);
    }
  }
  findUrl().catch(console.dir); 
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
