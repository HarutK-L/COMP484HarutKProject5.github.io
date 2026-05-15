

let map;
let currentIndex = 0;
let score = 0;
let targetFeature = null;

/*
startTime:
Stores when the game began.

timerInterval:
Updates the timer every second.

bestTime:
Stores the fastest completion time
using localStorage.
*/
let startTime;
let timerInterval;
let bestTime = localStorage.getItem("bestTime");

/*
north = top latitude
south = bottom latitude
east = right longitude
west = left longitude
*/
const locations = [
  {
    name: "Santa Susana Hall",
    bounds: {
      north: 34.23806753666565,
      south: 34.23742649101076,
      east: -118.52919815225377,
      west: -118.52939891579253
    }
  },
  {
    name: "Oviatt Library",
    bounds: {
      north: 34.2409019608814,
      south: 34.23995144894882,
      east: -118.52862691063287,
      west: -118.53002524799618
    }
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.24206358258693,
      south: 34.2411655000043,
      east: -118.52804259963673,
      west: -118.52941870951726
    }
  },
  {
    name: "Chaparral Hall",
    bounds: {
      north: 34.238896774323536,
      south: 34.238026670132534,
      east: -118.5266002207186,
      west: -118.52721435421721
    }
  },
  {
    name: "Juniper Hall",
    bounds: {
      north: 34.242658611395385,
      south: 34.241750374251396,
      east: -118.53018522352755,
      west: -118.53108934201043
    }
  }
];

/*

This shuffles the locations array
so the order changes every game.
*/
locations.sort(() => Math.random() - 0.5);

/*
========================================================
INITIALIZE MAP
========================================================
*/
function initMap() {

  const csunCenter = {
    lat: 34.2398,
    lng: -118.5290

  };

  /*
  ========================================================
  WEBGL / 3D MAP FEATURE
  ========================================================

  The map becomes 3D because:

  A VECTOR MAP ID is used. Google internally renders vector maps using WebGL.
  ========================================================
  */
  map = new google.maps.Map(document.getElementById("map"), {

    center: csunCenter,

    zoom: 18,

    // Creates 3D perspective
    tilt: 67.5,

    // Keeps map facing north
    heading: 0,

    /*
      This must be a VECTOR map ID
      created in Google Cloud Console.
    */
    mapId: "90a714d8230865784404b509",

    /*
    ========================================================
    MAP CONTROL SETTINGS
    ========================================================

    These disable:
    - Zooming
    - Dragging
    - Panning
    - Keyboard movement
    ========================================================
    */
    disableDefaultUI: true,
    gestureHandling: "none",
    keyboardShortcuts: false,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false
  });

  /*
  Ensures the map stays in tilted 3D mode
  after map tiles finish loading.
  */
  map.addListener("tilesloaded", () => {
    map.setTilt(67.5);
    map.setHeading(0);
  });

  /*
  ========================================================
  DATA LAYER FEATURE
  ========================================================

  Adds all buildings into the Google Maps Data Layer.

  The Data Layer stores geographic features like:
  - polygons
  - points
  - lines

  Each building becomes a polygon.
  ========================================================
  */
  addBuildingsToDataLayer();

  /*
  ========================================================
  DOUBLE CLICK EVENT
  ========================================================

  Player double-clicks map to guess location.
  ========================================================
  */
  map.addListener("dblclick", handleGuess);

  createExtraUI();

  startTimer();

  showPrompt();
}

/*
========================================================
CREATE EXTRA GAME UI
========================================================

Creates:
- Timer display
- Fastest time display
- Restart button
========================================================
*/
function createExtraUI() {

  const gamePanel = document.getElementById("game-panel");

  // Timer text
  const timerText = document.createElement("p");
  timerText.id = "timer";
  timerText.textContent = "Time: 0s";
  gamePanel.appendChild(timerText);

  // Best time text
  const bestTimeText = document.createElement("p");
  bestTimeText.id = "best-time";

  bestTimeText.textContent = bestTime
    ? `Fastest Time: ${bestTime}s`
    : "Fastest Time: None";

  gamePanel.appendChild(bestTimeText);

  // Restart button
  const restartButton = document.createElement("button");

  restartButton.id = "restart-button";

  restartButton.textContent = "Restart Game";

  restartButton.style.display = "none";

  restartButton.onclick = restartGame;

  gamePanel.appendChild(restartButton);
}

/*
========================================================
START TIMER
========================================================

Updates timer every second.
========================================================
*/
function startTimer() {

  startTime = Date.now();

  timerInterval = setInterval(() => {

    const currentTime =
      Math.floor((Date.now() - startTime) / 1000);

    document.getElementById("timer").textContent =
      `Time: ${currentTime}s`;

  }, 1000);
}

/*
========================================================
STOP TIMER
========================================================
*/
function stopTimer() {

  clearInterval(timerInterval);

  return Math.floor((Date.now() - startTime) / 1000);
}

