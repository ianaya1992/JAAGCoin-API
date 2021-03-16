var csv = require("fast-csv");
var addressService = require('../services/address.service');
var Q = require('q');
var service = {};

service.readCSV = readCSV;

module.exports = service;

function readCSV() {
	var deferred = Q.defer();
	var index = 0;
	var address_arr;
	var transactionArray = [];
	csv
	 .fromPath("AllInSeeWallet_ToSent.csv")
	 .on("data", function(data){
	 	if (index > 0) {
	 		var transactionData = {};
	 		transactionData.address = data[0];
	 		transactionData.cost = data[1];
	 		transactionData.index = index;
	 		transactionArray[index - 1] = transactionData;
	 	}

	 	index ++;
	 })
	 .on("end", function(){
	     console.log("done");
	     deferred.resolve(transactionArray);
	 });

	return deferred.promise;
}