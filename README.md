# Private Blockchain Notary Service - Star Registry

In this project I built a Star Registry Service that allows users to claim ownership of their favorite star in the night sky. The goals of this project are:

##### Create a Blockchain dataset to store a Star
* The application will persist the data (using LevelDB).
* The application will allow users to identify the Star data with the owner. 

##### Create a Mempool component
* The mempool component will store temporal validation requests for 5 minutes (300 seconds).
* The mempool component will store temporal valid requests for 30 minutes (1800 seconds).
* The mempool component will manage the validation time window. 

##### Create a REST API that allows users to interact with the application
* The API will allow users to submit a validation request.
* The API will allow users to validate the request.
* The API will be able to encode and decode the star data.
* The API will allow be able to submit the Star data.
* The API will allow lookup of Stars by hash, wallet address, and height.

[//]: # (Image References)

[image1]: ./images/workflow.png

## Setup

To setup the project do the following:

1. Download the project.
2. Run command __npm install__ to install the project dependencies.
3. Run command __node app.js__ in the root directory.

## Star Data

Example of star coordinates:

```
RA 13h 03m 33.35sec, Dec -49° 31’ 38.1” Mag 4.83 Cen
```

Here is what each of these abbreviations stands for:
 
 * RA = Right Ascension
 * DEC = Declination
 * CEN = Centaurus
 * MAG = Magnitude

Resources for discovering stars:

* [Google Sky](https://www.google.com/sky/)
* [Skyview](https://skyview.gsfc.nasa.gov/blog/index.php/2012/12/04/can-you-help-me-find-a-star/)
* [Berkeley Coordinates](http://cse.ssl.berkeley.edu/SegwayEd/lessons/findplanets/coordinates.html)
* [Skymap](https://in-the-sky.org/skymap.php) 

## The Workflow

Below is a sequence diagram that shows the flow of methods across the components - the user, the web API, the mempool, and blockchain:

![alt text][image1]

I configured the API service using port 8000 to open channels of communication in `app.js`. The URL path is:

[http://localhost:8000](http://localhost:8000)

The endpoinds are defined in `BlockController.js`.

Utility functions for interactions with LevelDB are in `levelSandbox.js`. I implemented the mempool in `Mempool.js`, and blockchain in `simpleChain.js`.

### POST endpoints

#### 1. User submits a validation request

Users start out by submitting a validation request to an API endpoint:

```
curl -X POST \
  http://localhost:8000/requestValidation \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{
    "address":"19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL"
}'
```

I implemented this API endpoint in the function `postRequestValidation()` in lines 137 to 150 of `BlockController.js`. 

#### 2. `AddRequestValidation` method in the memepool

I then stored the request the `mempool` - in the function `addRequestValidation()`, lines 21 to 30 in `Mempool.js`. Mempool can be thought as a temporary storage for validation requests:

```
	this.mempool = [];
	this.timeoutRequests = [];
```
I used arrays to store these temporary requests. 

In addition to the request's wallet address, I also stored the `requestTimeStamp` because later I will use it to calculate the `window time`. 

#### 3. `setTimeOut` method in the mempool

The request (as was mentioned before in the requirements) should be available for validation for 5 minutes. If the condition is met, I will delete the request:

```
this.timeoutRequests[walletAddress]=setTimeout(function(){ this._removeValidationRequest(walletAddress) }, TimeoutRequestsWindowTime );
```

I did this in the function `addRequestValidation()` in `Mempool.js`.

If the user re-submits a request, the application will not add a new request; instead, it will return the same request that it is already in the mempool, with its `window time` value updated. I handled the time calculation like this:

```
const TimeoutRequestsWindowTime = 5*60*1000;

let timeElapse = this._getTimestamp() - requestTimeStamp;
let timeLeft = windowTime/1000 - timeElapse;
```

I did this in the function `_getRequestValidationWindow()`, lines 45 to 49 in `Mempool.js`.

#### 4. `requestObject` return values

Then the endpoint returns these values to the user:

```
{
    "walletAddress": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
    "requestTimeStamp": "1541605128",
    "message": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL:1541605128:starRegistry",
    "validationWindow": 300
}
```

#### 5. User will send a validation request

Next, the user will sign the message returned by `/requestValidation`, and then send the signature along with the wallet address to request for validation.

```
curl -X POST \
  http://localhost:8000/message-signature/validate \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{
"address":"19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
 "signature":"H8K4+1MvyJo9tcr2YN2KejwvX1oqneyCH+fsUL1z1WBdWmswB9bijeFfOfMqK68kQ5RO6ZxhomoXQG3fkLaBl+Q="
}'
```

#### 6. `validateRequestByWallet` method in the mempool

I validate the request with following logic:

* Find the request in the mempoolValid array. If the wallet address has already been validated, update the window time and return the valid request. 
* Otherwise, find the request in the mempool array by wallet address.
	* Verify the windowTime
	* Verify the signature using

I verified the signature as following:

```
	const bitcoinMessage = require('bitcoinjs-message'); 
	let isValid = bitcoinMessage.verify(message, 	address, signature);
```
I did this step the funciton `_isRequestValid()`, lines 86 to 90 in `Mempool.js`. 

* Create the new object and save it into the `mempoolValid` array

```
{
	"registerStar": true,
	"status": {
		"address": request.walletAddress,
		"requestTimeStamp": this._getTimestamp(),
		"message": request.message,
		"messageSignature": true
		}
```

At the same step, I cleared the corresponding validation request's timeout.

I implemented this in the functions `validateRequestByWallet()` and `_validateRequestInMempool()`, lines 56 to 83 in `Mempool.js`.

#### 7. Return the `validRequest` object

```
{
    "registerStar": true,
    "status": {
        "address": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
        "requestTimeStamp": "1541605128",
        "message": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL:1541605128:starRegistry",
        "validationWindow": 200,
        "messageSignature": true
    }
}
```

#### 8. A user will send star data to be stored

Star story supports ASCII text, limited to 250 words (500 bytes), and hex encoded. Example:

```
{
"address": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
    "star": {
            "dec": "68° 52' 56.9",
            "ra": "16h 29m 1.0s",
            "story": "Found star using https://www.google.com/sky/"
        }
}
```

I implemented this endpoint in the function `postNewBlock()`, lines 99 to 124 in `BlockController.js`.

#### 9. `verifyAddressRequest` method

The request validation must exists and valid before we add the star data to the blockchain. I did this in the function `verifyAddressRequest()`, lines 120 to 128 in `Mempool.js`.

#### 10. Encode Star story data
The star data is encoded before adding to the blockchain. I implemented the encoding in the function `_encode()` in line 127 of `BlockController.js`.

#### 11. `addBlock` method

Then I added the star to the blockchain using the function `addBlock()` in lines 46 to 76, `simpleChain.js`. 

The applicaiotn return the object:

```
{
     "hash": "a59e9e399bc17c2db32a7a87379a8012f2c8e08dd661d7c0a6a4845d4f3ffb9f",
      "height": 1,
      "body": {
           "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
           "star": {
                "ra": "16h 29m 1.0s",
                "dec": "-26° 29' 24.9",
                "story": 
        "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f",
                "storyDecoded": "Found star using https://www.google.com/sky/"
             }
       },
      "time": "1532296234",
       "previousBlockHash": "49cce61ec3e6ae664514d5fa5722d86069cf981318fc303750ce66032d0acff3"
}
```

Note that `"storyDecoded"` property is not being saved in the block, I decode the story from blockchain before returning it to user.

```
hex2ascii(data);
```

I did this in the function `_decode()`, line 131 in `BlockController.js`.

### GET endpoints

#### 1. Get star block by hash with JSON response

I did this in the function `getBlockByHash()`, lines 83 to 99 in `levelSandbox.js`. 

The CURL example as a request:

```
// Curl request
curl "http://localhost:8000/stars/hash:a59e9e399bc17c2db32a7a87379a8012f2c8e08dd661d7c0a6a4845d4f3ffb9f"
``` 

Then I created an endpoint to call this function and return the block object - did this in the function `getBlockByHash()`, lines 45 to 57 in `BlockController.js`. 

I decode the star's story each time returning a block.

#### 2. Get star block by wallet address

The CURL example as a request:

```
// Curl request
curl "http://localhost:8000/stars/address:13Js7D3q4KvfSqgKN8LpNq57gcahrVc5JZ"
``` 

I did this in the function `getBlockByWalletAddress()` in lines 101 to 117 of `levelSandbox.js`, and `getBlockByWalletAddress()` in `BlockController.js` for the endpoint.

This endpoint returns a list of stars registered by one user.

#### 3. Get star block by height

The CURL example as a request:

```
// Curl request
curl "http://localhost:8000/stars/height:5"
``` 

I did this in the function `getLevelDBData()` in lines 30 to 44 of `levelSandbox.js`, and `getBlockByHeight()` in `BlockController.js` for the endpoint.
