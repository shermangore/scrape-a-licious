// Grab the articles as a json
$.getJSON("/articles", function (data) {
  // For each Article
  for (var i = 0; i < data.length; i++) {
    // Display the corresponding information on the page
    $("#articles").append(`
                            <p data-id="${data[i]._id}">${data[i].headline}<br />
                            <a href="${data[i].link}" title="Click here for more information about this job">${data[i].company}</a></p>
                            <p>${data[i].summary}</p>
                            <p>${data[i].location}</p><br />
                          `);
  }
});

$("#btn-submit").on("click", function (evt) {
  if ($("#jobtitle").val() === "" || $("#jobtitle").val() === null) {
    alert("A job key word is required");
    return;
  }

  if ($("#dd-city :selected").text() === "Select a city") {
    alert("A city is required");
    return;
  }

  let ttl = $("#jobtitle").val();
  let cty = $("#dd-city :selected").text();

  cty = cty.replace(",", "%2C").replace(" ", "%20");
  ttl = ttl.replace(" ", "%20").replace("#", "%23");

  $.ajax({
    method: "GET",
    url: "/scrape/" + ttl + "/" + cty
  })
    // With that done, add the note information to the page
    .done(function (data) {
      location.reload();
    })
    .fail(function (err) {
      console.log("Error: ", err);
    });
});

// Whenever someone clicks a p tag
$(document).on("click", "p", function () {
  // Empty the notes from the note section
  if ($(this).attr("data-id")) {
    $("#notes").empty();

    // Save the id from the p tag
    var thisId = $(this).attr("data-id");

    // Now make an ajax call for the Article
    $.ajax({
      method: "GET",
      url: "/articles/" + thisId
    })
      // With that done, add the note information to the page
      .done(function (data) {
        // The title of the article
        $("#notes").append("<h2>" + data.headline + "</h2>");
        // An input to enter a new title
        $("#notes").append("<input id='titleinput' name='title' placeholder='Enter a note title'><br />");
        // A textarea to add a new note body
        $("#notes").append("<textarea id='bodyinput' name='body' placeholder='Enter a note for this job'></textarea><br />");
        // A button to submit a new note, with the id of the article saved to it
        $("#notes").append("<button class='btn btn-primary' data-id='" + data._id + "' id='savenote'>Save Note</button>");

        // If there's a note in the article
        if (data.notes[0]) {
          // Place the title of the note in the title input
          $("#titleinput").val(data.notes[0].title);
          // Place the body of the note in the body textarea
          $("#bodyinput").val(data.notes[0].body);
        }
      });
  }
});

// When you click the savenote button
$(document).on("click", "#savenote", function () {
  // Grab the id associated with the article from the submit button
  var thisId = $(this).attr("data-id");

  // Run a POST request to change the note, using what's entered in the inputs
  $.ajax({
    method: "POST",
    url: "/articles/" + thisId,
    data: {
      // Value taken from title input
      title: $("#titleinput").val(),
      // Value taken from note textarea
      body: $("#bodyinput").val()
    }
  })
    // With that done
    .done(function (data) {
      // Empty the notes section
      $("#notes").empty();
    });

  // Also, remove the values entered in the input and textarea for note entry
  $("#titleinput").val("");
  $("#bodyinput").val("");
});
