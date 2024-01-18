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
function unflat(src, count) {
  const result = [];
  for (let s = 0, e = count; s < src.length; s += count, e += count)
    result.push(src.slice(s, e));
  return result;
}
let tripsRoutes = [];
const setTripRoutes = async () =>
  new Promise((res) =>
    fs.readFile("inputs/trips.json", function (err, data) {
      tripsRoutes = JSON.parse(data);
      res(tripsRoutes);
    })
  );
fs.writeFile("outputs/results_full.json", JSON.stringify([]), function (err) {
  if (err) throw err;
  console.log('The "data to append" was appended to file!');
});
fs.writeFile("outputs/results_legs.json", JSON.stringify([]), function (err) {
  if (err) throw err;
  console.log('The "data to append" was appended to file!');
});

let firstTrips;

const appendRun = async (_, isFirst) => {
  //console.log(response.data.trips[0].trip, legs);
  tripsRoutes = tripsRoutes.length ? tripsRoutes : await setTripRoutes();

  let firstDate = new Date();

  let initDate = new Date(firstDate);

  const routes = tripsRoutes.map((el) => el.routes);

  const routesLegs = [];
  const routesTrips = [];
  for (let routeId in routes) {
    let route = routes[routeId];
    initDate = new Date(firstDate);

    console.log(initDate);
    route = route.map((el) => ({
      lat: el.station.coordinates[0],
      lon: el.station.coordinates[1],
      type: "break",
    }));

    route = unflat(route, 19);
    console.log(route.length);

    const routeLegs = [];
    const routeTrips = [];

    for (let routePartId in route) {
      console.log(routePartId, "init");

      let routePart = route[routePartId];

      const connection = route[+routePartId + 1]?.[0] ?? route[0][0];
      route[routePartId].push(connection);

      const { trip, legs } = await parseRoute(
        route[routePartId],
        isFirst,
        initDate,
        routeId,
        routePartId
      );

      console.log(routePartId, trip?.summary?.length, "success");

      initDate = addSeconds(initDate, trip.summary.time);
      console.log(initDate);
      routeLegs.push(legs);
      routeTrips.push(trip);
      await new Promise((res, rej) => {
        setTimeout(() => res(), 1000);
      });
    }
    //console.log(route);

    //results.push(await parseRoute(route, isFirst));
    routesLegs.push(routeLegs);
    routesTrips.push(routeTrips);
  }

  firstTrips = firstTrips ?? routesTrips;

  ///const results = await Promise.all(promises);

  fs.readFile("outputs/results_full.json", function (err, data) {
    var json = JSON.parse(data);
    json.push(routesTrips); //response.data.trips[0].trip

    fs.writeFile(
      "outputs/results_full.json",
      JSON.stringify(json),
      function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to full file!');
      }
    );
  });
  fs.readFile("outputs/results_legs.json", function (err, data) {
    var json = JSON.parse(data);
    json.push(routesLegs);

    fs.writeFile(
      "outputs/results_legs.json",
      JSON.stringify(json),
      function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to legs file!');
      }
    );
  });
};

async function parseRoute(locations, isFirst, initDate, tripId, partId) {
  const initDate1 = initDate;
  initDate = initDate ?? new Date();

  try {
    const isoDate = initDate.toISOString().substr(0, 16);

    const response = await axios.post(
      "https://demo.maps.vk.com/api/directions",
      {
        locations: locations ?? [
          {
            lat: 55.698111,
            lon: 37.650385,
            type: "break",
          },
        ],
        costing: "auto",
        language: "ru-RU",
        directions_type: "instructions",
        id: "route_to_airport",
        date_time: {
          type: initDate1 ? 1 : 0,
          value: isoDate,
        },
        alternates: 4,
        //alternates_multi_points: true,
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

    //console.log(234, isFirst, response.data.error); //

    const legs = [];
    let finalTrip;
    let curDate = initDate;

    if (response.data.error) {
      console.log(response.data);
      throw new Error(response.data.error);
    }

    console.log("total trips", response.data.trips);

    if (isFirst) {
      for (let leg of response.data.trips[0].trip.legs) {
        const edges = [];

        for (let edge of leg.edges) {
          edges.push({
            id: edge.id,
            length: edge.length,
            shape_index_start: edge.shape_index_start,
            shape_index_finish: edge.shape_index_finish,
            traffic_score: edge.traffic_score,
            speed_limit: edge.speed_limit,
          });
        }
        for (let maneuverId in leg.maneuvers) {
          leg.maneuvers[maneuverId].start_time = curDate;
          curDate = addSeconds(curDate, leg.maneuvers[maneuverId].time);
          //console.log(leg.maneuvers[maneuverId]);
          edges[leg.maneuvers[maneuverId].begin_edge_index].start_time =
            leg.maneuvers[maneuverId].start_time;
        }
        legs.push({
          edges,
          shape: decode(leg.shape, 6),
        });
      }
      finalTrip = response.data.trips[0].trip;
    } else {
      const firstTrip = firstTrips[tripId][partId];
      let isFoundWay = false;
      tripFilter: for (let tripId in response.data.trips) {
        const trip = response.data.trips[tripId];
        console.log(trip.trip.summary.length, firstTrip.summary.length, "st 1");
        console.log(
          tripId,
          response.data.trips.map((el) => el.trip.summary.length)
        );

        if (trip.trip.summary.length !== firstTrip.summary.length)
          continue tripFilter;
        console.log("st 2"); // trip);

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
          const edges = [];

          for (let edge of leg.edges) {
            edges.push({
              id: edge.id,
              traffic_score: edge.traffic_score,
              speed_limit: edge.speed_limit,
            });
          }
          for (let maneuverId in leg.maneuvers) {
            leg.maneuvers[maneuverId].start_time = curDate;
            curDate = addSeconds(curDate, leg.maneuvers[maneuverId].time);
            //console.log(leg.maneuvers[maneuverId]);
            edges[leg.maneuvers[maneuverId].begin_edge_index].start_time =
              leg.maneuvers[maneuverId].start_time;
          }
          legs.push({
            edges,
          });
        }

        finalTrip = trip.trip;
        isFoundWay = true;
      }

      if (!isFoundWay) {
        await new Promise((res, rej) => {
          setTimeout(() => res(), 10000);
        });
        return await parseRoute(locations, isFirst, initDate, tripId, partId);
      }
    }

    return { trip: finalTrip, legs };
  } catch (e) {
    console.log(e, e.response, locations.length);
    await new Promise((res, rej) => {
      setTimeout(() => res(), 10000);
    });
    return await parseRoute(locations, isFirst, initDate, tripId, partId);
  }
}

setInterval(() => {
  appendRun(1, false);
}, 600000);

appendRun(1, true);
