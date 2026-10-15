"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const probability = require("../probability-core.js");

function closeTo(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

test("calculates combinations and permutations", () => {
  assert.equal(probability.combinations(10, 3), 120);
  assert.equal(probability.permutations(10, 3), 720);
  assert.throws(() => probability.combinations(3, 4), probability.ProbabilityError);
});

test("calculates binomial and Poisson probabilities", () => {
  closeTo(probability.binomialPmf(10, 0.5, 3), 0.1171875, 1e-12);
  closeTo(probability.binomialCdf(10, 0.5, 3), 0.171875, 1e-12);
  closeTo(probability.poissonPmf(4, 2), 0.1465251111);
  closeTo(probability.poissonCdf(4, 2), 0.2381033056);
  assert.equal(probability.poissonPmf(0, 0), 1);
  assert.equal(probability.poissonPmf(0, 1), 0);
  assert.equal(probability.poissonCdf(0, 3), 1);
});

test("calculates normal probabilities and quantiles", () => {
  closeTo(probability.normalPdf(0), 1 / Math.sqrt(2 * Math.PI), 1e-12);
  closeTo(probability.normalCdf(0), 0.5, 1e-7);
  closeTo(probability.normalInterval(-1.96, 1.96), 0.950004, 2e-5);
  closeTo(probability.normalQuantile(0.975), 1.959964, 2e-5);
  assert.throws(() => probability.normalInterval(2, 1), probability.ProbabilityError);
});

test("calculates event unions, conditionals and independence", () => {
  const result = probability.eventMetrics(0.5, 0.4, 0.2);
  closeTo(result.union, 0.7, 1e-12);
  closeTo(result.aGivenB, 0.5, 1e-12);
  closeTo(result.bGivenA, 0.4, 1e-12);
  assert.equal(result.independent, true);
  assert.throws(() => probability.eventMetrics(0.8, 0.7, 0.1), probability.ProbabilityError);
});
