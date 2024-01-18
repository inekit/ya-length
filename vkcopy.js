const axios = require("axios");
var fs = require("fs");

const appendRun = async () => {
  fs.readFile("outputs/results_full.json", function (err, data) {
    var json = JSON.parse(data);
    console.log(json.length / 6);
    for (let el of json) {
      console.log(
        el[0][0].summary.time / 60,
        el[0][0].locations[0].date_time,
        el[1][0].locations[0].date_time,
        el[2][0].locations[0].date_time,
        el[0][0].summary.length
      );
    }
  });
};

appendRun();
