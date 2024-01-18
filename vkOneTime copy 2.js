const axios = require("axios");
var fs = require("fs");
const addMinutes = (oldDateObj, diff) =>
  new Date(oldDateObj.getTime() + diff * 60 * 1000);
const addSeconds = (oldDateObj, diff) =>
  new Date(oldDateObj.getTime() + diff * 1000);
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

fs.writeFile("results_full.json", JSON.stringify([]), function (err) {
  if (err) throw err;
  console.log('The "data to append" was appended to file!');
});
fs.writeFile("results_legs.json", JSON.stringify([]), function (err) {
  if (err) throw err;
  console.log('The "data to append" was appended to file!');
});

let firstTrip;

const appendRun = async (initDate, isFirst) => {
  try {
    const isoDate = initDate.toISOString().substr(0, 16);

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
        alternates: 4,
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

    console.log(234, isFirst, response.data.error); //

    const legs = [];
    let finalTrip;

    if (isFirst) {
      for (let leg of response.data.trips[0].trip.legs) {
        legs.push({
          edges: leg.edges.map((edge) => ({
            id: edge.id,
            length: edge.length,
            shape_index_start: edge.shape_index_start,
            shape_index_finish: edge.shape_index_finish,
            traffic_score: edge.traffic_score,
            speed_limit: edge.speed_limit,
          })),
          shape: decode(leg.shape, 6),
        });
        finalTrip = response.data.trips[0].trip;
      }
      firstTrip = response.data.trips[0].trip;
    } else {
      let isFoundWay = false;
      tripFilter: for (let trip of response.data.trips) {
        console.log(trip.summary, "st 1");
        if (trip.trip.summary.length !== firstTrip.summary.length) continue;
        console.log("st 2", trip);

        for (let legId in trip.trip.legs) {
          const leg = trip.trip.legs[legId];
          for (let edge of leg.edges) {
            const foundEdge = firstTrip.legs[legId].edges.find(
              (el) => el.id === edge.id
            );
            if (!foundEdge) continue tripFilter;
          }
        }

        console.log("st 3");

        for (let leg of trip.trip.legs) {
          legs.push({
            edges: leg.edges.map((edge) => ({
              id: edge.id,
              traffic_score: edge.traffic_score,
              speed_limit: edge.speed_limit,
            })),
          });
        }

        finalTrip = trip.trip;
        isFoundWay = true;
      }

      if (!isFoundWay) {
        await new Promise((res, rej) => {
          setTimeout(() => res(), 1000);
        });
        return await appendRun(isoDate, isFirst);
      }
    }

    //console.log(response.data.trips[0].trip, legs);

    fs.readFile("results_full.json", function (err, data) {
      var json = JSON.parse(data);
      json.push(finalTrip); //response.data.trips[0].trip

      fs.writeFile("results_full.json", JSON.stringify(json), function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to full file!');
      });
    });
    fs.readFile("results_legs.json", function (err, data) {
      var json = JSON.parse(data);
      json.push(legs);

      fs.writeFile("results_legs.json", JSON.stringify(json), function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to legs file!');
      });
    });
  } catch (e) {
    //console.log(e);
    await new Promise((res, rej) => {
      setTimeout(() => res(), 1000);
    });
    await appendRun(isoDate, isFirst);
  }
};

let initDate = new Date("2024-01-11T03:00");

(async () => {
  for (let i = 0; i < 6 * 24 * 10; i += 10) {
    console.log(i, initDate);
    console.log(i, initDate);

    await appendRun(new Date(initDate), i === 0);
    initDate = addMinutes(initDate, 10);
  }
})();
