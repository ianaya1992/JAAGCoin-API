var eth = require('../eth.js');
var neo = require('../neo.js');
var bitcash = require('../bitcash.js');
var addressService = require('../services/address.service');
var hashService = require('../services/hash.service');
var authService = require('../services/auth.service');
var csvService = require('../services/csv.service');
var CryptoJS = require("crypto-js");

module.exports = function(app, db) {
  app.post('/decrypt/privateKey', (req, res) => {
    let privateKey = req.body.hash;
    
    hashService.decryptKey(privateKey).then(decrypted_key => {
      res.send(decrypted_key);
    });
  })
  app.post('/wallet/save', (req, res) => {
    csvService.readCSV().then(result => {
      res.send(result);
    })
  })
  app.post('/neo/wallet/create', (req, res) => {
    if (authService.checkAuth(req)) {
      neo.newAccount().then(function(value) {
        hashService.encryptKey(value.privateKey).then(encrypted_key => {
          var data = {};
          data.address = value.address;
          data.privateKey = encrypted_key;
          addressService.create(data).then(result=>{
          res.send({status:true, data:{id:result.id, address:result.address, hash:encrypted_key}});
          }).catch(err => {
            res.send({status:false, message:err.message});
          });
        });
      }, function(error) {
        res.send({status:false, message:error});
      });
    } else {
      authService.responseError(res);
    }
  });
  app.post('/neo/wallet/balances', (req, res) => {
    if (authService.checkAuth(req)) {
      let id = req.body.id;
      let address = req.body.address;
      if (!address && !id) {
        res.send({status:false, message:"Address is missing"})
      } else if (address) {
        neo.getBalance(address).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          });
      } else {
        addressService.getAddressbyID(id).then(result=>{
          neo.getBalance(result.address).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          });
        }).catch(err => {
          res.send({status:false, message:err});
        });
      }
    } else {
      authService.responseError(res);
    }
  });
  app.post('/neo/transaction/list', (req, res) => {
    if (authService.checkAuth(req)) {
      let id = req.body.id;
      let address = req.body.address;
      if (!address && !id) {
        res.send({status:false, message:"Address is missing"});
      } else if (address) {
        neo.listTransactionsByAddress(address).then(function(value) {
          res.send({status:true, data:value});
        }, function(error) {
          res.send({status:false, message:error});
        })
      } else {
        addressService.getAddressbyID(id).then(result => {
          neo.listTransactionsByAddress(result.address).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          })
        }).catch(err => {
          res.send({status:false, message:err.message});
        });
      }
    } else {
      authService.responseError(res);
    }
  })
  app.post('/neo/transaction/create', (req, res) => {
    if (authService.checkAuth(req)) {
      let fromID = req.body.from_id;
      let toID = req.body.to_id;
      let fromAddress = req.body.from_address;
      let toAddress = req.body.to_address;
      let amount = req.body.amount;
      let hash = req.body.hash;

      if (!fromAddress && !fromID) {
        res.send({status:false, message:"Sender address is missing"});
      } else if (!toAddress && !toID) {
        res.send({status:false, message:"Receiver address is missing"});
      } else if (fromAddress) {
        addressService.getAddressbyWalletID(fromAddress).then(result1 => {
          if (!hash) {
            hash = result1.privateKey;
          }
          hashService.decryptKey(hash).then(decrypted_key => {
            let privateKey = decrypted_key;
            if (toAddress) {
              eth.transfer(privateKey, toAddress, amount).then(value => {
                res.send({status:true, data:value});
              }).catch(error => {
                res.send({status:false, message:error});
              })
            } else {
              addressService.getAddressbyID(toID).then(result2 => {
                toAddress = result2.address;
                eth.transfer(privateKey, toAddress, amount).then(value => {
                  res.send({status:true, data:value});
                }).catch(error => {
                  res.send({status:false, message:error});
                })
              }).catch(err => {
                res.send({status:false, message:err.message});
              })
            }
          })
        }).catch(err => {
          res.send({status:false, message:err.message});
        })
      } else {
        addressService.getAddressbyID(fromID).then(result1 => {
          if (!hash) {
            hash = result1.privateKey;
          }
          hashService.decryptKey(hash).then(decrypted_key => {
            let privateKey = decrypted_key;
            fromAddress = result1.address;
            if (toAddress) {
              eth.transfer(privateKey, toAddress, amount).then(value => {
                res.send({status:true, data:value});
              }).catch(error => {
                res.send({status:false, message:error});
              })
            } else {
              addressService.getAddressbyID(to).then(result2 => {
                toAddress = result2.address;
                eth.transfer(privateKey, toAddress, amount).then(value => {
                    res.send({status:true, data:value});
                  }).catch(error => {
                    res.send({status:false, message:error});
                  })
              }).catch(err => {
                res.send({status:false, message:err.message});
              })
            }
          });
        });
      } 
    } else {
      authService.responseError(res);
    }
  });
  app.post('/bitcash/wallet/create', (req, res) => {
    if (authService.checkAuth(req)) {
      bitcash.newAccount().then(value => {
        res.send(value);
      })
    } else {
      authService.responseError(res);
    }
  })
  app.post('/bitcash/wallet/balances', (req, res) => {
    if (authService.checkAuth(req)) {
      let address = req.body.address;
      bitcash.getBalance(address).then(value => {
        res.send(value);
      })
    } else {
      authService.responseError(res);
    }
  })
  app.post('/bitcash/transaction/list', (req, res) => {
    if (authService.checkAuth(req)) {
      let address = req.body.address;
      bitcash.listTransactionsByAddress(address).then(value => {
        res.send(value);
      })
    } else {
      authService.responseError(res);
    }
  })
  app.post('/eth/wallet/create', (req, res) => {
    if (authService.checkAuth(req)) {
      eth.newAccount().then(function(value) {
        hashService.encryptKey(value.privateKey).then(encrypted_key => {
          var data = {};
          data.address = value.address;
          data.privateKey = encrypted_key;
          addressService.create(data).then(result=>{
          res.send({status:true, data:{id:result.id, address:result.address, hash:encrypted_key}});
          }).catch(err => {
            res.send({status:false, message:err.message});
          });
        });
      }, function(error) {
        res.send({status:false, message:error});
      });
    } else {
      authService.responseError(res);
    }
  });
  app.post('/eth/wallet/privateKey', (req, res) => {
    let address = req.body.address
    addressService.getAddressbyWalletID(address).then(result1 => {
      hashService.decryptKey(result1.privateKey).then(decrypted_key => {
        res.send(decrypted_key);
      })
    }).catch(err => {
      res.send(err);
    });
  });
  app.post('/eth/wallet/balances', (req, res) => {
    if (authService.checkAuth(req)) {
      let id = req.body.id;
      let address = req.body.address;
      let contract = req.body.contract;
      if (!address && !id) {
        res.send({status:false, message:"Address is missing"})
      } else if (address) {
        if (!contract) {
          eth.getBalance(address).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          });
        } else {
          eth.getTokenBalance(address, contract).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          })
        }
      } else {
        addressService.getAddressbyID(id).then(result=>{
          if (!contract) {
            eth.getBalance(result.address).then(function(value) {
              res.send({status:true, data:value});
            }, function(error) {
              res.send({status:false, message:error});
            });
          } else {
            eth.getTokenBalance(result.address, contract).then(function(value) {
              res.send({status:true, data:value});
            }, function(error) {
              res.send({status:false, message:error});
            })
          }
        }).catch(err => {
          res.send({status:false, message:err});
        });
      }
    } else {
      authService.responseError(res);
    }
  });
  app.post('/eth/transaction/list', (req, res) => {
    if (authService.checkAuth(req)) {
      let id = req.body.id;
      let address = req.body.address;
      let contract = req.body.contract;
      if (!address && !id) {
        res.send({status:false, message:"Address is missing"});
      } else if (address) {
        if (!contract) {
          eth.listTransactionsByAddress(address).then(function(value) {
            res.send({status:true, data:value});
          }, function(error) {
            res.send({status:false, message:error});
          })
        } else {
          eth.listTokenTransactionsByAddress(address, contract).then(value => {
            res.send({status:true, data:value});
          }).catch(err => {
            res.send({status:true, message:err});
          });
        }
      } else {
        addressService.getAddressbyID(id).then(result => {
          if (!contract) {
            eth.listTransactionsByAddress(result.address).then(function(value) {
              res.send({status:true, data:value});
            }, function(error) {
              res.send({status:false, message:error});
            })
          } else {
            eth.listTokenTransactionsByAddress(result.address, contract).then(value => {
              res.send({status:true, data:value});
            }).catch(err => {
              res.send({status:true, message:err});
            });
          }
        }).catch(err => {
          res.send({status:false, message:err.message});
        });
      }
    } else {
      authService.responseError(res);
    }
  })
  app.post('/eth/wallet/getGasFee', (req, res) => {
    if (authService.checkAuth(req)) {
      let id = req.body.id;
      let address = req.body.address;
      if (!address && !id) {
        res.send({status:false, message:"Address is missing"})
      } else if (address) {
        eth.transferGasFee(address).then(value => {
          res.send({status:true, data:value});
        }).catch(err => {
          res.send({status:false, message:err});
        })
      } else {
        addressService.getAddressbyID(id).then(result=>{
          eth.transferGasFee(address).then(value => {
            res.send({status:true, data:value});
          }).catch(err => {
            res.send({status:false, message:err});
          })
        }).catch(err => {
          res.send({status:false, message:err});
        });
      }
    } else {
      authService.responseError(res);
    }
  }); 
  app.post('/eth/transaction/create', (req, res) => {
    if (authService.checkAuth(req)) {
      let fromID = req.body.from_id;
      let toID = req.body.to_id;
      let fromAddress = req.body.from_address;
      let toAddress = req.body.to_address;
      let amount = req.body.amount;
      let contract = req.body.contract;
      let hash = req.body.hash;

      if (!fromAddress && !fromID) {
        res.send({status:false, message:"Sender address is missing"});
      } else if (!toAddress && !toID) {
        res.send({status:false, message:"Receiver address is missing"});
      } else if (fromAddress) {
        addressService.getAddressbyWalletID(fromAddress).then(result1 => {
          if (!hash) {
            hash = result1.privateKey;
          }
          hashService.decryptKey(hash).then(decrypted_key => {
            let privateKey = decrypted_key;
            if (toAddress) {
              if (!contract) {
                eth.transfer(privateKey, fromAddress, toAddress, amount).then(value => {
                  res.send({status:true, data:value});
                }).catch(error => {
                  res.send({status:false, message:error});
                })
              } else {
                eth.transferToken(privateKey, fromAddress, toAddress, amount, contract).then(value => {
                  res.send({status:true, data:value});
                }).catch(error => {
                  res.send({status:false, message:error});
                })
              }
            } else {
              addressService.getAddressbyID(toID).then(result2 => {
                toAddress = result2.address;
                if (!contract) {
                  eth.transfer(privateKey, fromAddress, toAddress, amount).then(value => {
                    res.send({status:true, data:value});
                  }).catch(error => {
                    res.send({status:false, message:error});
                  })
                } else {
                  eth.transferToken(privateKey, fromAddress, toAddress, amount, contract).then(value => {
                    res.send({status:true, data:value});
                  }).catch(error => {
                    res.send({status:false, message:error});
                  })
                }
              }).catch(err => {
                res.send({status:false, message:err.message});
              })
            }
          })
        }).catch(err => {
          res.send({status:false, message:err.message});
        })
      } else {
        addressService.getAddressbyID(fromID).then(result1 => {
          if (!hash) {
            hash = result1.privateKey;
          }
          hashService.decryptKey(hash).then(decrypted_key => {
            let privateKey = decrypted_key;
            fromAddress = result1.address;
            if (toAddress) {
              if (!contract) {
                eth.transfer(privateKey, fromAddress, toAddress, amount).then(value => {
                  res.send({status:true, data:value});
                }).catch(error => {
                  res.send({status:false, message:error});
                })
              } else {
                eth.transferToken(privateKey, fromAddress, toAddress, amount, contract).then(value => {
                  res.send({status:true, data:value});
                }).catch(error => {
                  res.send({status:false, message:error});
                })
              }
            } else {
              addressService.getAddressbyID(to).then(result2 => {
                toAddress = result2.address;
                if (!contract) {
                  eth.transfer(privateKey, fromAddress, toAddress, amount).then(value => {
                    res.send({status:true, data:value});
                  }).catch(error => {
                    res.send({status:false, message:error});
                  })
                } else {
                  eth.transferToken(privateKey, fromAddress, toAddress, amount, contract).then(value => {
                    res.send({status:true, data:value});
                  }).catch(error => {
                    res.send({status:false, message:error});
                  })
                }
              }).catch(err => {
                res.send({status:false, message:err.message});
              })
            }
          });
        });
      } 
    } else {
      authService.responseError(res);
    }
  });
  app.post('/eth/contract/rate/view', (req, res) => {
    if (authService.checkAuth(req)) {
      let contract = req.body.contract;

      eth.getRate(contract).then(function(value) {
        var response = {};
        response.status = true;
        response.data = value;
        res.send(response);
      }, function(error) {
        var response = {};
        response.status = false;
        response.message = error;
        res.send(response);
      });
    } else {
      authService.responseError(res);
    }
  });
  app.post('/eth/contract/rate/update', (req, res) => {
    if (authService.checkAuth(req)) {

      let contract = req.body.contract;
      let rate = req.body.rate;

      eth.getRate(rate, contract).then(function(value) {
        var response = {};
        response.status = true;
        response.data = rate;
        res.send(response);
      }, function(error) {
        var response = {};
        response.status = false;
        response.message = error;
        res.send(response);
      })
    } else {
      authService.responseError(res);
    }
  });
  app.get('/eth/coins/circulation', (req, res) => {
    const contract = req.params.contract;
    eth.getTotalTokenSupply(contract).then(value => {
      console.log(value)
      res.send(value);
    }).catch(err => {
      res.send(err);
    })
  });
};

// var ObjectID = require('mongodb').ObjectID;
// module.exports = function(app, db) {
//   app.get('/notes/:id', (req, res) => {
//     const id = req.params.id;
//     const details = { '_id': new ObjectID(id) };
//     db.collection('notes').findOne(details, (err, item) => {
//       if (err) {
//         res.send({'error':'An error has occurred'});
//       } else {
//         res.send(item);
//       } 
//     });
//   });

// app.delete('/notes/:id', (req, res) => {
//     const id = req.params.id;
//     const details = { '_id': new ObjectID(id) };
//     db.collection('notes').remove(details, (err, item) => {
//       if (err) {
//         res.send({'error':'An error has occurred'});
//       } else {
//         res.send('Note ' + id + ' deleted!');
//       } 
//     });
//   });

// app.put('/notes/:id', (req, res) => {
//     const id = req.params.id;
//     const details = { '_id': new ObjectID(id) };
//     const note = { text: req.body.body, title: req.body.title };
//     db.collection('notes').update(details, note, (err, result) => {
//       if (err) {
//           res.send({'error':'An error has occurred'});
//       } else {
//           res.send(note);
//       } 
//     });
//   });