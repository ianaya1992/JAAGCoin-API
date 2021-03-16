var Q = require('q');
var CryptoJS = require("crypto-js");
var hashKey = require('../../config').hashKey;

var service = {};

service.encryptKey = encryptKey;
service.decryptKey = decryptKey;

module.exports = service;

function encryptKey(data) {
	var deferred = Q.defer();
	var hashedData = CryptoJS.AES.encrypt(data, hashKey);
	deferred.resolve(hashedData.toString());
	return deferred.promise;
}

function decryptKey(data) {
	var deferred = Q.defer();
	var bytes  = CryptoJS.AES.decrypt(data, hashKey);
	var decryptedData = bytes.toString(CryptoJS.enc.Utf8);
	deferred.resolve(decryptedData);
	return deferred.promise;
}