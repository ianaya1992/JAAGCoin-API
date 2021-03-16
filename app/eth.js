var Q = require('q');
var request = require("request");
var _ = require('lodash');
var Web3 = require('web3');
var web3 = new Web3();
var Tx = require('ethereumjs-tx');
var logger = require('./config/winston')
let date = require('date-and-time');


const GAS_PRICE = 100000000;
const GAS_LIMIT = 80000;

// import smart contracts
var sERC20ABI = require('./abi/jaagcoin'); // NEXT Token
var sContractAddress = '0x92A414B4f14BB4963b623400793d5037E1fb399E';
var owner = '0x562e16bfb13e7d5aa991263E573E2F4655894E8F';
var masterWallet = {address:'0x3D0865CA8Ad734A335947E641939aCe5Ab3A7C6A', privateKey:'xxxxx',amount:0.0041};

// web3.setProvider(new web3.providers.HttpProvider(config.nodeServer.eth));
web3.setProvider(new web3.providers.HttpProvider("https://mainnet.infura.io/swptqj6853hAYSLLRyPz"));
// web3.eth.extend({
//   property: 'txpool',
//   methods: [{
//     name: 'content',
//     call: 'txpool_content'
//   },{
//     name: 'inspect',
//     call: 'txpool_inspect'
//   },{
//     name: 'status',
//     call: 'txpool_status'
//   }]
// });

var service = {};
service.newAccount = newAccount;
service.getBalance = getBalance;
service.transfer = transfer;
service.listTransactionsByAddress = listTransactionsByAddress;

service.getTokenBalance = getTokenBalance;
service.transferToken = transferToken;
service.transferGasFee = transferGasFee;
service.getFee = getFee;
service.listTokenTransactionsByAddress = listTokenTransactionsByAddress;
service.getRate = getRate;
service.setRate = setRate;
service.getTotalTokenSupply = getTotalTokenSupply;

module.exports = service;


function newAccount() {
	let deferred = Q.defer();
	deferred.resolve(web3.eth.accounts.create());
    return deferred.promise;
}

function getFee(coin_type, amount) {
	let fee = (GAS_PRICE * GAS_LIMIT).toString();
	return web3.utils.fromWei(fee);
	// let deferred = Q.defer();
	// let fee = 0;
	// try {
	// 	fee = (GAS_PRICE * GAS_LIMIT /1e3).toFixed(9);
	// 	deferred.resolve(fee);
	// 	// web3.eth.getGasPrice().then(function(gasPrice) {
	// 	// 	if (coin_type == 'eth') {
	// 	// 		web3.eth.estimateGas({}).then(function(gasEstimate) {
	// 	// 			fee = (parseFloat(gasPrice) * parseFloat(gasEstimate) / 1e3).toFixed(9);
	// 	// 			deferred.resolve(fee);
	// 	// 		});
	// 	// 	} else { // For token, gasEstimate is 250K
	// 	// 		fee = (parseFloat(gasPrice) * 250000 / 1e3).toFixed(9);
	// 	// 		deferred.resolve(fee);
	// 	// 	}
	// 	// });

	// } catch(err) {
	// 	deferred.reject(err.message);
	// }
	// return deferred.promise;
}

function getBalance(address) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("getBalance" + " - [" + time_st + "] - " + address)
	let deferred = Q.defer();
	if (!address) {
		deferred.reject('Invalid Address!');
	}
	try {
		web3.eth.getBalance(address).then(function(value) {
			deferred.resolve(web3.utils.fromWei(value.toString(), 'ether'));
	    }).catch(function(err) {
	    	logger.error("getBalance" + " - [" + time_st + "] - " + error.message)
	    	deferred.reject(err.message);
	    });
	} catch(error) {
		logger.error("getBalance" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}
    return deferred.promise;
}

