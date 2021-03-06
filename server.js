var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/projectscrape";

mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the echoJS website

app.get("/", function(req, res) {
  res.render(path.join(__dirname, "public/index.html"));
});

app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("http://www.ehow.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
  

    // Now, we grab every h2 within an article tag, and do the following:
    $("div .component-card-article").each(function(i, element) {
      // Save an empty result object
      // console.log(element);
      var result = {};
      
      // Add the text and href of every link, and save them as properties of the result object
      result.headline = $(this)
        .children(".group-title-author")
        .children(".component-card-article-title").children('h2')
        .text();
      result.link = $(this)
        .children(".group-title-author")
        .children(".component-card-article-title").children('h2').children('a')
        .attr('href');
      result.img = $(this)
        .children(".component-card-article-image").children(".image-wrapper").children('a').children('img').attr('src');

      console.log(result)

  
      // Create a new Article using the `result` object built from scraping
      db.Header.create(result)
        .then(function(dbHeader) {
          // View the added result in the console
          console.log(dbHeader);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.redirect("/");
  });
});

// Route for getting all Articles from the db
app.get("/headers", function(req, res) {
  // Grab every document in the Articles collection
  db.Header.find({})
    .then(function(dbHeader) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbHeader);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/headers/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Header.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("comment")
    .then(function(dbHeader) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbHeader);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/headers/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Comment.create(req.body)
    .then(function(dbComment) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Header.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
    })
    .then(function(dbHeader) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbHeader);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
