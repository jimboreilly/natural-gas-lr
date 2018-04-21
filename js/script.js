var math = require('mathjs');

var svg = d3.select("#flow");
const width = svg.attr("width");
const height = svg.attr("height");

//paddings for minimized size of graph to fit labels/title
const xPadding = 80;
const yPadding = 80;

// Define variables outside the scope of the callback function.
var gasData;
var gasMatrix;

// coefficients
var BetaBaseLoad = 50;
var BetaHdd65 = 0;

// trial metadata
var trials = new Array();
var username;
var startTime;
var endTime;
var percentError;

var dateExtent;
var flowExtent;

// This function will be applied to all rows of GasData.csv
var parseLine = (line) => {
  return {
    Date: Date.parse(line["Date"]),
    Temp: parseFloat(line["Temp"]),
    WindSpeed: parseFloat(line["Wind Speed"]),
    Flow: parseFloat(line["Flow"])
  };
}

//format a float error as a percentage string
var formatPercentage = (x) => {
  var option = {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  var formatter = new Intl.NumberFormat("en-US", option);
  return formatter.format(x);
}

//evaluate linear regression given coefficients
var forecastNaturalGasDemand = (gasMatrix, Beta0, Beta1) => {
  let betas = [[Beta0], [Beta1]];
  let A = math.eval('gasMatrix[:, 1:2]', {
    gasMatrix,
  });
  let model = math.eval('A * betas', { A, betas });

  gasData.map(function (dayWithData, i) {
    dayWithData.Model = model[i][0];
  });
}

var calculateModelError = (gasData) => {
  error = 0;
  gasData.map((dayWithData) => {
    let residual = dayWithData.Model - dayWithData.Flow;
    let relativeResidual = residual / dayWithData.Flow;
    let absoluteRelativeResidual = Math.abs(relativeResidual);
    error += absoluteRelativeResidual;
  })
  return error / gasData.length;
}

var solveLeastSquaresCoefficients = (gasMatrix) => {
  let A = math.eval('gasMatrix[:, 1:2]', {
    gasMatrix,
  });
  let y = math.eval('gasMatrix[:, 3]', {
    gasMatrix,
  });

  let betas = math.eval(`inv(A' * A) * A' * y`, {
    A,
    y,
  });

  return betas;
}

var buildGasMatrix = (gasData) => {
  gasMatrix = gasData.map(dayWithData => {
    return ['1', dayWithData.Hdd65.toString(), dayWithData.Flow.toString()] //prepend intercept '1' for regression
  })
  return gasMatrix;
}

d3.csv("data/GasData.csv", parseLine, function (error, data) {
  gasData = data;
  gasData.map(function (dayWithData) {
    dayWithData.Hdd65 = Math.max(65 - dayWithData.Temp, 0) //Heating Degree day is measurement of degrees below 65
  })

  gasMatrix = buildGasMatrix(gasData);
  let start = new Date();
  let betas = solveLeastSquaresCoefficients(gasMatrix)
  forecastNaturalGasDemand(gasMatrix, betas[0][0], betas[1][0])
  let end = new Date();

  let modelError = calculateModelError(gasData);
  let percentError = formatPercentage(modelError);

  let name = "This Computer";
  let time = (end - start) / 1000;

  let computerTrial = {
    Name: name,
    Error: percentError,
    Time: time
  }

  trials = trials.concat(computerTrial);
  addDataPoint(trials);

  dateExtent = d3.extent(gasData, function (d) { return d.Date; });
  flowExtent = d3.extent(gasData, function (d) { return d.Flow; });

  drawInitialGraph();
  initializeSliders(flowExtent);
  update();
});

var initializeSliders = (flowExtent) => {
  var slidersDiv = d3.select("#sliders");
  slidersDiv.append("p")
    .text("Base Load")
    .attr("class", "slider-label");
  slidersDiv.append("div")
    .append("input").attr("type", "range").attr("class", "slider")
    .attr("id", "baseloadslider")
    .attr("min", flowExtent[0] - 200)
    .attr("max", flowExtent[1])
    .attr("value", "100")
    .style("width", "900px")
    .on("input", function () {
      BetaBaseLoad = Number(this.value);
      update();
    });

  slidersDiv.append("p")
    .text("Temperature")
    .attr("class", "slider-label");
  slidersDiv.append("div")
    .append("input").attr("type", "range").attr("class", "slider")
    .attr("id", "tempslider")
    .attr("min", 0)
    .attr("max", 40)
    .attr("value", 0)
    .style("width", "900px")
    .on("input", function () {
      BetaHdd65 = Number(this.value);
      update();
    });
}

var drawInitialGraph = () => {
  dateScale = d3.scaleTime()
    .domain(dateExtent)
    .range([xPadding, width - xPadding])

  flowScale = d3.scaleLinear()
    .domain([0, flowExtent[1] + 200])
    .range([height - yPadding, yPadding])

  //plot the graph, axis, and both data sets
  plotNaturalGasActuals(svg, gasData, dateScale, flowScale);
  plotNaturalGasForecasts(svg, gasData, dateScale, flowScale);
  plotAxis(svg, dateScale, flowScale);
  error = calculateModelError(gasData);
}

var update = () => {
  forecastNaturalGasDemand(gasMatrix, BetaBaseLoad, BetaHdd65);
  writePercentError(gasData);
  deleteForecastedPoints();

  dateScale = d3.scaleTime()
    .domain(dateExtent)
    .range([xPadding, width - xPadding])

  flowScale = d3.scaleLinear()
    .domain([0, flowExtent[1] + 200])
    .range([height - yPadding, yPadding])

  //replot the forecasted data points
  plotNaturalGasForecasts(svg, gasData, dateScale, flowScale);
}

var deleteForecastedPoints = () => {
  //remove all forecasted data points
  svg.selectAll("circle").filter(".forecast").remove();
}

var writePercentError = (gasData) => {
  let error = calculateModelError(gasData);
  percentError = formatPercentage(error);
  d3.select("#error-text").text("Error: " + percentError);
}

var plotNaturalGasActuals = (svg, gasData, dateScale, flowScale) => {
  gasData.map(function (dayWithData) {
    svg.append("circle")
      .attr("class", "actual")
      .attr("cx", dateScale(dayWithData.Date))
      .attr("cy", flowScale(dayWithData.Flow))
      .attr("r", 2)
      .style("fill", "#45b3e7")
  })
}

var plotNaturalGasForecasts = (svg, gasData, dateScale, flowScale) => {
  gasData.map(function (dayWithData) {
    svg.append("circle")
      .attr("class", "forecast")
      .attr("cx", dateScale(dayWithData.Date))
      .attr("cy", flowScale(dayWithData.Model))
      .attr("r", 2)
      .style("fill", "#ffa500")
  })
}

var plotAxis = (svg, dateScale, flowScale) => {
  //x-axis, Date (daily)
  var bottomAxis = d3.axisBottom(dateScale).tickFormat(d3.timeFormat('%Y-%m'));
  svg.append("g")
    .attr("transform", "translate(0," + (height - xPadding) + ")")
    .attr("class", "xaxis")
    .call(bottomAxis);

  //y-axis, Scaled natural gas consumption
  var leftAxis = d3.axisLeft(flowScale);
  svg.append("g")
    .attr("class", "yaxis")
    .attr("transform", "translate(" + yPadding + ", 0)")
    .call(leftAxis);

  //x-axis label
  svg.append("text")
    .attr("transform", "translate(" + (width / 2.3) + "," + (height - (xPadding / 2)) + ")")
    .text("Date");

  //y-axis label, rotated to be vertical text
  svg.append("text")
    .attr("transform", "translate(" + yPadding / 3 + "," + (height / 1.7) + ")rotate(270)")
    .text("Scaled Sendout");
}

var newUser = () => {
  deleteForecastedPoints();
  resetSliders();

  username = prompt("Enter your name: ");

  //reset initial betas
  BetaBaseLoad = 50; BetaHdd65 = 0;
  forecastNaturalGasDemand(gasMatrix, BetaBaseLoad, BetaHdd65);
  plotNaturalGasForecasts(svg, gasData, dateScale, flowScale);

  startTime = new Date();
}

var resetSliders = () => {
  document.getElementById("baseloadslider").value = 100;
  document.getElementById("tempslider").value = 0;
}

var saveTrial = () => {
  endTime = new Date();
  let secondsTimeDiff = (endTime - startTime) / 1000;

  newtrial = {
    Name: username,
    Error: percentError,
    Time: secondsTimeDiff
  }
  trials = trials.concat(newtrial);

  addDataPoint(trials);
  console.log(secondsTimeDiff);
}

var addDataPoint = (trials) => {
  rows = d3.select("table") // UPDATE
    .selectAll("tbody")
    .selectAll("tr")
    .data(trials);

  rows.exit().remove(); // EXIT

  rows.enter() //ENTER + UPDATE
    .append('tr')
    .selectAll("td")
    .data(function (d) { return [d.Name, d.Error, d.Time]; })
    .enter()
    .append("td")
    .text(function (d) { return d; });

  var cells = rows.selectAll('td') //update existing cells
    .data(function (d) { return [d.Name, d.Error, d.Time]; })
    .text(function (d) { return d; });

  cells.enter()
    .append("td")
    .text(function (d) { return d; });

  cells.exit().remove();
}

window.onload = () => {
  document.getElementById("newuserbutton").onclick = () => { newUser(); }
  document.getElementById("savetrialbutton").onclick = () => { saveTrial(); }
}



