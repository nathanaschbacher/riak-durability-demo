
/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('dashboard', { title: 'Riak Durability Demo' });
};