const chai = require('chai');
const dirtyChai = require('dirty-chai');
const solc = require('solc');

var Whitelist = artifacts.require("./Whitelist.sol");

import expectRevert from './helpers/expectRevert';

contract('Whitelist', function() {

    var owner;
    var whitelist;
    var ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    var accounts;

    beforeEach(async function(){
        accounts = await web3.eth.getAccounts();
        owner = accounts[0];
        whitelist = await new web3.eth.Contract(Whitelist._json.abi).deploy({
            data: Whitelist._json.bytecode,
        }).send({
            from: owner,
            gas: 6721974,
            gasPrice: 20000000000
        });
    });

    describe('Construction', async () => {
        it('Check owner', async () => {
            let contractOwner = await whitelist.methods.owner().call();
            expect(contractOwner).to.be.equal(owner);
        });
    });

    describe('Add admin', async () => {
        it('Check access', async () => {
            expectRevert(whitelist.methods.addAdmin(accounts[1]).send({
                from: accounts[1]
            }));
        });

        it('Check admin address', async () => {
            let res1 = await whitelist.methods.addAdmin(accounts[1]).send({
                from: owner,
            });
            let res2 = await whitelist.methods.addAdmin(accounts[1]).send({
                from: owner
            });
            expect(res2["gasUsed"]).to.be.below(res1["gasUsed"]);
        });

        it('Check add admin address', async () => {
            expect(await whitelist.methods.admins(accounts[1]).call()).to.be.equal(false);
            await whitelist.methods.addAdmin(accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.admins(accounts[1]).call()).to.be.equal(true);
        });
    });

    describe('Remove admin', async () => {
        it('Check access', async () => {
            expectRevert(whitelist.methods.removeAdmin(accounts[1]).send({
                from: accounts[1]
            }));
        });

        it('Remove address', async () => {
            await whitelist.methods.addAdmin(accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.admins(accounts[1]).call()).to.be.equal(true);
            await whitelist.methods.removeAdmin(accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.admins(accounts[1]).call()).to.be.equal(false);
        });

        it('Check not admin address', async () => {
            await whitelist.methods.addAdmin(accounts[1]).send({
                from: owner
            });
            let res1 = await whitelist.methods.removeAdmin(accounts[1]).send({
                from: owner
            });
            let res2 = await whitelist.methods.removeAdmin(accounts[1]).send({
                from: owner
            });

            expect(res1["gasUsed"]).to.be.below(res2["gasUsed"]);
        });
    });

    describe('Add user', async () => {
        it('Check access', async () => {
            expectRevert(whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: accounts[1]
            }));
            expectRevert(whitelist.methods['0xc4c1c94f']([accounts[1],accounts[2]]).send({
                from: accounts[1]
            }));
        });
        it('Check already whitelisted address/addresses', async () => {
            let res1 = await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner,
            });
            let res2 = await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });
            let res3 = await whitelist.methods['0xc4c1c94f']([accounts[3],accounts[2]]).send({
                from: owner
            });
            let res4 = await whitelist.methods['0xc4c1c94f']([accounts[3],accounts[2]]).send({
                from: owner
            });
            expect(res2["gasUsed"]).to.be.below(res1["gasUsed"]);
            expect(res4["gasUsed"]).to.be.below(res3["gasUsed"]);
        });

        it('Check add address', async () => {
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(false);
            await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(true);
        });

        it('Check add address[]', async () => {
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(false);
            expect(await whitelist.methods.approved(accounts[2]).call()).to.be.equal(false);
            await whitelist.methods['0xc4c1c94f']([accounts[1],accounts[2]]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(true);
            expect(await whitelist.methods.approved(accounts[2]).call()).to.be.equal(true);
        });
    });

    describe('Remove user', async () => {
        it('Check access', async () => {
            expectRevert(whitelist.methods['0x29092d0e'](accounts[1]).send({
                from: accounts[1]
            }));
            expectRevert(whitelist.methods['0x5e4ba17c']([accounts[1],accounts[2]]).send({
                from: accounts[1]
            }));
        });
        it('Remove address', async () => {
            await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(true);
            await whitelist.methods['0x29092d0e'](accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(false);
        });
        it('Remove address[]', async () => {
            await whitelist.methods['0xc4c1c94f']([accounts[1],accounts[2]]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(true);
            expect(await whitelist.methods.approved(accounts[2]).call()).to.be.equal(true);
            await whitelist.methods['0x5e4ba17c']([accounts[1],accounts[2]]).send({
                from: owner
            });
            expect(await whitelist.methods.approved(accounts[1]).call()).to.be.equal(false);
            expect(await whitelist.methods.approved(accounts[2]).call()).to.be.equal(false);
        });
        it('Check already not whitelisted address/addresses', async () => {
            await whitelist.methods['0x0a3b0a4f'](accounts[1]).send({
                from: owner
            });            
            let res1 = await whitelist.methods['0x29092d0e'](accounts[1]).send({
                from: owner
            });            
            let res2 = await whitelist.methods['0x29092d0e'](accounts[1]).send({
                from: owner
            });
            await whitelist.methods['0xc4c1c94f']([accounts[3],accounts[2]]).send({
                from: owner
            });
            let res3 = await whitelist.methods['0x5e4ba17c']([accounts[3],accounts[2]]).send({
                from: owner
            });
            let res4 = await whitelist.methods['0x5e4ba17c']([accounts[3],accounts[2]]).send({
                from: owner
            });
            expect(res1["gasUsed"]).to.be.below(res2["gasUsed"]);
            expect(res3["gasUsed"]).to.be.below(res4["gasUsed"]);           
        });
    });

    describe('Transfer ownership', async () => {
        it('Check incorrect address', async () => {
            expectRevert(whitelist.methods.transferOwnership(ZERO_ADDRESS).send({
                from: owner
            }));
        });

        it('Checking event', async () => {
            let res = await whitelist.methods.transferOwnership(accounts[1]).send({
                from: owner
            });
            expect(res.events['OwnershipTransferred']).to.exist;
            expect(res.events['OwnershipTransferred']['returnValues']['previousOwner']).to.be.equal(owner);
            expect(res.events['OwnershipTransferred']['returnValues']['newOwner']).to.be.equal(accounts[1]);
        });

        it('Checking transferOwnership', async () =>{
            expect(await whitelist.methods.owner().call()).to.equal(accounts[0]);
            await whitelist.methods.transferOwnership(accounts[1]).send({
                from: owner
            });
            expect(await whitelist.methods.owner().call()).to.equal(accounts[1]);
        });

        it('Check not owner', async () => {
            expectRevert(whitelist.methods.transferOwnership(accounts[2]).send({
                from: accounts[1]
            }));
        });
    });
})