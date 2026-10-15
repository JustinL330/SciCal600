(function statisticsCoreFactory(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StatisticsCalculatorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStatisticsCore() {
  "use strict";

  class StatisticsError extends Error {
    constructor(message) {
      super(message);
      this.name = "StatisticsError";
    }
  }

  function parseSeries(source, name = "Data") {
    const text = String(source ?? "").trim()
      .replace(/[−–—﹣－]/g, "-")
      .replace(/＋/g, "+");
    if (!text) throw new StatisticsError(`${name} must contain at least one number.`);
    const tokens = text.split(/[\s,，;；]+/).filter(Boolean);
    if (tokens.length > 10000) throw new StatisticsError(`${name} is limited to 10,000 values.`);
    const numericToken = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
    if (tokens.some((token) => !numericToken.test(token))) throw new StatisticsError(`${name} contains an invalid number.`);
    const values = tokens.map(Number);
    if (values.some((value) => !Number.isFinite(value))) throw new StatisticsError(`${name} contains an invalid number.`);
    return values;
  }

  function quantileSorted(sorted, probability) {
    if (!Array.isArray(sorted) || !sorted.length) throw new StatisticsError("A quantile needs at least one value.");
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new StatisticsError("Quantile probability must be between 0 and 1.");
    const position = (sorted.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function frequency(values) {
    if (!Array.isArray(values) || !values.length) throw new StatisticsError("Data must contain at least one number.");
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    let cumulative = 0;
    return [...counts.entries()]
      .sort(([left], [right]) => left - right)
      .map(([value, count]) => {
        cumulative += count;
        return { value, count, relative: count / values.length, cumulative };
      });
  }

  function summary(values) {
    if (!Array.isArray(values) || !values.length || values.some((value) => !Number.isFinite(value))) {
      throw new StatisticsError("Data must contain at least one valid number.");
    }
    const sorted = [...values].sort((left, right) => left - right);
    const n = values.length;
    const sum = values.reduce((total, value) => total + value, 0);
    const sumSquares = values.reduce((total, value) => total + value ** 2, 0);
    const mean = sum / n;
    const squaredDeviations = values.reduce((total, value) => total + (value - mean) ** 2, 0);
    const populationVariance = squaredDeviations / n;
    const sampleVariance = n > 1 ? squaredDeviations / (n - 1) : null;
    const populationStdDev = Math.sqrt(populationVariance);
    const sampleStdDev = sampleVariance === null ? null : Math.sqrt(sampleVariance);
    const thirdMoment = values.reduce((total, value) => total + (value - mean) ** 3, 0) / n;
    const fourthMoment = values.reduce((total, value) => total + (value - mean) ** 4, 0) / n;
    const frequencies = frequency(values);
    const highestCount = Math.max(...frequencies.map((row) => row.count));
    const modes = highestCount > 1 ? frequencies.filter((row) => row.count === highestCount).map((row) => row.value) : [];
    return {
      n,
      sum,
      sumSquares,
      mean,
      median: quantileSorted(sorted, 0.5),
      modes,
      minimum: sorted[0],
      maximum: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      q1: quantileSorted(sorted, 0.25),
      q3: quantileSorted(sorted, 0.75),
      iqr: quantileSorted(sorted, 0.75) - quantileSorted(sorted, 0.25),
      populationVariance,
      sampleVariance,
      populationStdDev,
      sampleStdDev,
      standardError: sampleStdDev === null ? null : sampleStdDev / Math.sqrt(n),
      coefficientVariation: Math.abs(mean) < Number.EPSILON ? null : populationStdDev / Math.abs(mean) * 100,
      skewness: populationVariance === 0 ? 0 : thirdMoment / populationStdDev ** 3,
      excessKurtosis: populationVariance === 0 ? 0 : fourthMoment / populationVariance ** 2 - 3,
      sorted,
      frequency: frequencies,
    };
  }

  function bivariate(x, y) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) {
      throw new StatisticsError("Data X and Data Y must contain the same number of values.");
    }
    if (x.length < 2) throw new StatisticsError("Bivariate analysis needs at least two pairs.");
    if ([...x, ...y].some((value) => !Number.isFinite(value))) throw new StatisticsError("Paired data contains an invalid number.");
    const xMean = x.reduce((sum, value) => sum + value, 0) / x.length;
    const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
    let cross = 0;
    let xSquares = 0;
    let ySquares = 0;
    for (let index = 0; index < x.length; index += 1) {
      const xDelta = x[index] - xMean;
      const yDelta = y[index] - yMean;
      cross += xDelta * yDelta;
      xSquares += xDelta ** 2;
      ySquares += yDelta ** 2;
    }
    if (xSquares === 0) throw new StatisticsError("Linear regression needs variation in Data X.");
    const correlation = ySquares === 0 ? null : cross / Math.sqrt(xSquares * ySquares);
    const slope = cross / xSquares;
    const intercept = yMean - slope * xMean;
    return {
      n: x.length,
      xMean,
      yMean,
      populationCovariance: cross / x.length,
      sampleCovariance: cross / (x.length - 1),
      correlation,
      rSquared: correlation === null ? null : correlation ** 2,
      slope,
      intercept,
    };
  }

  return Object.freeze({ StatisticsError, parseSeries, quantileSorted, frequency, summary, bivariate });
});
