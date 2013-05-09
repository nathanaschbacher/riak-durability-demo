/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var config = require('./config.json');
var Pool = require('./lib/pool.js');
var riak = new Pool(config.riak.nodes);

var metrics = {};

var load_num_obj = config.settings.max_objects;
var time_threshold = Date.now() + (1000 * 60 * (config.settings.max_duration === null ? Infinity : config.settings.max_duration));
var current_object = 0;
var loaded_obj = 0;
var concurrent = 0;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
// app.use(express.bodyParser());
// app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.logger('dev'));
  app.use(express.errorHandler());
}

app.get('/', routes.index);

app.get('/nodes', function(req, res) {
    res.json(config.riak.nodes);
});

app.get('/metrics/:name/:start/:stop/:step', function(req, res) {
    res.json(
        fetch_metrics(
            req.params.name,
            parseInt(req.params.start, 10),
            parseInt(req.params.stop, 10),
            parseInt(req.params.step, 10)
        )
    );
});

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
    console.log('Hammering on Riak...');

    load_gen(function() {
        process.exit(0);
    });
});

function store_metric(name, value) {
    var time = Date.now();
    time = time - (+time % 1000);

    if(metrics[time] === undefined) {
        metrics[time] = {};
        metrics[time][name] = value;
    }
    else if(metrics[time][name] === undefined) {
        metrics[time][name] = value;
    }
    else {
        metrics[time][name] += value;
    }
}

function fetch_metrics(name, start, stop, step) {
    var values = [];

    delete metrics[start-step];
    for(start; start < stop; start += step) {
        if(metrics[start] !== undefined) {
            values.push(metrics[start][name]);
        }
        else {
            values.push(NaN);
        }
    }
    return values;
}

function load_gen(done) {
    console.log("Started at: "+(new Date()));

    function non_block_loop() {
        if(Date.now() > time_threshold) {
            console.log("Finished at: "+(new Date()));
            console.log("Exiting Loop");
            done();
        }
        else {
            if(concurrent < config.settings.max_concurrent) {
                concurrent++;
                current_object = current_object < load_num_obj ? current_object+1 : 0;
                dispatch_op(current_object);
            }
        }
        return setImmediate(non_block_loop); // fake TCO so we don't get RangeErrors
    }
    non_block_loop();
}

function dispatch_op(value) {
    var c = riak();

    c._object.save('demo',value, value, function(err, obj) {
        concurrent--;
        if(err) {
            return dispatch_op(value);
        }
        else {
            store_metric('total', 1);
            store_metric(c.name, 1);
        }
    });
}