var ethUtil = require('ethereumjs-util');

const Sale = artifacts.require("./Sale.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Whitelist = artifacts.require("./Whitelist.sol");

/*
        THIS IS DEVELOPMENT NETWORK DEPLOYMENT SCRIPT
 *
        CHANGE price AND deployerAddress VARIABLES PRIOR TO MAINNET DEPLOY
 */



const DGTX = "0x1C83501478f1320977047008496DACBD60Bb15ef";
const price = 1000;

const getTxCount = account => new Promise((resolve, reject) => {
    web3.eth.getTransactionCount(account, (err, result) => {
        if (err) {
            return reject(err);
        }
        resolve(result);
    });
});

async function deployTreasury(deployer, accounts) {
    let deployerAddress = accounts[0];

    // find nonce for the following tx
    let currentNonce = await getTxCount(deployerAddress);

    // find address of contract Sale (nonce will be greater by 3)
    let addressOfSale = ethUtil.bufferToHex(ethUtil.generateAddress(
        deployerAddress,
        currentNonce + 2
    ));

    return deployer.deploy(Treasury, DGTX, addressOfSale, {from: deployerAddress});
}

async function deployWhitelist(deployer, accounts) {
    let deployerAddress = accounts[0];
    return deployer.deploy(Whitelist, {from: deployerAddress});
}

async function deploySale(deployer, accounts) {
    let deployerAddress = accounts[0];
    return deployer.deploy(Sale, DGTX, Whitelist.address, Treasury.address, price, {from: deployerAddress});
}

module.exports = function (deployer, network, accounts) {
    deployer.then(async () => {
        await deployTreasury(deployer, accounts);
        await deployWhitelist(deployer, accounts);
        await deploySale(deployer, accounts);
    });
};