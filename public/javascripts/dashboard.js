d3.json("http://localhost:3000/nodes", function(values) {
  var nodes = values.map(function(node) {
      return node.name;
  });
  var total = ["total"];


  var context = cubism.context()
    .serverDelay(0)
    .clientDelay(0)
    .step(1000)
    .size(960);

  function ops_per_sec(name) {
    return context.metric(function(start, stop, step, callback) {
      var values = [];
      // convert start & stop to milliseconds
      start = +start;
      stop = +stop;

      d3.json("http://localhost:3000/metrics/"+name+"/"+start+"/"+stop+"/"+step, function(values) {
        callback(null, values);
      });
    }, name);
  }

  d3.select("body").selectAll(".axis")
      .data(["top", "bottom"])
    .enter().append("div")
      .attr("class", function(d) { return d + " axis"; })
      .each(function(d) { d3.select(this).call(context.axis().ticks(12).orient(d)); });

  d3.select("body")
    .append("div")
      .attr("class", "rule")
      .call(context.rule());

  d3.select("body").selectAll(".total")
      .data(total)
    .enter().insert("div", ".bottom")
      .attr("class", "horizon")
      .call(context.horizon().metric(ops_per_sec).height(200));

  d3.select("body").selectAll(".node")
      .data(nodes)
    .enter().insert("div", ".bottom")
      .attr("class", "horizon")
      .call(context.horizon().metric(ops_per_sec).height(90).colors(["#31a354","#74c476","#bae4b3","#bdd7e7","#6baed6","#3182bd","#08519c"]));

  context.on("focus", function(i) {
    d3.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
  });
});
