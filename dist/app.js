"use strict";

const NS = "http://www.w3.org/2000/svg";

const defaults = Object.freeze({
  wheelDiameter: 686,
  wheelbase: 1010,
  chainstay: 420,
  bbDrop: 74,
  seatTube: 462,
  seatAngle: 73.5,
  headTube: 123,
  headAngle: 71,
  reach: 386,
  stack: 545,
  saddleHeight: 650,
  stemLength: 80,
  cockpitSpacer: 0,
  stemRise: 6,
  crankLength: 160,
});

const bounds = Object.freeze({
  wheelDiameter: [500, 800], wheelbase: [750, 1400], chainstay: [300, 650], bbDrop: [0, 140],
  seatTube: [250, 750], seatAngle: [60, 85], headTube: [60, 300], headAngle: [55, 85],
  reach: [250, 550], stack: [350, 750], saddleHeight: [400, 1000], stemLength: [30, 180],
  cockpitSpacer: [0, 80], stemRise: [-30, 45], crankLength: [120, 220],
});

const form = document.querySelector("#geometryForm");
const resetButton = document.querySelector("#resetButton");
const svg = document.querySelector("#bikeCanvas");
const layers = {
  grid: document.querySelector("#gridLayer"),
  dimensions: document.querySelector("#dimensionLayer"),
  bike: document.querySelector("#bikeLayer"),
  labels: document.querySelector("#labelLayer"),
};
const drawingError = document.querySelector("#drawingError");

const metricElements = {
  reach: document.querySelector("#metricReach"),
  stack: document.querySelector("#metricStack"),
  frontCentre: document.querySelector("#metricFrontCentre"),
  trail: document.querySelector("#metricTrail"),
  topTube: document.querySelector("#metricTopTube"),
};

function element(name, attributes = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (parent) parent.appendChild(node);
  return node;
}

function clearLayers() {
  Object.values(layers).forEach((layer) => layer.replaceChildren());
}

function readGeometry() {
  const geometry = {};
  let valid = true;

  for (const [name, [min, max]] of Object.entries(bounds)) {
    const input = form.elements[name];
    const value = Number(input.value);
    const fieldValid = Number.isFinite(value) && value >= min && value <= max;
    input.setAttribute("aria-invalid", fieldValid ? "false" : "true");
    if (!fieldValid) valid = false;
    geometry[name] = value;
  }

  if (geometry.chainstay <= geometry.bbDrop) {
    form.elements.chainstay.setAttribute("aria-invalid", "true");
    form.elements.bbDrop.setAttribute("aria-invalid", "true");
    valid = false;
  }

  return { geometry, valid };
}

function calculate(g) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const seatAngle = radians(g.seatAngle);
  const headAngle = radians(g.headAngle);
  const stemAngle = radians(g.stemRise);
  const radius = g.wheelDiameter / 2;

  const rear = { x: 0, y: 0 };
  const front = { x: g.wheelbase, y: 0 };
  const bb = { x: Math.sqrt(g.chainstay ** 2 - g.bbDrop ** 2), y: -g.bbDrop };
  const seatTop = {
    x: bb.x - Math.cos(seatAngle) * g.seatTube,
    y: bb.y + Math.sin(seatAngle) * g.seatTube,
  };
  const saddle = {
    x: bb.x - Math.cos(seatAngle) * g.saddleHeight,
    y: bb.y + Math.sin(seatAngle) * g.saddleHeight,
  };
  const headTop = {
    x: bb.x + g.reach,
    y: bb.y + g.stack,
  };
  const headBottom = {
    x: headTop.x + Math.cos(headAngle) * g.headTube,
    y: headTop.y - Math.sin(headAngle) * g.headTube,
  };
  const spacerTop = {
    x: headTop.x - Math.cos(headAngle) * g.cockpitSpacer,
    y: headTop.y + Math.sin(headAngle) * g.cockpitSpacer,
  };
  const stemEnd = {
    x: spacerTop.x + Math.cos(stemAngle) * g.stemLength,
    y: spacerTop.y + Math.sin(stemAngle) * g.stemLength,
  };
  const reach = g.reach;
  const stack = g.stack;
  const frontCentre = distance(bb, front);
  const topTube = distance(seatTop, headTop);
  const steeringAxisAtGround = headTop.x + (headTop.y + radius) / Math.tan(headAngle);
  const trail = steeringAxisAtGround - front.x;

  return { radius, rear, front, bb, seatTop, saddle, headBottom, headTop, spacerTop, stemEnd, reach, stack, frontCentre, topTube, trail };
}

function createMapper(points, radius) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMin = Math.min(...xs, -radius) - 80;
  const xMax = Math.max(...xs, points[1].x + radius) + 100;
  const yMin = Math.min(...ys, -radius) - 105;
  const yMax = Math.max(...ys, radius) + 105;
  const scale = Math.min(1110 / (xMax - xMin), 620 / (yMax - yMin));
  const drawnWidth = (xMax - xMin) * scale;
  const drawnHeight = (yMax - yMin) * scale;
  const offsetX = (1200 - drawnWidth) / 2 - xMin * scale;
  const offsetY = (720 - drawnHeight) / 2 + yMax * scale;
  return {
    scale,
    point: (p) => ({ x: offsetX + p.x * scale, y: offsetY - p.y * scale }),
    length: (value) => value * scale,
  };
}

