const BloomFilter = artifacts.require('./BloomFilter.sol')
const AKA=artifacts.require('./MainContract.sol')

module.exports = function (deployer,network,accounts) {
  // deployer.deploy(BloomFilter)
 deployer.deploy(AKA)
}
