(function probabilityCalculatorInterface() {
  "use strict";
  const core = window.ProbabilityCalculatorCore;
  const workspace = document.querySelector("#probability-calculator");
  if (!core || !workspace) return;

  const t = (key) => window.SciCalUI?.translate(key) || key;
  const value = (id) => document.querySelector(`#${id}`).value;

  function format(number) {
    if (number === null || number === undefined || Number.isNaN(number)) return "—";
    if (!Number.isFinite(number)) return number < 0 ? "−∞" : "∞";
    if (Object.is(number, -0)) return "0";
    const magnitude = Math.abs(number);
    if (magnitude && (magnitude < 1e-7 || magnitude >= 1e12)) return number.toExponential(8);
    return Number(number.toPrecision(11)).toString();
  }

  function renderGrid(id, entries) {
    const container = document.querySelector(`#${id}`);
    const grid = document.createElement("div");
    grid.className = "result-grid";
    entries.forEach(([label, outputValue]) => {
      const item = document.createElement("span");
      const caption = document.createElement("span");
      const output = document.createElement("strong");
      caption.textContent = label;
      output.textContent = outputValue;
      item.append(caption, output);
      grid.append(item);
    });
    container.classList.remove("is-error");
    container.replaceChildren(grid);
  }

  function renderError(id, error) {
    const container = document.querySelector(`#${id}`);
    const message = document.createElement("strong");
    message.textContent = error instanceof Error ? error.message : "Unable to calculate probability.";
    container.classList.add("is-error");
    container.replaceChildren(message);
  }

  function withErrors(resultId, calculation) {
    try {
      calculation();
    } catch (error) {
      renderError(resultId, error);
    }
  }

  function calculateEvents() {
    withErrors("event-probability-result", () => {
      const result = core.eventMetrics(value("probability-a"), value("probability-b"), value("probability-intersection"));
      renderGrid("event-probability-result", [
        [t("unionLabel"), format(result.union)], [t("conditionalAGivenB"), format(result.aGivenB)], [t("conditionalBGivenA"), format(result.bGivenA)],
        [t("independentIntersectionLabel"), format(result.independentIntersection)], [t("independenceLabel"), result.independent ? t("yesLabel") : t("noLabel")],
      ]);
    });
  }

  function calculateCombinatorics() {
    withErrors("combinatorics-result", () => renderGrid("combinatorics-result", [
      [t("combinationLabel"), format(core.combinations(value("combinatorics-n"), value("combinatorics-r")))],
      [t("permutationLabel"), format(core.permutations(value("combinatorics-n"), value("combinatorics-r")))],
    ]));
  }

  function calculateBinomial() {
    withErrors("binomial-result", () => {
      const n = Number(value("binomial-n"));
      const p = Number(value("binomial-p"));
      const k = Number(value("binomial-k"));
      const upper = k <= 0 ? 1 : 1 - core.binomialCdf(n, p, k - 1);
      renderGrid("binomial-result", [
        [t("exactProbabilityLabel"), format(core.binomialPmf(n, p, k))], [t("cumulativeProbabilityLabel"), format(core.binomialCdf(n, p, k))],
        [t("upperTailProbabilityLabel"), format(Math.max(0, Math.min(1, upper)))], [t("expectedValueLabel"), format(n * p)], [t("varianceLabel"), format(n * p * (1 - p))],
      ]);
    });
  }

  function calculatePoisson() {
    withErrors("poisson-result", () => {
      const lambda = Number(value("poisson-lambda"));
      const k = Number(value("poisson-k"));
      const upper = k <= 0 ? 1 : 1 - core.poissonCdf(lambda, k - 1);
      renderGrid("poisson-result", [
        [t("exactProbabilityLabel"), format(core.poissonPmf(lambda, k))], [t("cumulativeProbabilityLabel"), format(core.poissonCdf(lambda, k))],
        [t("upperTailProbabilityLabel"), format(Math.max(0, Math.min(1, upper)))], [t("expectedValueLabel"), format(lambda)], [t("varianceLabel"), format(lambda)],
      ]);
    });
  }

  function calculateNormal() {
    withErrors("normal-result", () => {
      const mean = Number(value("normal-mean"));
      const sd = Number(value("normal-sd"));
      const lower = Number(value("normal-lower"));
      const upper = Number(value("normal-upper"));
      const percentile = Number(value("normal-percentile"));
      renderGrid("normal-result", [
        [t("intervalProbabilityLabel"), format(core.normalInterval(lower, upper, mean, sd))], [t("lowerCdfLabel"), format(core.normalCdf(lower, mean, sd))],
        [t("upperCdfLabel"), format(core.normalCdf(upper, mean, sd))], [t("quantileLabel"), format(core.normalQuantile(percentile, mean, sd))],
        [t("zLowerLabel"), format((lower - mean) / sd)], [t("zUpperLabel"), format((upper - mean) / sd)],
      ]);
    });
  }

  const calculators = [
    ["event-probability-form", calculateEvents], ["combinatorics-form", calculateCombinatorics], ["binomial-form", calculateBinomial],
    ["poisson-form", calculatePoisson], ["normal-form", calculateNormal],
  ];
  calculators.forEach(([id, calculate]) => document.querySelector(`#${id}`).addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  }));
  document.querySelector("#language-select")?.addEventListener("change", () => requestAnimationFrame(() => calculators.forEach(([, calculate]) => calculate())));
  calculators.forEach(([, calculate]) => calculate());

  window.SciCalProbability = Object.freeze({ calculateAll: () => calculators.forEach(([, calculate]) => calculate()) });
})();
