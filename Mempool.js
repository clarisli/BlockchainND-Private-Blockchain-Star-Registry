/* ===  Mempool: a temporary storage for validation requests ===
| The mempool component will store temporal validation requests for 5 minutes (300 seconds).
| The mempool component will store temporal valid requests for 30 minutes (1800 seconds).
| The mempool component will manage the validation time window.
|  =============================================================*/

const bitcoinMessage = require('bitcoinjs-message');

const TimeoutRequestsWindowTime = 5*60*1000;
const TimeoutValidRequestsWindowTime = 30*60*1000;
const messageSuffix = "starRegistry";

class Mempool {
	constructor(){
	   this.mempool = [];
	   this.timeoutRequests = [];
	   this.mempoolValid = [];
	   this.timeoutValidRequests = [];
 	}

 	addRequestValidation(walletAddress) {
 		let self = this;
 		let request = this.mempool[walletAddress];
 		if (request === undefined) {
 			request = this._createRequestObject(walletAddress);
 			this.mempool[walletAddress] = request;
 			this.timeoutRequests[walletAddress]=setTimeout(function(){ self._removeValidationRequest(walletAddress) }, TimeoutRequestsWindowTime );
 		}
 		request.validationWindow = this._getRequestValidationWindow(request.requestTimeStamp, TimeoutRequestsWindowTime);
 		return request
 	}

 	_createRequestObject(walletAddress) {
 		let requestTimeStamp = this._getTimestamp();
 		return {
		    "walletAddress": walletAddress,
		    "requestTimeStamp": requestTimeStamp,
		    "message": `${walletAddress}:${requestTimeStamp}:${messageSuffix}`
		}
 	}

 	_getTimestamp() {
 		return Math.floor(Date.now() / 1000);
 	}

 	_getRequestValidationWindow(requestTimeStamp, windowTime) {
		let timeElapse = this._getTimestamp() - requestTimeStamp;
		let timeLeft = windowTime/1000 - timeElapse;
		return timeLeft;
 	}

 	_removeValidationRequest(walletAddress) {
 		delete this.mempool[walletAddress];
 		delete this.timeoutRequests[walletAddress];
 	}

 	validateRequestByWallet(walletAddress, signature) {
 		let validRequest = this.mempoolValid[walletAddress];
 		if (validRequest === undefined) {
	 		validRequest = this._validateRequestInMempool(walletAddress, signature);
 		}
 		if (validRequest) {
 			validRequest.status.validationWindow = this._getRequestValidationWindow(validRequest.status.requestTimeStamp, TimeoutValidRequestsWindowTime);
 			return validRequest;
 		}
 		return this._createInvalidRequestObj();

 	}

 	_validateRequestInMempool(walletAddress, signature) {
 		let self = this
 		let request = this.mempool[walletAddress];
	 	if (request) {
		 	if (this._isRequestValid(request, signature)) {
		 		// Create the new object and save it into the mempoolValid array 
		 		let validRequest = this._createValidRequestObj(request);
		 		this.mempoolValid[walletAddress] = validRequest;
		 		this.timeoutValidRequests[walletAddress]=setTimeout(function(){ self._removeValidRequest(walletAddress) }, TimeoutValidRequestsWindowTime );
		 		this._removeValidationRequestAndClearTimeout(walletAddress);
		 		return validRequest;
		 	}
	 	}
 	}

 	_isRequestValid(request, signature) {
 		let isWindowTimeValid = this._getRequestValidationWindow(request.requestTimeStamp, TimeoutRequestsWindowTime) > 0;
		let isSignatureValid = bitcoinMessage.verify(request.message, request.walletAddress, signature);
		return isWindowTimeValid && isSignatureValid;
 	}

 	_createValidRequestObj(request) {
 		return {
		    "registerStar": true,
		    "status": {
		        "address": request.walletAddress,
		        "requestTimeStamp": this._getTimestamp(),
		        "message": request.message,
		        "messageSignature": true
    		}
		}
 	}

 	_removeValidRequest(walletAddress) {
 		delete this.mempoolValid[walletAddress];
 		delete this.timeoutValidRequests[walletAddress];
 	}

 	_createInvalidRequestObj() {
 		return {
		    "registerStar": false
		}
 	}

 	_removeValidationRequestAndClearTimeout(walletAddress) {
 		clearTimeout(this.timeoutRequests[walletAddress]);
 		this._removeValidationRequest(walletAddress);
 	}

 	removeValidRequestAndClearTimeout(walletAddress) {
 	 	clearTimeout(this.timeoutValidRequests[walletAddress]);
 		this._removeValidRequest(walletAddress);	
 	}

 	verifyAddressRequest(walletAddress) {
 		let validRequest = this.mempoolValid[walletAddress];
 		if (validRequest) {
 			let isValid = this._getRequestValidationWindow(validRequest.status.requestTimeStamp, TimeoutRequestsWindowTime) > 0;
 			return isValid;
 		}
 		return false;

 	}
}

module.exports.Mempool = Mempool;