const chai = require('chai');
const dirtyChai = require('dirty-chai');
const solc = require('solc');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const { latestTime } = require('./helpers/latestTime');
const {toHex} = web3.utils;
const ethUtil = require('ethereumjs-util');

var Treasury = artifacts.require("./Treasury.sol");
var Sale = artifacts.require("./Sale.sol");
var Whitelist = artifacts.require("./Whitelist.sol");

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

contract('Treasury', function() {

    var phaseNum = "0";
    var phases = ["1551448800","1559397600","1567346400","1575208800","1583071200","1591020000","1598968800","1606831200","1614607200","1622556000"];
    var SINGLE_RELEASE_AMOUNT = "10000000000000000000000000";
    var ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    var token;
    var treasury;
    var sale;
    var whitelist;
    var owner;
    var accounts;

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
        it("Check correct addresses", async () => {
            expectRevert(
                new web3.eth.Contract(Treasury._json.abi).deploy({
                    data: Treasury._json.bytecode,
                    arguments: [ZERO_ADDRESS, ZERO_ADDRESS]
                }).send({
                    from: owner,
                    gas: 6721974,
                    gasPrice: 20000000000
                }));
        });
    });

    describe('Check initial values', async () => {
        it("Initial 10 phases timestamps", async function(){
            expect(await treasury.methods.phases(0).call()).to.be.equal(phases[0]);
            expect(await treasury.methods.phases(1).call()).to.be.equal(phases[1]);
            expect(await treasury.methods.phases(2).call()).to.be.equal(phases[2]);
            expect(await treasury.methods.phases(3).call()).to.be.equal(phases[3]);
            expect(await treasury.methods.phases(4).call()).to.be.equal(phases[4]);
            expect(await treasury.methods.phases(5).call()).to.be.equal(phases[5]);
            expect(await treasury.methods.phases(6).call()).to.be.equal(phases[6]);
            expect(await treasury.methods.phases(7).call()).to.be.equal(phases[7]);
            expect(await treasury.methods.phases(8).call()).to.be.equal(phases[8]);
            expect(await treasury.methods.phases(9).call()).to.be.equal(phases[9]);
        });

        it("Initial phaseNum", async function(){
            let treasuryInitialPhaseNum = await treasury.methods.phaseNum().call();
            expect(treasuryInitialPhaseNum).to.be.equal(phaseNum);
        });

        it('Check initialization for "token"', async function() {
            expect(await treasury.methods.token().call()).to.be.equal(token.options.address);
        });

        it('Check initialization for "sale"', async function() {
            expect(await treasury.methods.sale().call()).to.be.equal(sale.options.address);
        })
    });
    describe('Test startNewPhase function first phase', async () => {
        it('Check that first phase will not start before the first phase start date', async () => {
            await token.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            increaseTimeTo(1551448700);
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));
        
        });
    });
    describe('TokenFallback fuction', async () => {
        it ('Successfully accept DGTX', async () => {
            await token.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
        });

        it("Revert transaction from not token address", async () => {
            var otherToken = await deployToken(owner);
            await expectRevert(
                otherToken.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                    from: owner
                })
            );
        });
        it("Revert transaction with wrong value", async () => {
            await expectRevert(token.methods.transfer(treasury.options.address, toHex("10000000000000000000000000")).send({
                from: owner
                }));
        });
        it("Revert transaction with wrong phase", async () => {
            increaseTimeTo(1551448800);
            await token.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });
            await treasury.methods.startNewPhase().send({
                from:owner
            });
            await expectRevert(token.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            }));
        });
    });
 
    describe('Test startNewPhase function', async () => {

        it ('Check startNewPhase process', async () => {
            await token.methods.transfer(treasury.options.address, toHex("100000000000000000000000000")).send({
                from: owner
            });

            //Phase 1 start
            //increaseTimeTo(1551448800);
            let res1 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("90000000000000000000000000");
            expect(res1.events.PhaseStarted).to.exist;
            expect(res1.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('1');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 2 start
            increaseTimeTo(1559397600);
            let res2 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("80000000000000000000000000");
            expect(res2.events.PhaseStarted).to.exist;
            expect(res2.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('2');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 3 start
            increaseTimeTo(1567346400);
            let res3 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("70000000000000000000000000");
            expect(res3.events.PhaseStarted).to.exist;
            expect(res3.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('3');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 4 start
            increaseTimeTo(1575208800);
            let res4 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("60000000000000000000000000");
            expect(res4.events.PhaseStarted).to.exist;
            expect(res4.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('4');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 5 start
            increaseTimeTo(1583071200);
            let res5 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("50000000000000000000000000");
            expect(res5.events.PhaseStarted).to.exist;
            expect(res5.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('5');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 6 start
            increaseTimeTo(1591020000);
            let res6 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("40000000000000000000000000");
            expect(res6.events.PhaseStarted).to.exist;
            expect(res6.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('6');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 7 start
            increaseTimeTo(1598968800);
            let res7 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("30000000000000000000000000");
            expect(res7.events.PhaseStarted).to.exist;
            expect(res7.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('7');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 8 start
            increaseTimeTo(1606831200);
            let res8 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("20000000000000000000000000");
            expect(res8.events.PhaseStarted).to.exist;
            expect(res8.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('8');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 9 start
            increaseTimeTo(1614607200);
            let res9 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("10000000000000000000000000");
            expect(res9.events.PhaseStarted).to.exist;
            expect(res9.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('9');
            await expectRevert(treasury.methods.startNewPhase().send({from: owner}));

            //Phase 10 start
            increaseTimeTo(1622556000);
            let res10 = await treasury.methods.startNewPhase().send({
                    from: owner
            });
            expect(await token.methods.balanceOf(treasury.options.address).call()).to.be.equal("0");
            expect(res10.events.PhaseStarted).to.exist;
            expect(res10.events.PhaseStarted.returnValues.newPhaseNum).to.be.equal('10');

        });
    });

});