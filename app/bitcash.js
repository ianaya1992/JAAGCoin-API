var Q = require('q');
var request = require("request");
var _ = require('lodash');
const bch = require('bitcoincashjs');

var service = {};

service.newAccount = newAccount;
service.getBalance = getBalance;
service.transfer = transfer;
service.listTransactionsByAddress = listTransactionsByAddress;

module.exports = service;

function newAccount() {
	let defered = Q.defer();
	let privateKey = new bch.PrivateKey();
	let address = privateKey.toAddress();
	let data = {};
	data.privateKey = privateKey;
	data.address = address.toString();
	defered.resolve(data);
	return defered.promise;
}

function getBalance(address) {
	let defered = Q.defer();
	let return_txs = [];

	// if (pagenum === undefined) {
	// 	pagenum = 1;
	// }

	// if (limit === undefined) {
	// 	limit = 10;
	// }

	// let url = "https://api.etherscan.io/api?module=account&action=txlist&address=" + addr + "&startblock=0&endblock=99999999&page=" + pagenum + "&offset=" + limit + "&sort=desc&apikey=VG4EJ7WXR5P5SYPD5466QNRKEFV7T423WA"
	let url = "https://blockexplorer.com/api/txs/?address=" + address;
	request({
		uri: url,
		method: "GET",
	}, function(error, response, body) {
		if (error) {
			deferred.reject('Error while getting the ETH transaction details by address');
		} else {
			if (body.length > 0) {
				let balance = JSON.parse(body);
				deferred.resolve((balance / Math.pow(10, tokenDecimals)).toFixed(9));
			}
			deferred.resolve(return_txs);
		}
	});
	return defered.promise;
}

function transfer(pk, fromAddress, toAddress, amount) {
	let defered = Q.defer();
	const privateKey = new bch.PrivateKey(pk);
	const utxo = {
	  'txId' : '115e8f72f39fad874cfab0deed11a80f24f967a84079fb56ddf53ea02e308986',
	  'outputIndex' : 0,
	  'address' : fromAddress,
	  'script' : new bch.Script(toAddress).toHex(),
	  'satoshis' : 50000
	};
	const transaction = new bch.Transaction()
	  .from(utxo)
	  .to(toAddress, amount)
	  .sign(privateKey);
	return defered.promise;
}

function listTransactionsByAddress(address) {
	let deferred = Q.defer();
	let url = "https://blockexplorer.com/api/txs/?address=" + address;
	let return_txs = [];
	request({
		uri:url,
		method:"GET"
	}, function(error, response, body) {
		if (error) {
			deferred.reject("Error while getting the NEO transaction details by address")
		} else {
			let data = {};
			let r_txs = [];
			if (body.length > 0) {
				data = JSON.parse(body);
				if (data.txs.length > 0) {
					r_txs = data.txs;
					_.each(r_txs, (tx) => {
						let txID = tx.txid;
						let timestamp = tx.time;
						let sent = false;
						_.each(tx.vin, (vin_data) =>) {
							if (vin_data.addr == address) {
								sent = true
							}
						}
						if (sent) {
							return_txs.push({
								txid: txID,
								type: 'sent',
								time: timestamp,
								amount: tx.valueOut,
							});
						} else {
							return_txs.push({
								txid: txID,
								type: 'receive',
								time: timestamp,
								amount: tx.valueIn,
							});
						}
					});
				}
			}
			deferred.resolve(return_txs);
		}
	});
	return deferred.promise;
}