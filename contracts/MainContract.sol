pragma solidity >=0.4.21;
import "../contracts/CuckooFilter.sol";

contract MainContract {
    using CuckooFilter for CuckooFilter.Filter;
    CuckooFilter.Filter private filter;
    //deployer address
    address  DeAddr  = 0x326004f04dc7B41389922dca0D044bA67D08D40b;
    //valid ES Addresses
    mapping(address=>bool) public esAddrs;
    //valid vehicle addresses
    mapping(address=>mapping(address=>bool)) public vehs;
    //valid RSU addresses, i.e., ganache address 5
    // address RSUAddr = 0x8503f76209F854cc9F47119252B3aA6C2565ad9C;
    //token-related variables
    //store tokens for an AKA transaction
    struct Token {
        //pkx for x-axis, yflag for y-axis
        bytes32 sigma;
        bytes32 pkx;
        bool yflag;
    }
    mapping(bytes32=>mapping(uint256=>Token)) public tokens;
    //store the count of a specific AKA transaction
    mapping(bytes32=>uint8) public count;
    //the threshold
    uint8 constant THRESHOLD=1;
    //events
    event TokenAggregateEvent();
    event PKRevocationEvent();
    event InitializedEvent(address[]);

    /* constructor() public{
        filter.initialize(16, 2, 5);
    } */
    function initiate(address[] memory ESAddr, uint256 capacity, uint256 bucketSize, uint256 maxKicks) public {
        require(msg.sender==DeAddr);
        for(uint index=0;index < ESAddr.length;index++) {
            address addr=ESAddr[index];
            esAddrs[addr]=true;
        }
        filter.initialize(capacity, bucketSize, maxKicks);
        emit InitializedEvent(ESAddr);
    }

    function checkESAddr(address esAddr) public view  returns(bool) {
        if (esAddrs[esAddr]==true) {
            return true;
        } else {
            return false;
        }
    }
        
    //function for cuckoo filters
    function insert(bytes32 item) public returns (bool) {
        bool result=filter.insert(item);
        return result;
    }

    function contains(bytes32 item) public view returns (bool) {
        return filter.contains(item);
    }

    function deletepk(bytes32 item) public{
        require(esAddrs[msg.sender]==true);
        filter.remove(item);
        emit PKRevocationEvent();
    }

    function registerVehicle(address vehAddr) public returns (bool) {
        require(esAddrs[msg.sender]==true);
        if (vehs[msg.sender][vehAddr]==true) {
            return false;
        } else {
            vehs[msg.sender][vehAddr]=true;
            return true;
        }
    }

    function isVehRegistered(address ESAddr, address vehAddr) public view returns (bool) {
        return vehs[ESAddr][vehAddr];
    }

    function pkRegister(address ESaddr, bytes32[] memory pkList) public returns(bool) {
        require(vehs[ESaddr][msg.sender]==true);
        for(uint index=0;index<pkList.length;index++) {
            filter.insert(pkList[index]);
        }
        return true;
    }

    function pkVerify(bytes32[] memory pkList) public view returns(bool) {
        for(uint index=0;index<pkList.length;index++) {
            if (filter.contains(pkList[index]) == false) {
                return false;
            }
        }
        return true;
    }

    function tokenAggregate(bytes32 transhash, bytes32 sigma, bytes32 pkx, bool pky) public{
        require(esAddrs[msg.sender]==true);
        uint8 ctr=count[transhash];
        tokens[transhash][ctr]=Token(sigma,pkx,pky);
        count[transhash]=ctr+1;
        emit TokenAggregateEvent();
    }

    function validateTokens(bytes32 transhash) public view returns (bool) {
        uint8 tokensCount = count[transhash];
        if (tokensCount >= THRESHOLD) {
            return true;
        } else {
            return false;
        }
    }

    function getStateInfo() public view returns(uint256,uint256) {
        return (filter.capacity,filter.bucketSize);
    }

}