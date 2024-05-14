pragma solidity >=0.4.21;
library CuckooFilter {
  struct Filter {
    uint8[][] buckets;
    uint256 capacity;
    uint256 bucketSize;
    uint256 itemCount;
    uint256 maxKicks;
  }

  function initialize(Filter storage filter, uint256 capacity, uint256 bucketSize, uint256 maxKicks) internal {
    filter.capacity = capacity;
    filter.bucketSize = bucketSize;
    filter.itemCount = 0;
    filter.maxKicks = maxKicks;
    filter.buckets = new uint8[][](capacity);

    for (uint256 i = 0; i < capacity; i++) {
      filter.buckets[i] = new uint8[](bucketSize);
    }
  }

  function insert(Filter storage filter, bytes32 item) internal returns (bool) {
    require(filter.itemCount < filter.capacity* filter.bucketSize, "Filter is full");
    uint256 fingerprint = _fingerprint(item);
    uint256 index1 = _hash(item) % filter.capacity;
    uint256 index2 = _calculateIndex2(filter, index1, fingerprint);

    if (_insertIntoBucket(filter, index1, uint8(fingerprint)) || _insertIntoBucket(filter, index2, uint8(fingerprint))) {
      filter.itemCount++;
      return true;
    }

     for (uint256 k = 0; k < filter.maxKicks; k++) {
            uint256 randomIndex = index1 + (uint256(keccak256(abi.encodePacked(block.timestamp, k))) % (index2 - index1));
            uint8 tempFingerprint = filter.buckets[randomIndex][0];
            filter.buckets[randomIndex][0] = uint8(fingerprint);

            if (_insertIntoBucket(filter, _calculateIndex2(filter, randomIndex, tempFingerprint), tempFingerprint)) {
                filter.itemCount++;
                return true;
            }

            fingerprint = tempFingerprint;
    }

    return false;
  }

  function contains(Filter storage filter, bytes32 item) internal view returns (bool) {
    uint256 fingerprint = _fingerprint(item);
    uint256 index1 = _hash(item) % filter.capacity;
    uint256 index2 = _calculateIndex2(filter, index1, fingerprint);

    return _bucketContains(filter.buckets[index1], uint8(fingerprint)) || _bucketContains(filter.buckets[index2], uint8(fingerprint));
  }

  function remove(Filter storage filter, bytes32 item) internal returns (bool) {
    require(filter.itemCount > 0, "Filter is empty");
    uint256 fingerprint = _fingerprint(item);
    uint256 index1 = _hash(item) % filter.capacity;
    uint256 index2 = _calculateIndex2(filter, index1, fingerprint);

    if (_removeFromBucket(filter, index1, uint8(fingerprint)) || _removeFromBucket(filter, index2, uint8(fingerprint))) {
        filter.itemCount--;
        return true;
    }
    return false;
}

  function _fingerprint(bytes32 item) private pure returns (uint256) {
    return uint256(item) & 0xff;
  }

  function _hash(bytes32 item) private pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(item)));
  }

  function _insertIntoBucket(Filter storage filter, uint256 index, uint8 fingerprint) private returns (bool) {
    uint8[] storage bucket = filter.buckets[index];
    for (uint256 i = 0; i < filter.bucketSize; i++) {
      if (bucket[i] == 0) {
        bucket[i] = fingerprint;
        return true;
      }
    }
    return false;
  }

  function _bucketContains(uint8[] storage bucket, uint8 fingerprint) private view returns (bool) {
    for (uint256 i = 0; i < bucket.length; i++) {
      if (bucket[i] == fingerprint) {
        return true;
      }
    }
    return false;
  }

  function _calculateIndex2(Filter storage filter, uint256 index1, uint256 fingerprint) private view returns (uint256) {
    uint256 index2 = (index1 ^ _hash(bytes32(fingerprint))) % filter.capacity;
    return index2;
  }

  function _removeFromBucket(Filter storage filter, uint256 index, uint8 fingerprint) private returns (bool) {
    uint8[] storage bucket = filter.buckets[index];
    for (uint256 i = 0; i < filter.bucketSize; i++) {
        if (bucket[i] == fingerprint) {
            bucket[i] = 0; // Set the bucket value to default, simulating removal
            return true;
        }
    }
    return false;
}


}