function line(parent, mapper, a, b, className, extras = {}) {
  const p1 = mapper.point(a);
  const p2 = mapper.point(b);
  return element("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: className, ...extras }, parent);
}

function circle(parent, mapper, centre, radius, className, extras = {}) {
  const p = mapper.point(centre);
  return element("circle", { cx: p.x, cy: p.y, r: mapper.length(radius), class: className, ...extras }, parent);
}

function text(parent, mapper, point, value, className, extras = {}) {
  const p = mapper.point(point);
  const node = element("text", { x: p.x, y: p.y, class: className, ...extras }, parent);
  node.textContent = value;
  return node;
}

function drawGrid(mapper, model) {
  const start = -400;
  const end = Math.ceil((model.front.x + model.radius) / 100) * 100;
  for (let x = start; x <= end; x += 100) {
    line(layers.grid, mapper, { x, y: -model.radius - 80 }, { x, y: model.radius + 700 }, "grid-line");
  }
  for (let y = -400; y <= 1000; y += 100) {
    line(layers.grid, mapper, { x: -model.radius - 80, y }, { x: model.front.x + model.radius + 100, y }, y === 0 ? "ground-line" : "grid-line");
  }
}

function drawWheel(mapper, centre, radius) {
  circle(layers.bike, mapper, centre, radius, "tyre");
  circle(layers.bike, mapper, centre, radius - 18, "rim");
  circle(layers.bike, mapper, centre, 17, "hub");
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const target = { x: centre.x + Math.cos(angle) * (radius - 22), y: centre.y + Math.sin(angle) * (radius - 22) };
    line(layers.bike, mapper, centre, target, "spoke");
  }
}

function drawDimension(mapper, a, b, label, offset = 0, orientation = "horizontal") {
  let start;
  let end;
  let labelPoint;

  if (orientation === "horizontal") {
    start = { x: a.x, y: a.y + offset };
    end = { x: b.x, y: a.y + offset };
    line(layers.dimensions, mapper, a, start, "dimension-extension");
    line(layers.dimensions, mapper, b, { x: b.x, y: start.y }, "dimension-extension");
    labelPoint = { x: (start.x + end.x) / 2, y: start.y + 22 / mapper.scale };
  } else {
    start = { x: a.x + offset, y: a.y };
    end = { x: a.x + offset, y: b.y };
    line(layers.dimensions, mapper, a, start, "dimension-extension");
    line(layers.dimensions, mapper, b, { x: start.x, y: b.y }, "dimension-extension");
    labelPoint = { x: start.x + 14 / mapper.scale, y: (start.y + end.y) / 2 };
  }

  line(layers.dimensions, mapper, start, end, "dimension-line", { "marker-start": "url(#dimensionArrow)", "marker-end": "url(#dimensionArrow)" });
  text(layers.labels, mapper, labelPoint, label, "dimension-text", orientation === "vertical" ? { transform: `rotate(-90 ${mapper.point(labelPoint).x} ${mapper.point(labelPoint).y})` } : {});
}

function drawSpacerStack(mapper, g, model) {
  if (g.cockpitSpacer <= 0) return;

  const headAngle = g.headAngle * Math.PI / 180;
  const steerer = { x: -Math.cos(headAngle), y: Math.sin(headAngle) };
  const cross = { x: Math.sin(headAngle), y: Math.cos(headAngle) };
  const bands = Math.max(1, Math.ceil(g.cockpitSpacer / 5));

  line(layers.bike, mapper, model.headTop, model.spacerTop, "cockpit-spacer");

  for (let index = 0; index <= bands; index += 1) {
    const distance = g.cockpitSpacer * index / bands;
    const centre = {
      x: model.headTop.x + steerer.x * distance,
      y: model.headTop.y + steerer.y * distance,
    };
    const halfWidth = 13;
    line(
      layers.bike,
      mapper,
      { x: centre.x - cross.x * halfWidth, y: centre.y - cross.y * halfWidth },
      { x: centre.x + cross.x * halfWidth, y: centre.y + cross.y * halfWidth },
      "cockpit-spacer-ring",
    );
  }
}

