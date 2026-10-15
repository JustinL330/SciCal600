"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const matrix = require("../linear-algebra-core.js");

function closeTo(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

test("parses rectangular matrices and rejects malformed input", () => {
  assert.deepEqual(matrix.parseMatrix("1 2\n3,4"), [[1, 2], [3, 4]]);
  assert.deepEqual(matrix.parseMatrix("1\t  2\r\n3\u00a04"), [[1, 2], [3, 4]]);
  assert.deepEqual(matrix.parseMatrix("1,2;3,4"), [[1, 2], [3, 4]]);
  assert.deepEqual(matrix.parseMatrix("[[1, 2], [3, 4]]"), [[1, 2], [3, 4]]);
  assert.deepEqual(matrix.parseMatrix("[ -1.5，2e2 ]；[ +.25，-4E-1 ]"), [[-1.5, 200], [0.25, -0.4]]);
  assert.deepEqual(matrix.parseMatrix("1 −2\n＋3 4"), [[1, -2], [3, 4]]);
  assert.throws(() => matrix.parseMatrix("1 2\n3"), matrix.MatrixError);
  assert.throws(() => matrix.parseMatrix("1 nope"), matrix.MatrixError);
  assert.throws(() => matrix.parseMatrix("1 2\n\n3 4"), matrix.MatrixError);
  assert.throws(() => matrix.parseMatrix("1 Infinity"), matrix.MatrixError);
  assert.throws(() => matrix.parseMatrix("1; ;2"), matrix.MatrixError);
});

test("adds, subtracts and multiplies compatible matrices", () => {
  const a = [[1, 2], [3, 4]];
  const b = [[5, 6], [7, 8]];
  assert.deepEqual(matrix.add(a, b), [[6, 8], [10, 12]]);
  assert.deepEqual(matrix.subtract(b, a), [[4, 4], [4, 4]]);
  assert.deepEqual(matrix.multiply(a, b), [[19, 22], [43, 50]]);
});

test("calculates determinant, inverse, transpose and adjugate", () => {
  const a = [[1, 2], [3, 4]];
  assert.equal(matrix.determinant(a), -2);
  assert.deepEqual(matrix.transpose(a), [[1, 3], [2, 4]]);
  assert.deepEqual(matrix.adjugate(a), [[4, -2], [-3, 1]]);
  assert.deepEqual(matrix.inverse(a), [[-2, 1], [1.5, -0.5]]);
  assert.throws(() => matrix.inverse([[1, 2], [2, 4]]), matrix.MatrixError);
});

test("row reduces rectangular matrices and reports rank", () => {
  const output = matrix.rowReduce([[1, 2, 3], [2, 4, 6], [1, 1, 1]]);
  assert.deepEqual(output.matrix, [[1, 0, -1], [0, 1, 2], [0, 0, 0]]);
  assert.deepEqual(output.pivotColumns, [0, 1]);
  assert.equal(output.rank, 2);
  assert.equal(matrix.rank([[1, 2], [2, 4]]), 1);
});

test("calculates trace, Frobenius norm and linear-system solutions", () => {
  assert.equal(matrix.trace([[3, 2], [7, -1]]), 2);
  assert.equal(matrix.frobeniusNorm([[1, 2], [2, 4]]), 5);
  assert.deepEqual(matrix.solve([[2, 1], [5, 3]], [[1], [2]]), [[1], [-1]]);
  assert.deepEqual(matrix.solve([[2, 0], [0, 4]], [[4, 2], [8, 12]]), [[2, 1], [2, 3]]);
  assert.throws(() => matrix.trace([[1, 2, 3], [4, 5, 6]]), matrix.MatrixError);
  assert.throws(() => matrix.solve([[1, 2], [2, 4]], [[1], [2]]), matrix.MatrixError);
});

test("preserves valid small-scale matrix values", () => {
  const small = [[1e-11, 0], [0, 1]];
  closeTo(matrix.determinant(small), 1e-11, 1e-22);
  assert.deepEqual(matrix.inverse(small), [[1e11, 0], [0, 1]]);
  assert.equal(matrix.cleanNumber(1e-12), 1e-12);
});

test("finds real eigenvalues and eigenvectors for a general 2 by 2 matrix", () => {
  const output = matrix.eigen([[2, 1], [1, 2]]);
  assert.deepEqual(output.values, [3, 1]);
  output.vectors.forEach((vector, index) => {
    const lambda = output.values[index];
    const product = matrix.multiply([[2, 1], [1, 2]], vector.map((value) => [value])).flat();
    product.forEach((value, position) => closeTo(value, lambda * vector[position]));
  });
});

test("finds an orthonormal eigensystem for larger symmetric matrices", () => {
  const source = [[4, 1, 1], [1, 3, 0], [1, 0, 2]];
  const output = matrix.eigen(source);
  assert.equal(output.values.length, 3);
  output.vectors.forEach((vector, index) => {
    const product = matrix.multiply(source, vector.map((value) => [value])).flat();
    product.forEach((value, position) => closeTo(value, output.values[index] * vector[position], 1e-7));
  });
});

test("reports complex eigenpairs for a 2 by 2 rotation matrix", () => {
  const output = matrix.eigen([[0, -1], [1, 0]]);
  assert.equal(output.complex, true);
  closeTo(output.values[0].re, 0);
  closeTo(Math.abs(output.values[0].im), 1);
  assert.equal(output.vectors.length, 2);
});
