var nodiak = require('nodiak');

var Pool = function Pool(configs) {
	this.pool = [];
	this.current_conn = 0;

	for(var i = 0, length = configs.length; i < length; i++) {
		var client = nodiak.getClient('http', configs[i].host, configs[i].port, {retry: { maxAttempts: 0 }});
		client.name = configs[i].name;
		client.alive = true;

		heartbeat(client, null);

		this.pool.push(client);
	}
	return this.get_connection.bind(this);
};

Pool.prototype.get_connection = function get_connection() {
	this.current_conn = this.current_conn >= this.pool.length-1 ? 0 : this.current_conn+1;

	if(this.pool[this.current_conn].alive) {
		return this.pool[this.current_conn];
	}
	else {
		return this.get_connection();
	}
};

Pool.isConnError = function isConnErr(err) {
	if(err.code == "ECONNREFUSED" || err.code == "ECONNRESET" || err.code == "ECONNABORTED" || err.code == "ETIMEDOUT") {
		return true;
	}
	else {
		return false;
	}
};

function heartbeat(client) {
	var timeout = setTimeout(function() {
		client._object.getHead('heartbeat', 'ping', {r:1}, function(err, response) {
			if(err && Pool.isConnError(err)) {
				client.alive = false;
				console.log(client.name + " is pushing up daisies.");
			}
			else {
				client.alive = true;
			}
		});
		heartbeat(client);
	}, 1000);
}

module.exports = Pool;