function transfer(pk, fromAddress, toAddress, p_amount) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	let info = pk.substring(0,5) + ", " + fromAddress + ", " + toAddress + ", " + p_amount;
	logger.info("transfer" + " - [" + time_st + "] - " + info)

	let deferred = Q.defer();
	let tx_nonce = 0;

	try {
		let w_amount = web3.utils.toWei(p_amount.toString());
		getBalance(fromAddress).then(function(balance) {
			if (balance < p_amount) {
				throw {message: 'Insufficient funds!'};
			} else {
				return web3.eth.getTransactionCount(fromAddress);
			}
		}).then(function(nonce) {
			tx_nonce = nonce;
			return web3.eth.getGasPrice();
		}).then(function(estimated_gas_price) {
			let privateKey = new Buffer(pk.replace('0x',''),'hex');
			let rawTx = {
				nonce: tx_nonce,
				gasPrice: web3.utils.toBN(estimated_gas_price),
				gasLimit: web3.utils.toBN(GAS_LIMIT),
				to: toAddress,
				value: web3.utils.toBN(w_amount),
			};
			let tx = new Tx(rawTx);
			tx.sign(privateKey);

			let serializedTx = tx.serialize();

			let transaction = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))

			transaction.once('transactionHash', function(hash) {
				// deferred.resolve({txid: hash});
			});
			transaction.once('receipt', function(receipt){
				console.log('work1')
				deferred.resolve({receipt: receipt});
			})
			transaction.once('error', function(err) {
				logger.error("transfer" + " - [" + time_st + "] - " + err.message)
				deferred.reject(err.message);
				// deferred.reject('Sorry, Ethereum network is busy now. Please try again in a few of minutes.');
			});
		}).catch(function(err) {
			logger.error("transfer" + " - [" + time_st + "] - " + err.message)
			deferred.reject(err.message);
		});
	} catch(error) {
		logger.error("transfer" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}

	return deferred.promise;
}

function transferGasFee(address) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("transferGasFee" + " - [" + time_st + "] - " + address)

	let deferred = Q.defer();
	transfer(masterWallet.privateKey, masterWallet.address, address, masterWallet.amount).then(result => {
		deferred.resolve(result);
	}).catch(err => {
		logger.error("transferGasFee" + " - [" + time_st + "] - " + address)
		deferred.reject(err);
	});

	return deferred.promise;
}

