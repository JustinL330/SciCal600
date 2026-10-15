(function probabilityCoreFactory(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ProbabilityCalculatorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProbabilityCore() {
  "use strict";

  class ProbabilityError extends Error {
    constructor(message) {
      super(message);
      this.name = "ProbabilityError";
    }
  }

  const logFactorials = [0];

  function integer(value, name, maximum = 10000) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0 || number > maximum) {
      throw new ProbabilityError(`${name} must be a whole number from 0 to ${maximum}.`);
    }
    return number;
  }

  function probability(value, name = "Probability") {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 1) throw new ProbabilityError(`${name} must be between 0 and 1.`);
    return number;
  }

  function positive(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new ProbabilityError(`${name} must be greater than 0.`);
    return number;
  }

  function nonnegative(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new ProbabilityError(`${name} must be 0 or greater.`);
    return number;
  }

  function logFactorial(n) {
    const count = integer(n, "n");
    for (let index = logFactorials.length; index <= count; index += 1) {
      logFactorials[index] = logFactorials[index - 1] + Math.log(index);
    }
    return logFactorials[count];
  }

  function combinations(n, r) {
    const total = integer(n, "n", 170);
    const selected = integer(r, "r", 170);
    if (selected > total) throw new ProbabilityError("r cannot be greater than n.");
    const smaller = Math.min(selected, total - selected);
    let result = 1;
    for (let index = 1; index <= smaller; index += 1) result = result * (total - smaller + index) / index;
    return Math.round(result);
  }

  function permutations(n, r) {
    const total = integer(n, "n", 170);
    const selected = integer(r, "r", 170);
    if (selected > total) throw new ProbabilityError("r cannot be greater than n.");
    let result = 1;
    for (let index = 0; index < selected; index += 1) result *= total - index;
    return result;
  }

  function logCombination(n, r) {
    return logFactorial(n) - logFactorial(r) - logFactorial(n - r);
  }

  function binomialPmf(n, p, k) {
    const trials = integer(n, "n", 1000);
    const successes = integer(k, "k", 1000);
    const chance = probability(p, "p");
    if (successes > trials) return 0;
    if (chance === 0) return Number(successes === 0);
    if (chance === 1) return Number(successes === trials);
    return Math.exp(logCombination(trials, successes) + successes * Math.log(chance) + (trials - successes) * Math.log1p(-chance));
  }

  function binomialCdf(n, p, k) {
    const trials = integer(n, "n", 1000);
    const successes = integer(k, "k", 1000);
    const limit = Math.min(trials, successes);
    let total = 0;
    for (let value = 0; value <= limit; value += 1) total += binomialPmf(trials, p, value);
    return Math.min(1, Math.max(0, total));
  }

  function poissonPmf(lambda, k) {
    const rate = nonnegative(lambda, "λ");
    if (rate > 10000) throw new ProbabilityError("λ is limited to 10,000.");
    const events = integer(k, "k");
    if (rate === 0) return events === 0 ? 1 : 0;
    return Math.exp(-rate + events * Math.log(rate) - logFactorial(events));
  }

  function poissonCdf(lambda, k) {
    const events = integer(k, "k");
    let total = 0;
    for (let value = 0; value <= events; value += 1) total += poissonPmf(lambda, value);
    return Math.min(1, Math.max(0, total));
  }

  function erf(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - polynomial * Math.exp(-x * x));
  }

  function normalPdf(x, mean = 0, standardDeviation = 1) {
    const value = Number(x);
    const mu = Number(mean);
    const sigma = positive(standardDeviation, "Standard deviation");
    if (!Number.isFinite(value) || !Number.isFinite(mu)) throw new ProbabilityError("Normal-distribution inputs must be finite numbers.");
    const z = (value - mu) / sigma;
    return Math.exp(-0.5 * z ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function normalCdf(x, mean = 0, standardDeviation = 1) {
    const value = Number(x);
    const mu = Number(mean);
    const sigma = positive(standardDeviation, "Standard deviation");
    if (!Number.isFinite(value) || !Number.isFinite(mu)) throw new ProbabilityError("Normal-distribution inputs must be finite numbers.");
    return 0.5 * (1 + erf((value - mu) / (sigma * Math.SQRT2)));
  }

  function inverseStandardNormal(p) {
    const chance = probability(p, "Percentile probability");
    if (chance === 0) return -Infinity;
    if (chance === 1) return Infinity;
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const low = 0.02425;
    const high = 1 - low;
    if (chance < low) {
      const q = Math.sqrt(-2 * Math.log(chance));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (chance > high) {
      const q = Math.sqrt(-2 * Math.log1p(-chance));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const q = chance - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function normalInterval(lower, upper, mean = 0, standardDeviation = 1) {
    const left = Number(lower);
    const right = Number(upper);
    if (!Number.isFinite(left) || !Number.isFinite(right) || left > right) throw new ProbabilityError("The normal interval needs finite bounds with lower ≤ upper.");
    return Math.max(0, Math.min(1, normalCdf(right, mean, standardDeviation) - normalCdf(left, mean, standardDeviation)));
  }

  function normalQuantile(p, mean = 0, standardDeviation = 1) {
    const mu = Number(mean);
    const sigma = positive(standardDeviation, "Standard deviation");
    if (!Number.isFinite(mu)) throw new ProbabilityError("Mean must be a finite number.");
    return mu + sigma * inverseStandardNormal(p);
  }

  function eventMetrics(pA, pB, pIntersection) {
    const a = probability(pA, "P(A)");
    const b = probability(pB, "P(B)");
    const intersection = probability(pIntersection, "P(A ∩ B)");
    const lowerBound = Math.max(0, a + b - 1);
    const upperBound = Math.min(a, b);
    if (intersection < lowerBound - 1e-12 || intersection > upperBound + 1e-12) {
      throw new ProbabilityError(`P(A ∩ B) must be between ${lowerBound} and ${upperBound}.`);
    }
    const independentIntersection = a * b;
    return {
      union: a + b - intersection,
      aGivenB: b === 0 ? null : intersection / b,
      bGivenA: a === 0 ? null : intersection / a,
      independentIntersection,
      independenceGap: intersection - independentIntersection,
      independent: Math.abs(intersection - independentIntersection) <= 1e-10,
    };
  }

  return Object.freeze({
    ProbabilityError,
    probability,
    combinations,
    permutations,
    binomialPmf,
    binomialCdf,
    poissonPmf,
    poissonCdf,
    normalPdf,
    normalCdf,
    normalInterval,
    normalQuantile,
    eventMetrics,
  });
});
