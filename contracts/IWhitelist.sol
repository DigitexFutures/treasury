pragma solidity 0.5.4;


interface IWhitelist {
    function approved(address user) external view returns (bool);
}
