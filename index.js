import { h, app } from "./web_modules/hyperapp.js";
import { request } from "./web_modules/@hyperapp/http.js";
import htm from "./web_modules/htm.js";
import { targetValue } from "./web_modules/@hyperapp/events.js";
import Chart from "./web_modules/chart.js/dist/Chart.js";
import { stringToRGB, stringToHex } from "./stringToColor.js";
import { countries } from "./countries.js";


const personify = d => d + (d === 1 ? " person" : " people");

let chart = null;
const makeChart = data => {
  console.log("data", data);
  if (chart) {
    chart.data.labels = data.labels;
    chart.data.datasets = data.datasets;
    chart.update();
    return;
  }

  chart = new Chart("chart", {
    type: "line",
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options: {}
  });
  return chart;
};

const updateChart = state => [
  () => {
    const data = toChartData(state);
    makeChart(data);
  }
];

const toChartData = state => {
  const [firstCountry] = state.selectedCountries;
  return {
    labels: firstCountry
      ? state.report[firstCountry].map(stats => stats.date)
      : [],
    datasets: state.selectedCountries.map(name => {
      const { r, g, b } = stringToRGB(name);
      return {
        label: name,
        data: state.report[name].map(stats => stats.confirmed),
        backgroundColor: [`rgba(${r}, ${g}, ${b}, 0.2)`],
        borderColor: [`rgba(${r}, ${g}, ${b}, 1)`]
      };
    })
  };
};

const html = htm.bind(h);

const GotReport = (state, report) => {
    const newState = { ...state, report };
    return [newState, [updateChart(newState)]];
};
const fetchReport = request({
  url: "https://pomber.github.io/covid19/timeseries.json",
  expect: "json",
  action: GotReport
});
const SelectCountry = (state, currentCountry) => ({
  ...state,
  currentCountry
});
const AddCountryFromMap = currentCountry => state => {
    const newState = {
        ...state,
        selectedCountries: unique([
            ...state.selectedCountries,
            currentCountry
        ])
    };
    return [newState, [updateChart(newState)]];
};
const RemoveCountryFromMap = currentCountry => state => {
    const newState = {
        ...state,
        selectedCountries: state.selectedCountries.filter(country => currentCountry !== country)
    };
    return [newState, [updateChart(newState)]];
};
const unique = list => [...new Set(list)];
const AddCountry = state => {
  const newState = {
    ...state,
    selectedCountries: unique([
      ...state.selectedCountries,
      state.currentCountry
    ])
  };
  return [newState, [updateChart((newState))]];
};
const RemoveCountry = country => state => {
  const newState = {
    ...state,
    selectedCountries: state.selectedCountries.filter(c => c !== country)
  };
  return [newState, [updateChart(newState)]];
};

const countryNames = report => Object.keys(report).sort();

const selectedOption = (selected, name) =>
  selected === name
    ? html`
        <option selected value="${name}">${name}</option>
      `
    : html`
        <option value="${name}">${name}</option>
      `;

const isActive = state => country => state.selectedCountries.includes(country);

const countrySvg =  state => country => {
    const isCountryActive = isActive(state)(country);

    if(isCountryActive) {
        return html`
              <path stroke="${stringToHex(country)}" fill="${stringToHex(country)}"
              onclick=${RemoveCountryFromMap(country)} id="${country}" d="${countries[country].d}" />
            `;
    } else {
        return html`
              <path  
              onclick=${AddCountryFromMap(country)} id="${country}" d="${countries[country].d}" />
            `;
    }
};

app({
  init: [
    { report: {}, currentCountry: "Poland", selectedCountries: ["Poland"] },
    fetchReport
  ],
  view: state =>
    console.log(state) ||
    html`
      <div>
        <select oninput=${[SelectCountry, targetValue]} class="countries">
          ${countryNames(state.report).map(name =>
            selectedOption(state.currentCountry, name)
          )}
        </select>
        <button onclick=${AddCountry}>Select</button>
        <ul>
          ${Array.from(state.selectedCountries).map(
            country =>
              html`
                <li onclick=${RemoveCountry(country)}>${country} (x)</li>
              `
          )}
        </ul>

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1001">
          ${Object.keys(countries).map(
            countrySvg(state)
          )}
        </svg>
      </div>
    `,
  node: document.getElementById("control-panel")
});
