/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// Add data to levelDB with key/value pair
function addLevelDBData(key,value){
  return new Promise(function(resolve, reject) {
    db.put(key, value, function(err) {
      if (err) {
        console.log('Block ' + key + ' submission failed', err);
        reject(err);
      } 
      getLevelDBData(key).then((blockData) => {
          resolve(JSON.parse(blockData));
        }).catch((err) => {
          console.log('Block not found!', err);
          reject(err);
        });
    });
  });
}

module.exports.addLevelDBData = addLevelDBData;

// Get data from levelDB with key
function getLevelDBData(key){
  return new Promise(function(resolve, reject) {
    db.get(key, function(err, value) {
      if(err){
        if (err.type == 'NotFoundError') {
          resolve(undefined);
        } else {
          console.log('Block ' + key + ' get failed', err);
          reject(err);
        }
      }
      resolve(value);
    });
  });
}

module.exports.getLevelDBData = getLevelDBData;

// Add data to levelDB with value
function addDataToLevelDB(value) {
    return new Promise(function(resolve, reject) {
      let i = 0;
      db.createReadStream().on('data', function(data) {
        i++;
      }).on('error', function(err) {
        console.log('Unable to read data stream!', err);
        reject(err);
      }).on('close', function() {
        console.log('addDataToLevelDB: Block #' + i);
        addLevelDBData(i, value);
        resolve(i);
      });
    });
}

module.exports.addDataToLevelDB = addDataToLevelDB;

// Add total number of data entries in levelDB
function getLevelDBTotalCount() {
  return new Promise(function(resolve, reject) {
    let i = 0;
    db.createReadStream().on('data', function(data) {
      i++;
    }).on('error', function(err) {
      reject(err);
    }).on('close', function() {
      resolve(i);
    });
  });
}

module.exports.getLevelDBTotalCount = getLevelDBTotalCount;

function getBlockByHash(hash) {
       let block = null;
       return new Promise(function(resolve, reject){
           db.createReadStream().on('data', function(data) {
            let blockData = JSON.parse(data.value);
               if(blockData.hash === hash){
                   block = blockData;
               }
           }).on('error', function (err) {
               reject(err)
           }).on('close', function () {
               resolve(block);
           });
       });
   }

module.exports.getBlockByHash = getBlockByHash;

function getBlocksByAddress(address) {
       let blocks = [];
       return new Promise(function(resolve, reject){
           db.createReadStream().on('data', function(data) {
            let blockData = JSON.parse(data.value);
               if(blockData.body.address === address){
                   blocks.push(blockData);
               }
           }).on('error', function (err) {
               reject(err)
           }).on('close', function () {
               resolve(blocks);
           });
       });
   }

module.exports.getBlocksByAddress = getBlocksByAddress;
