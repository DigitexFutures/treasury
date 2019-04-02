# DGTX Treasury Sale

100M DGTX tokens are to be sold according to the following schedule:
- Split into ten phases 10M tokens each
- The first phase starts at 14.00 GMT, March 1, 2019 and then one every 3 months


## Solidity implementation
The whole system consists of three contracts:
- `Whitelist`
- `Treasury`
- `Sale`

### Whitelist contract
Because of KYC requirements, `Whitelist` contract was added. It holds a list of approved addresses. It provides functions to modify this list (called by address listed in `admins` mapping, only `owner` can modify `admins` mapping) and checks if an address is allowed to participate (available to everyone).

### Treasury contract
This contract holds tokens and releases them (sends to the `Sale` contract) according to the specified schedule: when new phase starts anyone can call this contract’s function and send 10M tokens to `Sale` contract.

### Sale contract
This is a simple `Ownable` contract that sells all DGTX tokens it possesses.
Anyone who passed KYC (address that is added to `Whitelist` contract) can buy tokens from this contract at the current rate. Rate is the amount of tokens that can be bought for ETH. Rate delimiter is 1000 (i.e. rate should be divided by 1000). The owner can update rate, though with some limitations to prevent front-running (like “new price become active in 15 minutes after update”). Current rate can be gained from `currentRate()` function call.

Minimum purchase amount is 1 DGTX, maximum amount per phase is 1 000 000 DGTX. Amount available for `addr` address for purchase in the current phase can be gained from `availablePersonal(addr)` function call.

## Whitelist maintenance
Users added to `admins` mapping of `Whitelist` contract will ask every approved investor for their Ethereum address and add it to `Whitelist` contract in order to restrict access for some investors.
