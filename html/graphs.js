var createGraph = function(data, parentNode) {
  this.margin = {top: 5, right: 30, bottom: 20, left: 50},
      this.width = parentNode.clientWidth - this.margin.left - this.margin.right,
      this.height = parentNode.clientHeight - this.margin.top - this.margin.bottom;

  var parseDate = d3.time.format("%d-%b-%y").parse;

  
  this.svg = d3.select("#smallgraph").append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
    .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

  this.redraw(data);
  /*d3.tsv("data.tsv", function(error, data) {
    data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.close = +d.close;
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0, d3.max(data, function(d) { return d.close; })]);

    svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");
  });*/
};

createGraph.prototype.redraw = function(data) {
  
  this.svg.selectAll("*").remove();
  var x = d3.time.scale()
      .range([0, this.width]);

  var y = d3.scale.linear()
      .range([this.height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
  var area = d3.svg.area()
      .x(function(d) { return x(d.ts); })
      .y0(this.height)
      .y1(function(d) { return y(d.speed); });

  //d3.select("#smallgraph").remove();
  
  x.domain(d3.extent(data, function(d) { return d.ts; }));
  y.domain([0, d3.max(data, function(d) { return d.speed; })]);
  this.svg.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area);

  this.svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + this.height + ")")
      .call(xAxis);

  this.svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("bps");
};