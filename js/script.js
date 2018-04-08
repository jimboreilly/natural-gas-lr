var math = require('mathjs');

var svg = d3.select("#flow");

var width = svg.attr("width");
var height = svg.attr("height");

//paddings for minimized size of graph to fit labels/title
var xPadding = 80;
var yPadding = 80;

// Define variables outside the scope of the callback function.
var gasData;
var gasMatrix;
var dateExtent;
var flowExtent;

var dateScale;
var flowScale;

// This function will be applied to all rows of GasData.csv
function parseLine(line) {
  return {
    Date: Date.parse(line["Date"]),
    Temp: parseFloat(line["Temp"]),
    WindSpeed: parseFloat(line["Wind Speed"]),
    Flow: parseFloat(line["Flow"])
  };
}

function normalEquation(X, y) {
  let theta = math.eval(`inv(X' * X) * X' * y`, {
    X,
    y,
  });

  return theta;
}

function buildGasMatrix(gasData) {
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

  let A = math.eval('gasMatrix[:, 1:2]', {
    gasMatrix,
  });
  let y = math.eval('gasMatrix[:, 3]', {
    gasMatrix,
  });

  let betas = normalEquation(A, y);
  let model = math.eval('A * betas', { A, betas });

  console.log(betas);
  console.log(model);

  gasData.map(function (dayWithData, i) {
    dayWithData.Model = model[i][0];
  })

  console.log(gasData);

  dateExtent = d3.extent(gasData, function (d) { return d.Date; });
  flowExtent = d3.extent(gasData, function (d) { return d.Flow; });

  update();
});

function update() {
  //remove all content from svg
  svg.selectAll("g > *").remove();
  svg.selectAll("text").remove();
  svg.selectAll("circle").remove();

  dateScale = d3.scaleTime()
    .domain(dateExtent)
    .range([xPadding, width - xPadding])

  flowScale = d3.scaleLinear()
    .domain([0, flowExtent[1] + 200])
    .range([height - yPadding, yPadding])

  plotNaturalGasActuals(svg, gasData, dateScale, flowScale);
  plotNaturalGasForecasts(svg, gasData, dateScale, flowScale);
  plotAxis(svg, dateScale, flowScale);
}

function plotNaturalGasActuals(svg, gasData, dateScale, flowScale) {
  gasData.map(function (dayWithData) {
    svg.append("circle")
      .attr("cx", dateScale(dayWithData.Date))
      .attr("cy", flowScale(dayWithData.Flow))
      .attr("r", 2)
      .style("fill", "#45b3e7")
  })
}

function plotNaturalGasForecasts(svg, gasData, dateScale, flowScale) {
  gasData.map(function (dayWithData) {
    svg.append("circle")
      .attr("cx", dateScale(dayWithData.Date))
      .attr("cy", flowScale(dayWithData.Model))
      .attr("r", 2)
      .style("fill", "#ffa500")
  })
}

function plotAxis(svg, dateScale, flowScale) {
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

