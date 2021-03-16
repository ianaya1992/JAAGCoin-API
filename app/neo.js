var Q = require('q');
var request = require("request");
var _ = require('lodash');
const Neon = require('@cityofzion/neon-js');

var service = {};

service.newAccount = newAccount;
service.getBalance = getBalance;
service.transfer = transfer;
service.listTransactionsByAddress = listTransactionsByAddress;

module.exports = service;

function newAccount() {
	let deferred = Q.defer();
	const account = Neon.default.create.account("fa58253d23f681fab5b6ed8d4d6bad57d14a78f3bc186e7abacee55031c9425c");
	const privateKey = "fa58253d23f681fab5b6ed8d4d6bad57d14a78f3bc186e7abacee55031c9425c";
	const address = account.address;
	const publicKey = account.publicKey;
	let data = {};
	data.address = address;
	data.privateKey = privateKey;
	data.publicKey = publicKey;
	deferred.resolve(data);
    return deferred.promise;
}

function getBalance(address) {
	let deferred = Q.defer();
	let url = "https://api.neoscan.io/api/main_net/v1/get_balance/"+address;
	request({
		uri:url,
		method:"GET"
	}, function(error, response, body) {
		if (error) {
			deferred.reject("Error while getting the NEO balance details by address")
		} else {
			let data = {};
			let r_balances = [];
			let amount = "";
			if (body.length > 0) {
				data = JSON.parse(body);
				if (data.balance.length > 0) {
					r_balances = data.balance;
					_.each(r_balances, (balance) => {
						if (balance.asset == "NEO") {
							amount = balance.amount;
						}
					});
				}
			}
			deferred.resolve(amount);
		}
	});
	return deferred.promise;
}

function transfer(pk, toAddress, amount) {
	let deferred = Q.defer();
	const account = new Neon.wallet.Account(pk)
	Neon.api.default.sendAsset({
	  net: 'MainNet',
	  account: account,
	  intents: Neon.api.makeIntent({
	    NEO: amount,
	  }, toAddress),
	})
	.then(rpcResponse => {
	  	deferred.resolve(rpcResponse.assetID)
	});
	return deferred.promise;
}

function listTransactionsByAddress(address) {
	let deferred = Q.defer();
	let url = "https://api.neoscan.io/api/main_net/v1/get_last_transactions_by_address/"+address+"/1";
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
				if (data.entries.length > 0) {
					r_txs = data.entries;
					_.each(r_txs, (tx) => {
						let txID = tx.txid;
						let timestamp = tx.time;
						let amount = tx.amount;
						if (tx.address_to.toLowerCase() == address.toLowerCase()) {
							return_txs.push({
								txid: txID,
								type: 'receive',
								time: timestamp,
								amount: amount,
							});
						} else if (tx.address_from.toLowerCase() == address.toLowerCase()) {
							return_txs.push({
								txid: txID,
								type: 'sent',
								time: timestamp,
								amount: amount,
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