/*
========================================================
ADD BUILDINGS TO DATA LAYER
========================================================
*/
function addBuildingsToDataLayer() {

  locations.forEach((location) => {

    const b = location.bounds;

    /*
    ========================================================
    DATA LAYER + GEOJSON
    ========================================================

    Each building is converted into a GeoJSON polygon.

    GeoJSON format is used by the Google Maps Data Layer.
    ========================================================
    */
    map.data.addGeoJson({

      type: "Feature",

      properties: {
        name: location.name,
        status: "hidden"
      },

      geometry: {
        type: "Polygon",

        /*
        ====================================================
        Polygon coordinates

        Format:
        [longitude, latitude]
        ====================================================
        */
        coordinates: [[
          [b.west, b.south],
          [b.east, b.south],
          [b.east, b.north],
          [b.west, b.north],
          [b.west, b.south]
        ]]
      }
    });
  });

  /*
  ========================================================
  DATA LAYER STYLING
  ========================================================

  Changes polygon colors dynamically.

  correct -> green
  wrong -> red
  hidden -> invisible
  ========================================================
  */
  map.data.setStyle((feature) => {

    const status = feature.getProperty("status");

    if (status === "correct") {

      return {
        fillColor: "green",
        strokeColor: "green",
        fillOpacity: 0.55,
        strokeOpacity: 1,
        strokeWeight: 3
      };
    }

    if (status === "wrong") {

      return {
        fillColor: "red",
        strokeColor: "red",
        fillOpacity: 0.55,
        strokeOpacity: 1,
        strokeWeight: 3
      };
    }

    // Invisible before answer
    return {
      fillOpacity: 0,
      strokeOpacity: 0,
      clickable: false
    };
  });
}

/*
========================================================
SHOW PROMPT
========================================================
*/
function showPrompt() {

  const prompt = document.getElementById("prompt");

  const scoreText = document.getElementById("score");

  /*
  ========================================================
  END GAME
  ========================================================
  */
  if (currentIndex >= locations.length) {

    const finalTime = stopTimer();

    prompt.textContent =
      `Game over! You got ${score} out of ${locations.length} correct.`;

    scoreText.textContent =
      `Final Score: ${score} / ${locations.length}`;

    checkBestTime(finalTime);

    /*
    ========================================================
    CONFETTI EFFECT
    ========================================================

    Launches only if player gets 5/5.
    ========================================================
    */
    if (score === locations.length) {
      launchConfetti();
    }

    document.getElementById("restart-button").style.display = "block";

    return;
  }

  prompt.textContent =
    `Double click where you think ${locations[currentIndex].name} is.`;

  scoreText.textContent =
    `Score: ${score} / ${currentIndex}`;
}

/*
========================================================
CHECK FASTEST TIME
========================================================
*/
function checkBestTime(finalTime) {

  if (!bestTime || finalTime < Number(bestTime)) {

    bestTime = finalTime;

    localStorage.setItem("bestTime", bestTime);

    document.getElementById("best-time").textContent =
      `Fastest Time: ${bestTime}s`;
  }
}

/*
========================================================
HANDLE PLAYER GUESS
========================================================
*/
function handleGuess(event) {

  if (currentIndex >= locations.length) return;

  const location = locations[currentIndex];

  const clicked = event.latLng;

  const expanded = expandBounds(location.bounds);

  /*
  ========================================================
  CHECK IF GUESS IS CORRECT
  ========================================================
  */
  const isCorrect =
    clicked.lat() <= expanded.north &&
    clicked.lat() >= expanded.south &&
    clicked.lng() <= expanded.east &&
    clicked.lng() >= expanded.west;

  targetFeature = findFeatureByName(location.name);

  if (isCorrect) {

    score++;

    alert("Correct!");

    /*
    ========================================================
    DATA LAYER PROPERTY CHANGE
    ========================================================

    Changing status changes polygon color to green.
    ========================================================
    */
    targetFeature.setProperty("status", "correct");

  } else {

    alert("Wrong! The correct location is shown in red.");

    /*
    ========================================================
    DATA LAYER PROPERTY CHANGE
    ========================================================

    Changing status changes polygon color to red.
    ========================================================
    */
    targetFeature.setProperty("status", "wrong");
  }

  currentIndex++;

  setTimeout(() => {

    clearDataLayerColors();

    showPrompt();

  }, 2000);
}

/*
========================================================
FIND BUILDING FEATURE
========================================================
*/
function findFeatureByName(name) {

  let foundFeature = null;

  map.data.forEach((feature) => {

    if (feature.getProperty("name") === name) {

      foundFeature = feature;
    }
  });

  return foundFeature;
}

/*
========================================================
CLEAR POLYGON COLORS
========================================================
*/
function clearDataLayerColors() {

  map.data.forEach((feature) => {

    feature.setProperty("status", "hidden");
  });
}

/*
========================================================
EXPAND BOUNDS
========================================================

Makes building click area slightly larger
for easier gameplay.
========================================================
*/
function expandBounds(bounds, amount = 0.00015) {

  return {
    north: bounds.north + amount,
    south: bounds.south - amount,
    east: bounds.east + amount,
    west: bounds.west - amount
  };
}

/*
========================================================
RESTART GAME
========================================================
*/
function restartGame() {

  location.reload();
}

/*
========================================================
CONFETTI EFFECT
========================================================

Creates falling colored squares
when player gets a perfect score.
========================================================
*/
function launchConfetti() {

  const duration = 2000;

  const end = Date.now() + duration;

  const colors = [
    "#ff0000",
    "#00cc66",
    "#0066ff",
    "#ffcc00",
    "#cc00ff"
  ];

  const confettiInterval = setInterval(() => {

    if (Date.now() > end) {

      clearInterval(confettiInterval);

      return;
    }

    const confetti = document.createElement("div");

    confetti.className = "confetti";

    confetti.style.left =
      Math.random() * window.innerWidth + "px";

    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 2000);

  }, 50);
}