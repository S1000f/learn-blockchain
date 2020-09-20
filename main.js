
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
const CryptoJS = require("crypto-js");

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

const fs = require("fs");
function getCurrentVersion() {
    const packageJson = fs.readFileSync("./package.json");
    return JSON.parse(packageJson).version;
}

function getCurrentTimestamp() {
    return Math.round(new Date().getTime() / 1000);
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

function mineBlock(blockData) {
    const newBlock = generateNextBlock(blockData);
    if (addBlock(blockData)) {
        broadcast(responseLatestMsg());
        return newBlock;
    } else {
        return null;
    }
}

// Chapter 2
const http_port = process.env.HTTP_PORT || 3001;

const express = require("express");
const bodyParser = require("body-parser");

function initHttpServer() {
    const app = express();
    app.use(bodyParser.json());

    app.get("/blocks", function (req, res) {
        res.send(getBlockchain());
    })
    app.post("/mineBlock", function (req, res) {
        const data = req.body.data || [];
        const newBlock = mineBlock(data);
        if (newBlock === null) {
            res.status(400).send('Bad Request');
        } else {
            res.send(newBlock);
        }
    })
    app.get("/version", function (req, res) {
        res.send(getCurrentVersion());
    })
    app.post("/stop", function (req, res) {
        res.send({ "msg": "stopping server"});
        process.exit();
    })
    app.get("/peers", function (req, res) {
        res.send(getSockets().map(function (s) {
            return s._socket.remoteAddress + ":" + s._socket.remotePort;
        }))
    })
    app.post("/addPeers", function (req, res) {
        const peers = req.body.peers || [];
        connectToPeers(peers);
        res.send();
    })

    app.listen(http_port, function () {
        console.log("Listening http port on : " + http_port)
    })
}
initHttpServer();

const p2p_port = process.env.P2P_PORT || 6001;
const WebSocket = require("ws");

function initP2PServer() {
    const server = new WebSocket.Server({
        port: p2p_port
    });
    server.on("connection", function (ws) {
        initConnection(ws);
    })
    console.log("Listening websocket p2p port on: " + p2p_port);
}
initP2PServer();

function connectToPeers(newPeers) {
    newPeers.forEach(function (peer) {
        const ws = new WebSocket(peer);
        ws.on("open", function () {
            initConnection(ws);
        });
        ws.on("error", function () {
            console.log("Connection faild...");
        })
    })
}

var sockets = [];

function getSockets() {
    return sockets;
}

function initConnection(ws) {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
}

function write(ws, message) {
    ws.send(JSON.stringify(message));
}

function broadcast(message) {
    sockets.forEach(function (socket) {
        write(socket, message);
    })
}

const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

function initMessageHandler(ws) {
    ws.on("message", function (data) {
        const message = JSON.parse(data);

        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
        }
    })
}

function queryAllMsg() {
    return ({
        "type": MessageType.QUERY_ALL,
        "data": null
    });
}

function queryChainLengthMsg() {
    return ({
        "type": MessageType.QUERY_LATEST,
        "data": null
    });
}

function responseChainMsg() {
    return ({
        "type": MessageType.RESPONSE_BLOCKCHAIN,
        "data": JSON.stringify(getBlockchain())
    });
}

function responseLatestMsg() {
    return ({
        "type": MessageType.RESPONSE_BLOCKCHAIN,
        "data": JSON.stringify([getLatestBlock()])
    });
}

function handleBlockchainResponse(message) {
    const receiveBlocks = JSON.parse(message.data);
    const latestBlockReceived = receiveBlocks[receiveBlocks.length - 1];
    const latestBlockHeld = getLatestBlock();

    if (latestBlockReceived.header.index > latestBlockHeld.header.index) {
        console.log(
            "Blockchain possibly behind." +
            "We got: " + latestBlockHeld.header.index + ", " +
            "Peer got: " + latestBlockReceived.header.index
        );
        if (calculateHashForBlock(latestBlockHeld) === latestBlockReceived.header.previousHash) {
            // in this case, the received block refers the latest block of my ledger
            console.log("We can append the received block to our chain...");
            if (addBlock(latestBlockReceived)) {
                broadcast(responseLatestMsg());
            }
        } else if (receiveBlocks.length === 1) {
            // in this case, need to reorganize chain
            console.log("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        } else {
            // replace chain
            console.log("The received block is longer than current blockchain...");
            replaceChain(receiveBlocks);
        }
    } else {
        console.log("the received block is not longer than current blockchain. Do nothing...");
    }
}

function initErrorHandler(ws) {
    ws.on("close", function () {
        closeConnection(ws);
    })
    ws.on("error", function () {
        closeConnection(ws);
    })
}

function closeConnection(ws) {
    console.log("connection failed to peer: " + ws.url);
    sockets.splice(sockets.indexOf(ws), 1);
}

const random = require("random");

function replaceChain(newBlock) {
    if (
        isValidChain(newBlock) &&
        (newBlock.length > blockchain.length || (newBlock.length === blockchain.length) && random.boolean())
    ) {
        console.log("the received blockchain is valid. Replacing current blockchain with the received one...");
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    } else {
        console.log("invalid blockchain received...")
    }
}











