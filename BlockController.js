const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./Block.js');
const BlockchainClass = require('./simpleChain.js')
const MempoolClass = require('./Mempool.js');
const { check, validationResult } = require('express-validator/check');
const hex2ascii = require('hex2ascii')

/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class BlockController {

    /**
     * Constructor to create a new BlockController, you need to initialize here all your endpoints
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.blockChain = new BlockchainClass.Blockchain();
        this.mempool = new MempoolClass.Mempool();
        this.getBlockByHash();
        this.getBlocksByAddress();
        this.getBlockByHeight();
        this.postNewBlock();
        this.postRequestValidation();
        this.postValidateSignature();
    }


    /**
     * Implement a GET Endpoint to retrieve a block by hash, url: "/stars/hash::hash"
     */
    getBlockByHash() {
        this.app.get("/stars/hash::hash", (req, res) => {
            let hash = req.params["hash"];
            this.blockChain.getBlockByHash(hash).then((block) => {
                if(block) {
                    block.body.star.storyDecoded = this._decode(block.body.star.story);
                    res.json(block);
                } else {
                    res.status(400).json({ error: 'Star not found.' });
                }
            }).catch((err) => {console.log(err);});
        });
    }

    /**
     * Implement a GET Endpoint to retrieve a block by wallet address, url: "/stars/address::address"
     */
    getBlocksByAddress() {
        let self = this;
        this.app.get("/stars/address::address", (req, res) => {
            let address = req.params["address"];
            this.blockChain.getBlocksByAddress(address).then((blocks) => {
                blocks.map(function (block){
                    block.body.star.storyDecoded = self._decode(block.body.star.story);
                    return block;
                });
                res.json({stars: blocks});
            }).catch((err) => {console.log(err);});
        });
    }

    /**
     * Implement a GET Endpoint to retrieve a block by height, url: "/stars/height::height"
     */
    getBlockByHeight() {
        this.app.get("/block/:height", (req, res) => {
            let height = req.params["height"];
            this.blockChain.getBlock(height).then((block) => {
                if(block) {
                    block.body.star.storyDecoded = this._decode(block.body.star.story);
                    res.json(block);
                } else {
                    res.status(400).json({ error: 'Star not found.' });
                }
            }).catch((err) => {
                console.log(err);
                res.status(400).json({ error: 'Star not found.' });
            });
        });
    }

    /**
     * Implement a POST Endpoint to add a new Block, url: "/block"
     */
    postNewBlock() {
        this.app.post("/block", [
            check(['address', 'star']).exists()
            ],(req, res) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(422).json({ errors: errors.array() });
                }

                if (this.mempool.verifyAddressRequest(req.body.address)) {
                    req.body.star.story = this._encode(req.body.star.story)
                    let newBlock = new BlockClass.Block(req.body);
                    this.blockChain.addBlock(newBlock).then((newBlock) => {
                        this.mempool.removeValidRequestAndClearTimeout(req.body.address);
                        newBlock.body.star.storyDecoded = this._decode(newBlock.body.star.story);
                        res.json(newBlock);
                    }).catch((err) => {
                        console.log('No errors detected' + err);
                    });
                } else {
                    res.status(403).json({ error: 'Wallet address is not valid.' });
                }
                
        });
    }

    _encode(data) {
        return Buffer(data).toString('hex');
    }

    _decode(data) {
        return hex2ascii(data);
    }

    /**
     * Implement a POST Endpoint to submit a validation request, url: "/requestValidation"
     */
    postRequestValidation() {
        this.app.post("/requestValidation", [
            check('address').exists()
            ],(req, res) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(422).json({ errors: errors.array() });
                }
                let request = this.mempool.addRequestValidation(req.body.address);
                res.json(request);

        });
    }

    /**
     * Implement a POST Endpoint to validate a message signature, url: "/message-signature/validate"
     */

    postValidateSignature() {
        this.app.post("/message-signature/validate", [
            check(['address', 'signature']).exists()
            ],(req, res) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(422).json({ errors: errors.array() });
                }
                let validRequest = this.mempool.validateRequestByWallet(req.body.address, req.body.signature);
                res.json(validRequest);

        });
    }

}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}