ymaps.ready(init);

const fullDay = [];

async function init() {
  var container = document.createElement("div");
  container.id = "map";
  document.body.appendChild(container);
  /*var myMap = new ymaps.Map("map", {
                center: [55.745508, 37.435225],
                zoom: 13
            }, {
                searchControlProvider: 'yandex#search'
            });
    */

  const pointsCoordinates = [
    [55.698111, 37.650385],
    [55.693611, 37.662955],
    [55.688949, 37.672121],
    [55.690151, 37.675511],
    [55.692145, 37.679718],
    [55.702133, 37.688482],
    [55.705206, 37.687679],
    [55.701704, 37.687983],
    [55.691645, 37.678883],
    [55.689898, 37.674371],
    [55.688099, 37.669971],
    [55.695097, 37.663804],
    [55.698217, 37.650954],
    [55.698902, 37.651319],
  ];

  ymaps.route(pointsCoordinates, { avoidTrafficJams: true }).then(
    function (route) {
      //myMap.geoObjects.add(route);
      try {
        var points = route.getWayPoints(),
          lastPoint = points.getLength() - 1;
        console.log(points, lastPoint);
        // Задаем стиль метки - иконки будут красного цвета, и
        // их изображения будут растягиваться под контент.
        points.options.set("preset", "islands#redStretchyIcon");
        // Задаем контент меток в начальной и конечной точках.
        points.get(0).properties.set("iconContent", "Точка отправления");
        points.get(lastPoint).properties.set("iconContent", "Точка прибытия");

        // Проанализируем маршрут по сегментам.
        // Сегмент - участок маршрута, который нужно проехать до следующего
        // изменения направления движения.
        // Для того, чтобы получить сегменты маршрута, сначала необходимо получить
        // отдельно каждый путь маршрута.
        // Весь маршрут делится на два пути:
        // 1) от улицы Крылатские холмы до станции "Кунцевская";
        // 2) от станции "Кунцевская" до "Пионерская".

        var way, segments;
        // Получаем массив путей.
        //console.log(route.getPaths())
        //console.log(route.getViaPoints())

        let dateStart = new Date();
        const dateStartFixed = dateStart;
        const addSeconds = (oldDateObj, diff) =>
          new Date(oldDateObj.getTime() + diff * 1000);

        const outputs = [];
        for (var i = 0; i < route.getPaths().getLength(); i++) {
          way = route.getPaths().get(i);
          console.log(
            `way ${i}`,
            way.getLength(),
            way.getJamsTime(),
            pointsCoordinates[i],
            pointsCoordinates[i + 1]
          );

          const wObj = {
            length: way.getLength(),
            time: way.getJamsTime(),
            startTime: dateStart,
            fromPoint: pointsCoordinates[i],
            toPoint: pointsCoordinates[i + 1],
            segments: [],
          };
          segments = way.getSegments();
          for (var j = 0; j < segments.length; j++) {
            const crd = segments[j].getCoordinates();

            const sObj = {
              fromPoint: crd[0],
              toPoint: crd[crd.length - 1],
              startTime: dateStart,
              length: segments[j].getLength(),
              time: segments[j].getJamsTime(),
            };
            //console.log(i,j,dateStart,segments[j].getJamsTime())
            dateStart = addSeconds(dateStart, segments[j].getJamsTime());
            //console.log(dateStart)
            //console.log(sObj)
            wObj.segments.push(sObj);
          }
          outputs.push(wObj);
        }
        console.log(
          JSON.stringify({
            time: route.getJamsTime(),
            length: route.getLength(),
            fromPoint: outputs[0].fromPoint,
            toPoint: outputs[outputs.length - 1].toPoint,
            startTime: dateStartFixed,
            legs: outputs,
          })
        );

        const runRes = {
          time: route.getJamsTime(),
          length: route.getLength(),
          fromPoint: outputs[0].fromPoint,
          toPoint: outputs[outputs.length - 1].toPoint,
          startTime: dateStartFixed,
          legs: outputs,
        };

        saveAs(
          new Blob([JSON.stringify(runRes)], {
            type: "text/plain",
          }),
          `${dateStartFixed.toUTCString()}.json`
        );

        fullDay.push(runRes);

        saveAs(
          new Blob([JSON.stringify(fullDay)], {
            type: "text/plain",
          }),
          `fDay-${dateStartFixed.toUTCString()}.json`
        );
      } catch (e) {
        console.log(e);
      }

      // Выводим маршрутный лист.
    },
    function (error) {
      console.log("Возникла ошибка: " + error.message);
    }
  );
}

setInterval(() => {
  init();
}, 600000);
