require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonicRopsten = "oxygen crunch note tent verify chicken gossip shield essence runway clinic fortune";
var infuraLinkRopsten = "https://ropsten.infura.io/v3/198f519e2d9643d689649459edccc350";
var deployerAddressRopsten = "0x6d92a2d06758E014Da0C98d0bBBE9Ed78E964f34";
var addressIndex = 1; // address index in MetaMask
// the following parameters should be changed prior to deploy

var mnemonicMainnet = "";
var infuraLinkMainnet = "";
var gasprice = 10000000000; //10 gwei
var deployerAddressMainnet = "";

module.exports = {
    networks: {
        development: {
            host: "localhost",
            network_id: "*",
            port: 8545,
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
            gas: 0xfffffffffff, // <-- Use this high gas value
            gasPrice: 0x01      // <-- Use this low gas price
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider(mnemonicRopsten, infuraLinkRopsten, addressIndex);
            },
            network_id: 3,
            from: deployerAddressRopsten.toLowerCase(),
        },
        mainnet: {
            provider: function() {
                return new HDWalletProvider(mnemonicMainnet, infuraLinkMainnet);
            },
            network_id: 1,
            gasPrice: gasprice,
            gas: 3000000,
            from: deployerAddressMainnet.toLowerCase(),
        },
    },
    compilers: {
        solc: {
          version: "0.5.4",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          }
        }
      }
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
};
