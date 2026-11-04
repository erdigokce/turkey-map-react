#!/usr/bin/env node
'use strict';

/**
 * Derives a label-friendly centroid for every built-in province from the SVG
 * paths in src/data/index.ts.
 *
 * The built-in paths use only absolute M, L, C, and Z/z commands. Cubic
 * Béziers are flattened, the largest subpath is selected (so island provinces
 * do not pull the centroid into the sea), and the polygon area centroid is
 * used when it falls inside the shape. For concave provinces the script falls
 * back to an approximate pole of inaccessibility: the interior grid point
 * farthest from the polygon boundary.
 *
 * Usage: node scripts/compute-centroids.js [--json]
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/data/index.ts'), 'utf8');
const CURVE_STEPS = 24;
const GRID_SIZE = 140;

function parsePathData(data) {
  const tokens = data.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const subpaths = [];
  let current = null;
  let index = 0;

  const readPoint = () => {
    const x = Number(tokens[index]);
    const y = Number(tokens[index + 1]);
    index += 2;
    return { x, y };
  };

  while (index < tokens.length) {
    const token = tokens[index];
    const command = token.toUpperCase();

    if (command === 'M') {
      index += 1;
      const point = readPoint();
      current = [point];
      subpaths.push(current);
      continue;
    }

    if (command === 'L') {
      index += 1;
      current.push(readPoint());
      continue;
    }

    if (command === 'C') {
      index += 1;
      const control1 = readPoint();
      const control2 = readPoint();
      const end = readPoint();
      const start = current[current.length - 1];
      for (let step = 1; step <= CURVE_STEPS; step += 1) {
        const t = step / CURVE_STEPS;
        const mt = 1 - t;
        current.push({
          x: mt * mt * mt * start.x
            + 3 * mt * mt * t * control1.x
            + 3 * mt * t * t * control2.x
            + t * t * t * end.x,
          y: mt * mt * mt * start.y
            + 3 * mt * mt * t * control1.y
            + 3 * mt * t * t * control2.y
            + t * t * t * end.y,
        });
      }
      continue;
    }

    if (command === 'Z') {
      index += 1;
      if (current && current.length > 0) {
        current.push({ ...current[0] });
        current = null;
      }
      continue;
    }

    // Unknown command: skip its token so the parser cannot loop forever.
    index += 1;
  }

  return subpaths;
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function polygonCentroid(points) {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  area /= 2;
  if (area === 0) {
    return { x: points[0].x, y: points[0].y };
  }
  return { x: x / (6 * area), y: y / (6 * area) };
}

function pointInPolygon(point, points) {
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length - 1; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function distanceToBoundary(point, points) {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    min = Math.min(min, pointSegmentDistance(point, points[i], points[i + 1]));
  }
  return min;
}

function interiorPoint(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  let best = null;
  let bestDistance = -1;
  for (let row = 1; row < GRID_SIZE; row += 1) {
    for (let column = 1; column < GRID_SIZE; column += 1) {
      const candidate = {
        x: minX + ((maxX - minX) * column) / GRID_SIZE,
        y: minY + ((maxY - minY) * row) / GRID_SIZE,
      };
      if (!pointInPolygon(candidate, points)) {
        continue;
      }
      const distance = distanceToBoundary(candidate, points);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }

  return best ?? polygonCentroid(points);
}

function computeCentroid(pathData) {
  const subpaths = parsePathData(pathData)
    .filter((points) => points.length >= 4)
    .map((points) => (points[0].x === points[points.length - 1].x
      && points[0].y === points[points.length - 1].y
      ? points
      : [...points, { ...points[0] }]));

  if (subpaths.length === 0) {
    throw new Error('Path has no closed subpath');
  }

  const largest = subpaths.reduce((best, candidate) => (
    Math.abs(polygonArea(candidate)) > Math.abs(polygonArea(best)) ? candidate : best
  ));

  const centroid = polygonCentroid(largest);
  const point = pointInPolygon(centroid, largest) ? centroid : interiorPoint(largest);
  return {
    x: Math.round(point.x * 100) / 100,
    y: Math.round(point.y * 100) / 100,
  };
}

const cityPattern = /\{\s*"id":\s*"([^"]+)",\s*"plateNumber":\s*(\d+),\s*"name":\s*"([^"]+)",\s*"path":\s*"([^"]+)"/g;
const centroids = {};
let match;

while ((match = cityPattern.exec(source)) !== null) {
  const [, id, , name, pathData] = match;
  centroids[id] = { name, ...computeCentroid(pathData) };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(centroids, null, 2));
} else {
  for (const [id, { name, x, y }] of Object.entries(centroids)) {
    console.log(`${id}\t${name}\t${x}\t${y}`);
  }
  console.log(`\n${Object.keys(centroids).length} centroids`);
}
