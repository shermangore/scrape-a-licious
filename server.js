// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/scrapealicious");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function (error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function () {
  console.log("Mongoose connection successful.");
});

// Routes
// ======
// A GET request to scrape the echojs website
app.get("/scrape/:title/:city", function (req, res) {
  // First, we grab the body of the html with request
  let txtTitle = req.params.title;
  let txtCity = req.params.city;

  request(`https://www.indeed.com/jobs?q=${txtTitle}&l=${txtCity}`, function (error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    let $ = cheerio.load(html);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.result").each(function (i, element) {
      // Save an empty result object
      let result = {};
      let tempVal = $(this).attr("data-tn-component");

      if (tempVal) {
        if ($(this).children("h2.jobtitle").text()) {
          result.headline = $(this).children("h2.jobtitle").text().trim();
        } else {
          result.headline = "No Job Title";
        }

        if ($(this).children("span.company").children("span").html().indexOf("<a") === -1) {
          result.company = $(this).children("span.company").children("span").html().trim();
        } else {
          result.company = $(this).children("span.company").children("span").children("a").html().trim();
        }

        result.location = $(this).children("span").children("span.location").children("span").html().trim();
        result.summary = $(this).children("table").find("span.summary").html().trim();
        result.link = "https://www.indeed.com" + $(this).children("h2.jobtitle").children("a").attr("href").trim();

        let entry = new Article(result);

        // Now, save that entry to the db
        entry.save(function(err, doc) {
          // Log any errors
          if (err) {
            console.log(err);
          }
          // Or log the doc
          else {
            //console.log(doc);
            return doc;
          }
        });
      }
    });
  });
  res.redirect("/");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function (req, res) {
  Article.find({}).exec(function (error, doc) {
    if (error) {
      res.send(error);
    }
    // Or, send our results to the browser, which will now include the books stored in the library
    else {
      res.send(doc);
    }
  });
});

// This will grab an article by it's ObjectId
app.get("/articles/:id", function (req, res) {
  Article.findOne({"_id":req.params.id})
    // ..and string a call to populate the entry with the books stored in the library's books array
    // This simple query is incredibly powerful. Remember this one!
    .populate("notes")
    // Now, execute that query
    .exec(function (error, doc) {
      // Send any errors to the browser
      if (error) {
        res.send(error);
      }
      // Or, send our results to the browser, which will now include the books stored in the library
      else {
        console.log("Doc: ", doc);
        res.json(doc);
      }
    });
});

// Create a new note or replace an existing note
app.post("/articles/:id", function (req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
  let newNote = new Note(req.body);

  newNote.save(newNote, function (err, doc) {
    if (err) {
      res.send(err);
    } else {
      Article.findOneAndUpdate(
        {"_id": req.params.id}, 
        { $push: { "notes": doc._id } }, 
        { new: true }, 
        function (error, newdoc) {
          // Send any errors to the browser
          if (error) {
            res.send(error);
          }
          // Or send the doc to the browser
          else {
            res.send(newdoc);
          }
        }
      );
    }
  });
});

// Listen on port 3000
app.listen(3000, function () {
  console.log("App running on port 3000!");
});