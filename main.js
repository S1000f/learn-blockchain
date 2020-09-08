
class BlockHeader {
    constructor(version, index, previousHash, timestamp, merkleRoot) {
        this.version = version;
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.merkleRoot = merkleRoot;
    }
}

class Block {
    constructor(header, data) {
        this.header = header;
        this.data = data;
    }
}

function getBlockchain() {
    return blockchain;
}

function getLatestBlock() {
    return blockchain[blockchain.length - 1];
}

// 표준 암호화 알고리즘 라이브러리
const Crypto = require("crypto-js");

function calculateHash(version, index, previousHash, timestamp, merkleRoot) {
    return CryptoJS.SHA256(version + index + previousHash + timestamp + merkleRoot).toString().toUpperCase();
}

function calculateHashForBlock(block) {
    return calculateHash(
        block.header.version,
        block.header.index,
        block.header.previousHash,
        block.header.timestamp,
        block.header.merkleRoot
    );
}

// Genesis Block
const merkle = require("merkle");

// The Genesis Block
function getGenesisBlock() {
    const version = "1.0.0";
    const index = 0;
    const previousHash = '0'.repeat(64);
    const timestamp = 12310006505; // 1/3/2009 @ 6:15pm (UTC)
    const data = ["The time 03/Jan/2009 Chanellor on brink of second bailout for banks"];

    const merkleTree = merkle("sha256").sync(data);
    const merkleRoot = merkleTree.root() || '0'.repeat(64);

    const header = new BlockHeader(version, index, previousHash, timestamp, merkleRoot);
    return new Block(header, data);
}

var blockchain = [getGenesisBlock()];

function generateNextBlock(blockData) {
    const previousBlock = getLatestBlock();

    const currentVersion = getCurrentVersion();
    const nextIndex = previousBlock.header.index + 1;
    const previousHash = calculateHashForBlock(previousBlock);
    const nextTimestamp = getCurrentTimestamp();

    const merkleTree = merkle("sha256").sync(blockData);
    const merkleRoot = merkleTree.root() || '0'.repeat(64);
    const newBlockHeader = new BlockHeader(currentVersion, nextIndex, previousHash, nextTimestamp, merkleRoot);

    return new Block(newBlockHeader, blockData);
}

// 개별 블록을 검증
function isValidNewBlock(newBlock, previousBlock) {
    if (! isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;

    } else if (previousBlock.header.index + 1 !== newBlock.header.index) {
        console.log('Invalid previousHash');
        return false;

    } else if (calculateHashForBlock(previousBlock) !== newBlock.header.previousHash) {
        console.log('Invalid previousHash');
        return false;

    } else if (
        (newBlock.data.length !== 0 && (merkle("sha256").sync(newBlock.data).root() !== newBlock.header.merkleRoot)) ||
        (newBlock.data.length === 0 && ('0'.repeat(64) !== newBlock.header.merkleRoot))
        ) {
            console.log('Invalid merkleRoot');
            return false;
        }
    return true;

}

// 블록의 구조를 검증
function isValidBlockStructure(block) {
    return typeof(block.header.version) === 'string' 
    && typeof(block.header.index) === 'number'
    && typeof(block.header.previousHash) === 'string'
    && typeof(block.header.timestamp) === 'number'
    && typeof(block.header.merkleRoot) === 'string'
    && typeof(block.data) === 'object';
}

// 블록체인을 검증
function isValidChain(blockchainToValidate) {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
}

function addBlock(newBlock) {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);

        return true;
    }
    return true;
}

