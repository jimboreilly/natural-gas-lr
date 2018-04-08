var svg = d3.select("#flow");

var width = svg.attr("width");
var height = svg.attr("height");

//paddings for minimized size of graph to fit labels/title
var xPadding = 80;
var yPadding = 80;

// Define variables outside the scope of the callback function.
var gasData;
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

d3.csv("data/GasData.csv", parseLine, function (error, data) {
  gasData = data;

  dateExtent = d3.extent(gasData, function (d) { return d.Date; });
  flowExtent = d3.extent(gasData, function (d) { return d.Flow; });

  update();
});

function update() {
  //remove all content from svg
  svg.selectAll("g > *").remove();
  svg.selectAll("text").remove();
  svg.selectAll("circle").remove();

  dateScale = d3.scaleLinear()
    .domain(dateExtent)
    .range([xPadding, width - xPadding])

  flowScale = d3.scaleLinear()
    .domain([0, flowExtent[1] + 200])
    .range([height - yPadding, yPadding])

  plotNaturalGasActuals(svg, gasData, dateScale, flowScale)
}

function plotNaturalGasActuals(svg, gasData, dateScale, flowScale) {
  gasData.map(function (dayWithData) {
    svg.append("circle")
      .attr("cx", dateScale(dayWithData.Date))
      .attr("cy", flowScale(dayWithData.Flow))
      .attr("r", 2)
      .style("fill", "#45b3e7")
  })

  //x-axis, current overall rating
  var bottomAxis = d3.axisBottom(dateScale)
  svg.append("g")
    .attr("transform", "translate(0," + (height - xPadding) + ")")
    .attr("class", "xaxis")
    .call(bottomAxis);

  //y-axis, growth in overall
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

