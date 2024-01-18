const axios = require("axios");
var fs = require("fs");

const decode = function (str, precision) {
  var index = 0,
    lat = 0,
    lng = 0,
    coordinates = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision || 6);
  // Coordinates have variable length when encoded, so just keep
  // track of whether we've hit the end of the string. In each
  // loop iteration, a single coordinate is decoded.
  while (index < str.length) {
    // Reset shift, result, and byte
    byte = null;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    lat += latitude_change;
    lng += longitude_change;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

fs.writeFile("results1.json", JSON.stringify([]), function (err) {
  if (err) throw err;
  console.log('The "data to append" was appended to file!');
});

const appendRun = async (isoDate, isFirst) => {
  try {
    console.log(1, isoDate);
    const response = await axios.post(
      "https://demo.maps.vk.com/api/directions",
      {
        locations: [
          {
            lat: 55.698111,
            lon: 37.650385,
            type: "break",
          },
          {
            lat: 55.693611,
            lon: 37.662955,
          },
          {
            lat: 55.688949,
            lon: 37.672121,
          },
          {
            lat: 55.690151,
            lon: 37.675511,
          },
          {
            lat: 55.692145,
            lon: 37.679718,
          },
          {
            lat: 55.702133,
            lon: 37.688482,
          },
          {
            lat: 55.705206,
            lon: 37.687679,
          },
          {
            lat: 55.701704,
            lon: 37.687983,
          },
          {
            lat: 55.691645,
            lon: 37.678883,
          },
          {
            lat: 55.689898,
            lon: 37.674371,
          },
          {
            lat: 55.688099,
            lon: 37.669971,
          },
          {
            lat: 55.695097,
            lon: 37.663804,
          },
          {
            lat: 55.698217,
            lon: 37.650954,
          },
          {
            lat: 55.698902,
            lon: 37.651319,
            type: "break",
          },
        ],
        costing: "auto",
        language: "ru-RU",
        directions_type: "instructions",
        id: "route_to_airport",
        date_time: {
          type: 1,
          value: isoDate,
        },
        completeness: "enriched",
        costing_options: {
          auto: {
            traffic: true,
          },
        },
      },
      {
        headers: {
          "Content-type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log(234, response.data);

    for (let i in response.data.trips[0].trip.legs) {
      let leg = response.data.trips[0].trip.legs[i];
      //console.log(leg);
      leg.shape = decode(leg.shape, 6);
      for (let maneuverId in leg.maneuvers) {
        let maneuver = leg.maneuvers[maneuverId];
        // maneuver.from = shapeCoords[begin_shape_index];
        // maneuver.to = shapeCoords[end_shape_index];
        leg.maneuvers[maneuverId] = {
          from: leg.shape[maneuver.begin_shape_index],
          to: leg.shape[maneuver.end_shape_index],
          time: maneuver.time,
          length: maneuver.length,
          begin_edge_index: maneuver.begin_edge_index,
          end_edge_index: maneuver.end_edge_index,
        };
      }
      leg.summary.from = leg.maneuvers[0].from;
      leg.summary.to = leg.maneuvers[leg.maneuvers.length - 1].to;

      console.log(leg.summary);
      response.data.trips[0].trip.legs[i] = leg;
    }

    console.log(response.data.trips[0].trip);

    fs.readFile("results1.json", function (err, data) {
      var json = JSON.parse(data);
      json.push(response.data.trips[0].trip);

      fs.writeFile("results1.json", JSON.stringify(json), function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
      });
    });
  } catch (e) {
    //console.log(e);
    await new Promise((res, rej) => {
      setTimeout(() => res(), 1000);
    });
    await appendRun(isoDate);
  }
};

let initDate = new Date("2024-01-11T04:00");
const addMinutes = (oldDateObj, diff) =>
  new Date(oldDateObj.getTime() + diff * 60 * 1000);

(async () => {
  for (let i = 0; i < 6 * 12 * 10; i += 10) {
    console.log(i, initDate);
    const isoDate = new Date(initDate).toISOString().substr(0, 16);
    console.log(i, initDate);

    await appendRun(isoDate, i === 0);
    initDate = addMinutes(initDate, 10);
  }
})();