function drawBike(g, model) {
  const points = [model.rear, model.front, model.bb, model.seatTop, model.saddle, model.headBottom, model.headTop, model.spacerTop, model.stemEnd];
  const mapper = createMapper(points, model.radius);
  document.querySelector("#scaleLabel").textContent = `${Math.round(mapper.scale * 100)}% drawing scale`;

  drawGrid(mapper, model);
  drawDimension(mapper, model.rear, model.front, `${Math.round(g.wheelbase)} mm wheelbase`, -model.radius - 58, "horizontal");
  drawDimension(mapper, model.bb, { x: model.headTop.x, y: model.bb.y }, `${Math.round(model.reach)} mm reach`, -82, "horizontal");
  drawDimension(mapper, model.bb, { x: model.bb.x, y: model.headTop.y }, `${Math.round(model.stack)} mm stack`, 78, "vertical");

  drawWheel(mapper, model.rear, model.radius);
  drawWheel(mapper, model.front, model.radius);

  line(layers.bike, mapper, model.rear, model.bb, "frame-tube");
  line(layers.bike, mapper, model.rear, model.seatTop, "frame-tube");
  line(layers.bike, mapper, model.bb, model.seatTop, "frame-tube frame-accent");
  line(layers.bike, mapper, model.seatTop, model.headTop, "frame-tube");
  line(layers.bike, mapper, model.bb, model.headBottom, "frame-tube");
  line(layers.bike, mapper, model.headBottom, model.headTop, "frame-tube frame-accent");

  line(layers.bike, mapper, model.headBottom, model.front, "fork-blade");
  const forkOffset = { x: -8 / mapper.scale, y: 0 };
  line(layers.bike, mapper, { x: model.headBottom.x + forkOffset.x, y: model.headBottom.y }, { x: model.front.x + forkOffset.x, y: model.front.y }, "fork-blade secondary-fork");

  line(layers.bike, mapper, model.seatTop, model.saddle, "seatpost");
  const saddleRear = { x: model.saddle.x - 78, y: model.saddle.y + 7 };
  const saddleFront = { x: model.saddle.x + 55, y: model.saddle.y + 2 };
  line(layers.bike, mapper, saddleRear, saddleFront, "saddle");

  drawSpacerStack(mapper, g, model);
  line(layers.bike, mapper, model.spacerTop, model.stemEnd, "cockpit");
  const barTop = { x: model.stemEnd.x + 12, y: model.stemEnd.y - 10 };
  const barForward = { x: model.stemEnd.x + 56, y: model.stemEnd.y - 10 };
  line(layers.bike, mapper, barTop, barForward, "handlebar");
  const barPathStart = mapper.point(barForward);
  const barDrop = mapper.point({ x: barForward.x - 7, y: barForward.y - 92 });
  const barReturn = mapper.point({ x: barForward.x - 43, y: barForward.y - 86 });
  element("path", { d: `M ${barPathStart.x} ${barPathStart.y} C ${barPathStart.x + 7} ${barPathStart.y + 30}, ${barDrop.x + 14} ${barDrop.y}, ${barDrop.x} ${barDrop.y} C ${barDrop.x - 8} ${barDrop.y}, ${barReturn.x} ${barReturn.y}, ${barReturn.x} ${barReturn.y}`, class: "handlebar" }, layers.bike);

  circle(layers.bike, mapper, model.bb, 98, "chainring");
  circle(layers.bike, mapper, model.bb, 76, "chainring-inner");
  circle(layers.bike, mapper, model.bb, 10, "hub");
  circle(layers.bike, mapper, model.rear, 39, "cassette");
  line(layers.bike, mapper, { x: model.rear.x, y: 39 }, { x: model.bb.x, y: 98 }, "chain");
  line(layers.bike, mapper, { x: model.rear.x, y: -39 }, { x: model.bb.x, y: -98 }, "chain");

  const crankAngle = -32 * Math.PI / 180;
  const crankEnd = {
    x: model.bb.x + Math.cos(crankAngle) * g.crankLength,
    y: model.bb.y + Math.sin(crankAngle) * g.crankLength,
  };
  line(layers.bike, mapper, model.bb, crankEnd, "crank");
  line(layers.bike, mapper, { x: crankEnd.x - 24, y: crankEnd.y }, { x: crankEnd.x + 30, y: crankEnd.y }, "pedal");

  for (const [label, point] of [["REAR AXLE", model.rear], ["BB", model.bb], ["FRONT AXLE", model.front]]) {
    text(layers.labels, mapper, { x: point.x, y: point.y - 30 / mapper.scale }, label, "point-label", { "text-anchor": "middle" });
  }
}

function setMetrics(model) {
  const formatted = {
    reach: model.reach,
    stack: model.stack,
    frontCentre: model.frontCentre,
    trail: model.trail,
    topTube: model.topTube,
  };
  for (const [name, value] of Object.entries(formatted)) {
    metricElements[name].textContent = Number.isFinite(value) ? `${Math.round(value)} mm` : "—";
  }
}

function showError(message) {
  clearLayers();
  Object.values(metricElements).forEach((element) => { element.textContent = "—"; });
  drawingError.textContent = message;
  drawingError.hidden = false;
}

function render() {
  const { geometry, valid } = readGeometry();
  if (!valid) {
    showError("Check the highlighted values. Chainstay must also be longer than BB drop.");
    return;
  }

  const model = calculate(geometry);
  if (model.reach <= 0 || model.stack <= 0 || model.trail < -50) {
    showError("These values do not form a plausible bike frame. Adjust wheelbase, fork or frame angles.");
    return;
  }

  drawingError.hidden = true;
  clearLayers();
  drawBike(geometry, model);
  setMetrics(model);
}

function loadDefaults() {
  for (const [name, value] of Object.entries(defaults)) form.elements[name].value = value;
  render();
}

form.addEventListener("input", render);
resetButton.addEventListener("click", loadDefaults);
loadDefaults();