function listTransactionsByAddress(addr) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("listTransactionsByAddress" + " - [" + time_st + "] - " + addr)

	let deferred = Q.defer();
	let return_txs = [];

	// if (pagenum === undefined) {
	// 	pagenum = 1;
	// }

	// if (limit === undefined) {
	// 	limit = 10;
	// }

	// let url = "https://api.etherscan.io/api?module=account&action=txlist&address=" + addr + "&startblock=0&endblock=99999999&page=" + pagenum + "&offset=" + limit + "&sort=desc&apikey=VG4EJ7WXR5P5SYPD5466QNRKEFV7T423WA"
	let url = "http://api.etherscan.io/api?module=account&action=txlist&address=" + addr + "&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=VG4EJ7WXR5P5SYPD5466QNRKEFV7T423WA"
	request({
		uri: url,
		method: "GET",
	}, function(error, response, body) {
		if (error) {
			logger.error("listTransactionsByAddress" + " - [" + time_st + "] - " + 'Error while getting the ETH transaction details by address')
			deferred.reject('Error while getting the ETH transaction details by address');
		} else {
			let r_txs = [];
			if (body.length > 0) {
				r_txs = JSON.parse(body);
				if (Array.isArray(r_txs.result) && r_txs.result.length > 0) {
					_.each(r_txs.result, (tx) => {
						let amount = parseFloat(tx.value) / 1e18;
						let fee = parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice) / 1e18;
						let sender_amount = amount + fee;
						if (tx.to.toLowerCase() == addr.toLowerCase()) {
							return_txs.push({
								txid: tx.hash,
								type: 'receive',
								time: tx.timeStamp,
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

function getTokenBalance(address, contractAddress) {

	// web3.eth.txpool.status().then(status => {
	// 	console.log('status');
	// 	console.log(status);
	// }).catch(err => {
	// 	console.log('error');
	// 	console.log(err);
	// });

	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("getTokenBalance" + " - [" + time_st + "] - " + address + ", " + contractAddress)

	let deferred = Q.defer();
	if (!address) {
		logger.error("getTokenBalance" + " - [" + time_st + "] -  Invalid Address!")
		deferred.reject('Invalid Address!');
	}
	let tokenContract = null;
	let tokenDecimals = 18;
	try {
		_getABI(contractAddress).then(function(contractABI) {
			tokenContract = new web3.eth.Contract(contractABI, contractAddress);
			if (typeof tokenContract.methods.decimals == 'function') {
				return tokenContract.methods.decimals().call();
			} else {
				return 18;
			}
		}).then(function(decimals) {
			tokenDecimals = parseFloat(decimals);
			return tokenContract.methods.balanceOf(address).call();
		}).then(function(balance) {
			deferred.resolve((balance / Math.pow(10, tokenDecimals)).toFixed(9));
	    }).catch(function(err) {
	    	logger.error("getTokenBalance" + " - [" + time_st + "] - " + err.message)
	    	deferred.reject(err.message);
	    });
	} catch(error) {
		logger.error("getTokenBalance" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}
    return deferred.promise;
}

function transferToken(pk, fromAddress, toAddress, p_amount, contractAddress) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("transferToken" + " - [" + time_st + "] - " + pk.substring(0, 5) + ", " + fromAddress + ", " + toAddress + ", " + p_amount + ", " + contractAddress)

	let deferred = Q.defer();

	let tokenContract = null;
	// let tokenDecimals = 3;
	let tx_nonce = 0;
	let tx_gas_price = 0;
	let tx_data = null;

	try {
		_getABI(contractAddress).then(function(contractABI) {
			tokenContract = new web3.eth.Contract(contractABI, contractAddress);
			return getTokenBalance(fromAddress, contractAddress);
		}).then(function(tokenBalance) {
			if (parseFloat(tokenBalance) < p_amount) {
				throw {message: 'Insufficient funds for GCC!'};
			} else {
				return getBalance(fromAddress);
			}
		}).then(function(balance) {
			if (balance < masterWallet.amount) {
				return transferGasFee(fromAddress);
				transferGasFee(fromAddress)
			} else {
				if (typeof tokenContract.methods.decimals == 'function') {
					return tokenContract.methods.decimals().call();
				} else {
					return 18;
				}
			}
		}).then(result => {
			if (typeof tokenContract.methods.decimals == 'function') {
				return tokenContract.methods.decimals().call();
			} else {
				return 18;
			}
		}).then(function(decimals) {
			// tokenDecimals = parseFloat(decimals);
			let amount = parseFloat(web3.utils.toWei(p_amount.toString())) * Math.pow(10, parseFloat(decimals)) / 1e18;
			amount = "0x" + amount.toString(16);
			tx_data = tokenContract.methods.transfer(toAddress, web3.utils.toBN(amount)).encodeABI();
			return web3.eth.getTransactionCount(fromAddress);
		}).then(function(nonce) {
			console.log(nonce)
			tx_nonce = nonce;
			return web3.eth.getGasPrice();
		}).then(function(estimated_gas_price) {
			tx_gas_price = estimated_gas_price;
			return web3.eth.estimateGas({
				from: fromAddress,
				to: toAddress,
				nonce:tx_nonce,
				data: tx_data
			});
		}).then(function(estimated_gas_limit) {
			let rawTx = {
				nonce: tx_nonce,
				gasPrice: web3.utils.toBN(tx_gas_price),
				gasLimit: web3.utils.toBN(GAS_LIMIT),
				to: contractAddress,
				value: 0,
				data: tx_data
			};

			let tx = new Tx(rawTx);
			let privateKey = new Buffer(pk.replace('0x',''),'hex');
			tx.sign(privateKey);

			let serializedTx = tx.serialize();

			let transaction = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
			transaction.once('transactionHash', function(hash) {
				// deferred.resolve({txid: hash});
			});
			transaction.once('receipt', function(receipt) {
				deferred.resolve({txid : receipt.transactionHash});
			});
			transaction.once('error', function(err) {
				logger.error("transferToken" + " - [" + time_st + "] - " + err.message)
				deferred.reject(err.message);
				// deferred.reject('Sorry, Ethereum network is busy now. Please try again in a few of minutes.');
			});
		}).catch(function(err) {
			// if (err.message == 'Insufficient funds!') {
			// 	transferGasFee(fromAddress).then(result => {
			// 		transferToken(pk, fromAddress, toAddress, p_amount, contractAddress).then(result => {
			// 			deferred.resolve(result);
			// 		}).catch(error => {
			// 			console.log('error3')
			// 			console.log(error)
			// 			deferred.reject(error)});
			// 	}).catch(error => {
			// 		console.log("error 2")
			// 		console.log(error)
					
			// 	})
			// }
			if (err.message) {
				logger.error("transferToken" + " - [" + time_st + "] - " + err.message)
				deferred.reject(err.message);
			} else {
				logger.error("transferToken" + " - [" + time_st + "] - " + err)
				deferred.reject(err);
			}
		});
	} catch(error) {
		logger.error("transferToken" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}

	return deferred.promise;
}

function listTokenTransactionsByAddress(address, contract_address) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("listTokenTransactionsByAddress" + " - [" + time_st + "] - " + address + ", " + contract_address)

	let deferred = Q.defer();
	let return_txs = [];

	let url = "http://api.etherscan.io/api?module=account&action=tokentx&address=" + address + "&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=VG4EJ7WXR5P5SYPD5466QNRKEFV7T423WA"
	request({
		uri: url,
		method: "GET",
	}, function(error, response, body) {
		if (error) {
			logger.error("listTokenTransactionsByAddress" + " - [" + time_st + "] - " + "Error while getting the ETH transaction details by address")
			deferred.reject('Error while getting the ETH transaction details by address');
		} else {
			let r_txs = [];
			if (body.length > 0) {
				r_txs = JSON.parse(body);
				if (Array.isArray(r_txs.result) && r_txs.result.length > 0) {
					_.each(r_txs.result, (tx) => {						
						let tx_input = tx.input;
						let tx_method_id = tx_input.substring(0, 10);
						let tx_receiver = tx_input.substring(10, 74);
						let amount = parseInt(tx_input.substring(74), 16) / 1e18;

						// let r_address = address.substring(2)

						// if (tx.to.toLowerCase() == addr.toLowerCase()) {
						if (tx_receiver.toLowerCase().indexOf(address.substring(2).toLowerCase()) > -1) {
							return_txs.push({
								txid: tx.hash,
								type: 'receive',
								time: tx.timeStamp,
								amount: amount,
							});
						} else {
							return_txs.push({
								txid: tx.hash,
								type: 'send',
								time: tx.timeStamp,
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

function getRate(contractAddress) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("getRate" + " - [" + time_st + "] - " + contractAddress)

	let deferred = Q.defer();
	let tokenContract = null;
	let tokenDecimals = 18;
	try {
		_getABI(contractAddress).then(function(contractABI) {
			tokenContract = new web3.eth.Contract(contractABI, contractAddress);
			if (typeof tokenContract.methods.decimals == 'function') {
				return tokenContract.methods.decimals().call();
			} else {
				return 18;
			}
		}).then(function(decimals) {
			tokenDecimals = parseFloat(decimals);
			return tokenContract.methods.getRate().call();
		}).then(function(rate) {
			deferred.resolve(rate);
	    }).catch(function(err) {
	    	logger.error("getRate" + " - [" + time_st + "] - " + err.message)
	    	deferred.reject(err.message);
	    });
	} catch(error) {
		logger.error("getRate" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}
    return deferred.promise;
}

function setRate(p_rate, contractAddress) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("setRate" + " - [" + time_st + "] - " + p_rate + ", " + contractAddress)

	let deferred = Q.defer();
	let tokenContract = null;
	let tokenDecimals = 18;
	try {
		_getABI(contractAddress).then(function(contractABI) {
			tokenContract = new web3.eth.Contract(contractABI, contractAddress);
			if (typeof tokenContract.methods.decimals == 'function') {
				return tokenContract.methods.decimals().call();
			} else {
				return 18;
			}
		}).then(function(decimals) {
			tokenDecimals = parseFloat(decimals);
			return tokenContract.methods.setRate(p_rate).call();
		}).then(function(result) {
			deferred.resolve(result);
	    }).catch(function(err) {
	    	logger.error("setRate" + " - [" + time_st + "] - " + err.message)
	    	deferred.reject(err.message);
	    });
	} catch(error) {
		logger.error("setRate" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}
    return deferred.promise;
}

function getTotalTokenSupply(contractAddress) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("getTotalTokenSupply" + " - [" + time_st + "] - " + contractAddress)

	let deferred = Q.defer();
	let tokenContract = null;
	let totalTotkenSupply;
	try {
		_getABI(contractAddress).then(contractABI => {
			if (!contractAddress) {
				contractAddress = sContractAddress;
			}
			tokenContract = new web3.eth.Contract(contractABI, contractAddress);
			if (typeof tokenContract.methods.totalSupply == 'function') {
				return tokenContract.methods.totalSupply().call();
			} else {
				logger.error("getTotalTokenSupply" + " - [" + time_st + "] - " + "contract abi error")
				deferred.reject("contract abi error");
			}
		}).then(totalSupply => {
			totalTotkenSupply = totalSupply;
			return getTokenBalance(owner, contractAddress); 
		}).then(balance => {
			console.log(balance)
			console.log((totalTotkenSupply / Math.pow(10, 18)).toFixed(9))
			let availableTokenSupply = (totalTotkenSupply / Math.pow(10, 18)).toFixed(9) - balance
			console.log(availableTokenSupply)
			deferred.resolve(availableTokenSupply.toString());
		}).catch(err => {
			logger.error("getTotalTokenSupply" + " - [" + time_st + "] - " + err.message)
			deferred.reject(err.message);
		})
	} catch(error) {
		logger.error("getTotalTokenSupply" + " - [" + time_st + "] - " + error.message)
		deferred.reject(error.message);
	}
	return deferred.promise;
}

function _getABI(contract_address) {
	let now = new Date();
	let time_st = date.format(now, ' YYYY.MM.DD / hh:mm:ss:Z ');
	logger.info("_getABI" + " - [" + time_st + "] - " + contract_address)

	let deferred = Q.defer();
	if (!contract_address) {
		deferred.resolve(sERC20ABI);
	} else {
		let url = "http://api.etherscan.io/api?module=contract&action=getabi&address=" + contract_address;
		request({
			uri: url,
			method: "GET",
		}, function(error, response, body) {
			if (error) {
				logger.error("_getABI" + " - [" + time_st + "] - " + "Error while getting the ABI")
				deferred.reject({message: 'Error while getting the ABI'});
			} else {
				let contractABI = null;
				
				if (body.length > 0) {
					let json_body = JSON.parse(body);
					if (json_body.status == 0 && json_body.result == "Invalid Address format") {
						deferred.reject({message: 'Invalid contract address'});
					} else {
						contractABI = json_body.result;
						if (contractABI && contractABI != '') {
							deferred.resolve(JSON.parse(contractABI));
						} else {
							deferred.resolve(sERC20ABI);
						}
					}
				} else {
					logger.error("_getABI" + " - " + "[" + time_st + "]" + " - " + "Returned Empty Contract ABI!")
					deferred.reject({message: 'Returned Empty Contract ABI!'});
				}
				
			}
		});
	}

	return deferred.promise;
}

// function _getTokenObj(token_name) {
// 	if (token_name == 'next') {
// 		return nextToken;
// 	} else {
// 		return false;
// 	}
// }

// function _getTokenContractAddress(token_name) {
// 	if (token_name == 'next') {
// 		return nextTokenContractAddress;
// 	} else {
// 		return false;
// 	}	
// }
