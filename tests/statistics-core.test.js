"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const statistics = require("../statistics-core.js");

function closeTo(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

test("parses flexible numeric series and rejects malformed data", () => {
  assert.deepEqual(statistics.parseSeries("1, 2\n3；4"), [1, 2, 3, 4]);
  assert.deepEqual(statistics.parseSeries("−1 ＋2 3e2"), [-1, 2, 300]);
  assert.throws(() => statistics.parseSeries("1 nope 2"), statistics.StatisticsError);
  assert.throws(() => statistics.parseSeries(""), statistics.StatisticsError);
});

test("calculates descriptive statistics, quartiles and frequencies", () => {
  const result = statistics.summary([1, 2, 2, 3, 4]);
  assert.equal(result.n, 5);
  assert.equal(result.sum, 12);
  assert.equal(result.mean, 2.4);
  assert.equal(result.median, 2);
  assert.deepEqual(result.modes, [2]);
  assert.equal(result.q1, 2);
  assert.equal(result.q3, 3);
  assert.equal(result.iqr, 1);
  closeTo(result.populationVariance, 1.04);
  closeTo(result.sampleVariance, 1.3);
  assert.deepEqual(result.frequency.map(({ value, count }) => ({ value, count })), [
    { value: 1, count: 1 }, { value: 2, count: 2 }, { value: 3, count: 1 }, { value: 4, count: 1 },
  ]);
});

test("calculates covariance, correlation and linear regression", () => {
  const result = statistics.bivariate([1, 2, 3, 4], [3, 5, 7, 9]);
  closeTo(result.correlation, 1);
  closeTo(result.rSquared, 1);
  closeTo(result.slope, 2);
  closeTo(result.intercept, 1);
  closeTo(result.sampleCovariance, 10 / 3);
  assert.throws(() => statistics.bivariate([1, 2], [1]), statistics.StatisticsError);
  assert.throws(() => statistics.bivariate([1, 1], [2, 3]), statistics.StatisticsError);
});
