const chai = require('chai');
const dirtyChai = require('dirty-chai');
const solc = require('solc');
const {hexToNumber} = web3.utils;
const {toHex} = web3.utils;
const ethUtil = require('ethereumjs-util');

const { increaseTimeTo, duration } = require('./helpers/increaseTime');


var Sale = artifacts.require("./Sale.sol");
var Whitelist = artifacts.require("./Whitelist.sol");
var Treasury = artifacts.require("./Treasury.sol");

import expectRevert from './helpers/expectRevert';
import deployToken from './helpers/deployToken';

const getTxCount = account => new Promise((resolve, reject) => {
    web3.eth.getTransactionCount(account, (err, result) => {
        if (err) {
            return reject(err);
        }
        resolve(result);
    });
});

contract('Sale', function() {

    var owner;
    var whitelist;
    var token;

    var rate;
    var RATE_DELIMITER;

    var oldRate = 100;
    var RATE_UPDATE_DELAY;
    var rateBecomesValidAt;


    var accounts;
    var sale;
    var treasury;

    var ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function(){
        accounts = await web3.eth.getAccounts();
        owner = accounts[0];
        token = await deployToken(owner);

        let currentNonce = await getTxCount(owner);
        // find address of Treasury contract (nonce will be greater by 3)
        let addressOfTreasury = ethUtil.bufferToHex(ethUtil.generateAddress(
            owner,
            currentNonce + 2
        ));

        whitelist = await new web3.eth.Contract(Whitelist._json.abi).deploy({
            data: Whitelist._json.bytecode,
        }).send({
            from: owner,
            gas: 6721974,
            gasPrice: 20000000000
        });

        sale = await new web3.eth.Contract(Sale._json.abi).deploy({
            data: Sale._json.bytecode,
            arguments: [token.options.address, whitelist.options.address, addressOfTreasury, 500]
        }).send({
            from: owner,
            gas: 6721974,
            gasPrice: 20000000000
        });

        treasury = await new web3.eth.Contract(Treasury._json.abi).deploy({
            data: Treasury._json.bytecode,
            arguments: [token.options.address, sale.options.address]
        }).send({
            from: owner,
            gas: 6721974,
            gasPrice: 20000000000
        });

    });

    describe('Construction', async () => {
        it('Checking require', async ()  => {
            expectRevert(
                new web3.eth.Contract(Sale._json.abi).deploy({
                    data: Sale._json.bytecode,
                    arguments: [ZERO_ADDRESS, whitelist.options.address,
                        treasury.options.address, 500]
                }).send({
                    from: owner,
                    gas: 6721974,
                    gasPrice: 20000000000
                })
            );
            expectRevert(
                new web3.eth.Contract(Sale._json.abi).deploy({
                    data: Sale._json.bytecode,
                    arguments: [token.options.address, ZERO_ADDRESS,
                        treasury.options.address, 500]
                }).send({
                    from: owner,
                    gas: 6721974,
                    gasPrice: 20000000000
                })
            );
            expectRevert(
                new web3.eth.Contract(Sale._json.abi).deploy({
                    data: Sale._json.bytecode,
                    arguments: [token.options.address,whitelist.options.address,
                        ZERO_ADDRESS, 500]
                }).send({
                    from: owner,
                    gas: 6721974,
                    gasPrice: 20000000000
                })
            );
            expectRevert(
                new web3.eth.Contract(Sale._json.abi).deploy({
                    data: Sale._json.bytecode,
                    arguments: [token.options.address, whitelist.options.address,
                        treasury.options.address, 0]
                }).send({
                    from: owner,
                    gas: 6721974,
                    gasPrice: 20000000000
                })
            );
        });
        it('Checking initialized', async () => {
            let saleToken = await sale.methods.token().call();
            let saleWhitelist = await sale.methods.whitelist().call();
            let saleTreasury = await sale.methods.treasury().call();
            expect(saleToken).to.be.equal(token.options.address);
            expect(saleWhitelist).to.be.equal(whitelist.options.address);
            expect(saleTreasury).to.be.equal(treasury.options.address);
        });

    });

    describe('updateRate function', async () => {

        it('Checking require', async () => {
            expectRevert(sale.methods.updateRate(0).send({
                from: owner
            }));
        });

        it('Checking event', async () => {
            let res = await sale.methods.updateRate(100).send({
                from: owner
            });
            expect(res.events['RateUpdate']).to.exist;
            expect(res.events['RateUpdate']['returnValues']['newRate']).to.be.equal('100')
        });

        it('Check not owner', async () => {
            expectRevert(sale.methods.updateRate(10).send({
                from: accounts[1]
            }));
        })
        it('Check rate update', async () => {
            let res = await sale.methods.updateRate(1000).send({
                from: owner
            });
            let rateBecomesValidAt = res.events['RateUpdate']['returnValues']['rateBecomesValidAt'];
            let newRate = res.events['RateUpdate']['returnValues']['newRate'];
            expect(newRate).to.be.equal('1000');
        });


    });


    describe('transferOwnership function', async () => {

        it('Checking event', async () => {
            let res = await sale.methods.transferOwnership(accounts[1]).send({
                from: owner
            });
            expect(res.events['OwnershipTransferred']).to.exist;
            expect(res.events['OwnershipTransferred']['returnValues']['previousOwner']).to.be.equal(owner);
            expect(res.events['OwnershipTransferred']['returnValues']['newOwner']).to.be.equal(accounts[1]);
        });

        it('Checking transferOwnership', async () =>{
            expect(await sale.methods.owner().call()).to.equal(accounts[0]);
            await sale.methods.transferOwnership(accounts[1]).send({
                from: owner
            });
            expect(await sale.methods.owner().call()).to.equal(accounts[1]);
        });

        it('Check not owner', async () => {
            expectRevert(sale.methods.transferOwnership(accounts[2]).send({
                from: accounts[1]
            }));
        });

        it('Check incorrect address', async () => {
            expectRevert(sale.methods.transferOwnership(ZERO_ADDRESS).send({
                from: owner
            }));
        });
    });

    describe('availableTokens function', async () => {
        it ('Right balance', async () => {
            await token.methods.transfer(sale.options.address, 1000).send({
                from: owner
            });
            let availableTokens = await sale.methods.availableTokens().call();
            expect(availableTokens).to.be.equal('1000');
        });
    });

    describe('tokenFallback function', async () => {
        it ('successfully accept DGTX', async () => {
            await token.methods.transfer(sale.options.address, 1000).send({
                from: owner
            });
        });

        it("Revert transaction from not token adress", async () => {
            var otherToken = await deployToken(owner);
            await expectRevert(
                otherToken.methods.transfer(sale.options.address, 1000).send({
                    from: owner
                })
            );
        });
    });

    describe('currentRate function', async () => {
        it ('Time and rate change', async () => {
            let res = await sale.methods.updateRate(100).send({
                from: owner
            });
            let rateBecomesValidAt = res.events['RateUpdate']['returnValues']['rateBecomesValidAt'];
            let time_1 = rateBecomesValidAt - 500;
            let time_2 = rateBecomesValidAt - (-500);
            await increaseTimeTo(time_1);
            let currentRate_1 = await sale.methods.currentRate().call();
            await increaseTimeTo(time_2);
            let currentRate_2 = await sale.methods.currentRate().call();
            expect(currentRate_1).to.be.equal('500');
            expect(currentRate_2).to.be.equal('100');
        });
    });

    describe('weiToTokens function', async () => {
        it('Right conversion', async () => {
            let tokenAmount = await sale.methods.weiToTokens(10).call();
            expect(tokenAmount).to.be.equal('5');
        });
        it('Right conversation after rate update', async () => {
            let res = await sale.methods.updateRate(100).send({
                from: owner
            });
            let rateBecomesValidAt = res.events['RateUpdate']['returnValues']['rateBecomesValidAt'];
            await increaseTimeTo(rateBecomesValidAt);
            let tokenAmount = await sale.methods.weiToTokens(10).call();
            expect(tokenAmount).to.be.equal('1')
        });
    });

    describe('tokensToWei function', async () => {
        it('Right conversion', async () => {
            let weiAmount = await sale.methods.tokensToWei(10).call();
            expect(weiAmount).to.be.equal('20');
        });
        it('Rigth conversation after rate update', async () => {
            let res = await sale.methods.updateRate(100).send({
                from: owner
            });
            let rateBecomesValidAt = res.events['RateUpdate']['returnValues']['rateBecomesValidAt'];
            await increaseTimeTo(rateBecomesValidAt);
            let weiAmount = await sale.methods.tokensToWei(10).call();
            expect(weiAmount).to.be.equal('100');

        });
    });

    describe('withdraw function', async () => {
        it ('Revert withdraw', async () => {
            expectRevert(sale.methods.withdraw().send({
                from:owner
            }));
            expectRevert(sale.methods.withdraw(accounts[1]).send({
                from:owner
            }));
            expectRevert(sale.methods.withdraw().send({
                from:accounts[1]
            }));
            expectRevert(sale.methods.withdraw(accounts[0]).send({
                from:accounts[1]
            }));
        });

        it ('Right transfer', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("1000000000000000000")).send({
                from: owner
            });
            await sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000")
            });
            let balance_1 = await web3.eth.getBalance(sale.options.address);
            await sale.methods.withdraw().send({
                from: owner
            });
            let balance_2 = await web3.eth.getBalance(sale.options.address);
            expect(balance_1).to.be.equal('2000000000000000000');
            expect(balance_2).to.be.equal('0')
        });

        it ('Right transfer with address', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("1000000000000000000")).send({
                from: owner
            });
            await sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000")
            });
            let balance_1 = await web3.eth.getBalance(sale.options.address);
            await sale.methods.withdraw(accounts[1]).send({
                from: owner
            });
            let balance_2 = await web3.eth.getBalance(sale.options.address);
            expect(balance_1).to.be.equal('2000000000000000000');
            expect(balance_2).to.be.equal('0')
        });
    });
    describe('availableTokens', async () => {
        it('not whitelisted user', async () => {
            let res1 = await sale.methods.availablePersonal(accounts[1]).call({
                from: owner
            });
            let res2 = await sale.methods.availablePersonal(accounts[1]).call({
                from: accounts[1]
            });
            expect(res1).to.be.equal('0');
            expect(res2).to.be.equal('0');
        });
        it('whitelisted user', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            let res1 = await sale.methods.availablePersonal(owner).call({
                from: owner
            });
            expect(res1).to.be.equal("1000000000000000000000000");
        });
        it('available after buy', async () => {
            await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            expect(await sale.methods.availablePersonal(accounts[1]).call({
                from: owner
            })).to.be.equal("1000000000000000000000000");
            expect(await token.methods.balanceOf(accounts[1]).call()).to.be.equal("0");
            expect(await sale.methods.purchased(accounts[1],0).call()).to.be.equal("0");
            await sale.methods.buy().send({
                from: accounts[1],
                value: toHex("2000000000000000000")
            });
            expect(await sale.methods.purchased(accounts[1], 0).call()).to.be.equal("1000000000000000000");
            expect(await token.methods.balanceOf(accounts[1]).call()).to.be.equal("1000000000000000000");
            expect(await sale.methods.availablePersonal(accounts[1]).call({
                from: owner
            })).to.be.equal("999999000000000000000000");
        });
    });

    describe('buy function', async () => {
        it ('Revert buy() access', async () => {
            expectRevert(sale.methods.buy().send({
                from: owner
            }))
        });
        it ('Revert tokensAmount', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            expectRevert(sale.methods.buy().send({
                from: owner,
                value: 0
            }));
        });
        it ('Revert availableTokens', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            expectRevert(sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000")
            }));
        });
        it ('Revert personal restrictions', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("1000001000000000000000000")).send({
                from: owner
            });
            await sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000000000")
            });
            expect(await sale.methods.availablePersonal(owner).call({
                from: owner
            })).to.be.equal("0");
            expectRevert(sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000")
            }));
        });
        it ('Check Purchase event', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            let res = await sale.methods.buy().send({
                from: owner,
                value: toHex("2000000000000000000") // 2*1e18
            });
            expect(res.events['Purchase']['returnValues']['buyer']).to.be.equal(owner);
            expect(res.events['Purchase']['returnValues']['amount']).to.be.equal("1000000000000000000");

        });
        it ('Check return', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            let res = await sale.methods.buy().call({
                from: owner,
                value: toHex("2000000000000000000")
            });
            expect(res).to.be.equal("1000000000000000000");
        });
        it ('Check refund', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("1000000000000000000")).send({
                from: owner
            });
            await sale.methods.buy().send({
                from: owner,
                value: toHex("3000000000000000000")
            });
            let salebalance = await web3.eth.getBalance(sale.options.address);
            expect(salebalance).to.be.equal("2000000000000000000");
        });
        it ('Check correct token transfer', async () => {
            await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            await sale.methods.buy().send({
                from: accounts[1],
                value: toHex("20000000000000000000")
            });
            let res = await token.methods.balanceOf(accounts[1]).call();
            expect(res).to.be.equal('10000000000000000000')
        });
    });

    describe('fallback function', async () => {
        it ('Check fallback access', async () => {
            expectRevert(web3.eth.sendTransaction({to: sale.options.address, from: owner, value: '1000'}));
        });

        it ('Check fallback require', async () => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            expectRevert(web3.eth.sendTransaction({to: sale.options.address, from: owner, value: '1000', data: '0x01'}));
        });
        it ('Check buy function with 0 value', async() => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, 1000).send({
                from: owner
            });
            expectRevert(web3.eth.sendTransaction({to: sale.options.address, from: owner, value: '0'}));
        });
        it ('Check buy function with 0 tokens', async() => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            expectRevert(web3.eth.sendTransaction({to: sale.options.address, from: owner, value: '1000'}));
        });
        it ('Check buy function return', async() => {
            await whitelist.methods['0x0a3b0a4f'](owner).send({
                from: owner
            });
            await token.methods.transfer(sale.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            let res = await web3.eth.sendTransaction({to: sale.options.address, from: owner, value: "20000000000000000000"});
            expect(parseInt(res["logs"][0]["data"],16)).to.be.equal(parseInt('10000000000000000000',10));
        });
    });

    describe('futureRate function', async () => {
        it ('Time and rate change', async () => {
            await sale.methods.updateRate(10).send({
                from: owner
            });
            let res = await sale.methods.updateRate(100).send({
                from: owner
            });
            let rateBecomesValidAt = res.events['RateUpdate']['returnValues']['rateBecomesValidAt'];
            let time_1 = rateBecomesValidAt - 500;
            let time_2 = rateBecomesValidAt - (-500);
            await increaseTimeTo(time_1);
            let futureRate_1 = await sale.methods.futureRate().call();
            await increaseTimeTo(time_2);
            let futureRate_2 = await sale.methods.futureRate().call();
            expect(futureRate_1['0']).to.be.equal('100');
            expect(futureRate_2['0']).to.be.equal('100');
            expect(futureRate_1['1']).to.be.equal('500');
            expect(futureRate_2['1']).to.be.equal('0');
        });
    });
});