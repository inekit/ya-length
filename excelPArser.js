const Excel = require("exceljs");
var fs = require("fs");

const workbook = new Excel.Workbook();

(async () => {
  await workbook.xlsx.readFile("inputs/newRoutes.xlsx");
  let worksheet = workbook.getWorksheet("Остановки");
  const stations = [];
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    if (rowNumber === 1) return;

    stations.push({
      id: row.values[1],
      name: row.values[2],
      coordinates: [row.values[5], row.values[6]],
    });
  });
  console.log(stations);

  worksheet = workbook.getWorksheet("Маршруты");
  const trips = [];
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    if (rowNumber !== 1)
      trips.push({
        id: row.values[1],
        number: row.values[2],
        name: row.values[3],
        routes: [],
      });
  });

  worksheet = workbook.getWorksheet("Рейсы");
  const routes = [];
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    if (rowNumber === 1) return;

    const route = {
      trip_id: row.values[1],
      direction: row.values[2],
      station_id: row.values[3],
      station: stations.find((el) => el.id === row.values[3]),
    };
    routes.push(route);

    const trip = trips.find((el) => el.id === route.trip_id);
    console.log(route.trip_id, trip);
    trip.routes.push(route);
  });

  console.log(trips[0].routes);

  fs.writeFile("inputs/trips.json", JSON.stringify(trips), function (err) {
    if (err) throw err;
  });
})();
