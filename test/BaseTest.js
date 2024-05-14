const chai = require('chai')
const EC = require('elliptic').ec;
const BigNumber = web3.BigNumber
chai.use(require('chai-bignumber')(BigNumber)).should()
const AKA=artifacts.require('MainContract')
const fs = require('fs');

//addr2-4:TA, addr5:RSU, addr6-:Vehicle
contract.only('MainContract', ([addr1,addr2,addr3,addr4,...addr]) => {
  let proto
  //for recording data
  let results = {};
  const path = './result/gasfee.json';
  let params=[
    [16,2,5],[32,2,5],[48,2,5],[64,2,5],[80,2,5],[96,2,5],[112,2,5],[128,2,5],[144,2,5],[160,2,5],
    [16,4,5],[32,4,5],[48,4,5],[64,4,5],[80,4,5],[96,4,5],[112,4,5],[128,4,5],[144,4,5],[160,4,5],
    [16,6,5],[32,6,5],[48,6,5],[64,6,5],[80,6,5],[96,6,5],[112,6,5],[128,6,5],[144,6,5],[160,6,5]
  ];
  let escount=[2,3,4,5,6,7,8,9,10]
  context('Test for gas fee', async () => {
    for (let i=0;i<params.length;i++) {
      describe(`Starting ${i}-th iteration`,async()=>{
        before('Deploy library', async () => {
          // bloomFilter = await BloomFilter.new()
          //delete the latency.json if exists, i.e., adapt for storing
          if (i==0 && fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
          proto=await AKA.new();
          let txReceipt = await web3.eth.getTransactionReceipt(proto.transactionHash);
          let deployGas = txReceipt.gasUsed;
          let addresses=[]
          
          const accounts = await web3.eth.getAccounts();
          for (let i=1;i<4;i++) {
            addresses.push(accounts[i]);
          }
          const tx = await proto.initiate(addresses,params[i][0],params[i][1],params[i][2],{from:addr1});
          const iniReceipt = await web3.eth.getTransactionReceipt(tx.tx);
          const initGas=iniReceipt.gasUsed;
          results={};
          results['Capacity']=params[i][0];
          results['BucketSize']=params[i][1];
          results['MaxKicks']=params[i][2];
          results['Gas4Deploy']=deployGas;
          results['Gas4Init']=initGas;
          const event = tx.logs[0];
          assert.equal(event.event, "InitializedEvent");
        })

        describe('Test main protocol functions', async () => {
          it('should register an item in the cuckoo filter', async () => {
            const tx = await proto.insert(web3.utils.sha3('pk0'));
            // Get transaction receipt to get gas used
            const receipt = await web3.eth.getTransactionReceipt(tx.tx);
            console.log("Gas used for insert: " + receipt.gasUsed);
          })
    
          it('should find an item in the cuckoo filter', async () => {
            const res=await proto.contains(web3.utils.sha3('pk0'));
            res.should.equal(true);
          })

          it('should test check', async () => {
            let res=await proto.checkESAddr(addr2);
            res.should.equal(true);
            res=await proto.checkESAddr(addr3);
            res.should.equal(true);
          })
    
          it("should register a vehicle", async ()=> {
            const tx=await proto.registerVehicle(addr[0],{from:addr2});
            const receipt = await web3.eth.getTransactionReceipt(tx.tx);
            console.log("Gas used for vehicle registration: " + receipt.gasUsed);
            const flag = await proto.isVehRegistered(addr2,addr[0]);
            flag.should.equal(true);
            results['Gas4VehReg']=receipt.gasUsed;
          })

          it("should register a vehicle(test for newversion)", async ()=> {
            let startTime = Date.now();
            const tx=await proto.registerVehicle(addr[0],{from:addr2});
            let txHash=tx.transactionHash;
            web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
              if (!err) {
                // 记录事务确认时间
                let endTime = Date.now();
                console.log('Vehicle Regisration Transaction delay:', endTime - startTime);
              }
            })
          })
    
          it('should register a PK by a registered vehicle', async()=>{
            //register three keys
            const numberOfPK=1;
            let pks=[]
            for (let i=1;i<numberOfPK+1;i++) {
              pks.push(web3.utils.sha3('pk'+i));
            }
            const tx= await proto.pkRegister(addr2,pks,{from:addr[0]});
            const receipt = await web3.eth.getTransactionReceipt(tx.tx);
            console.log("Gas used for PK registration: " + receipt.gasUsed);
            const flag= await proto.pkVerify(pks);
            flag.should.equal(true);
            results['Gas4PkReg']=receipt.gasUsed;
          })
    
          it('should register a token by a valid ES', async()=>{
            const ec = new EC('secp256k1');
            const keyPair = ec.genKeyPair();
            const publicKey = keyPair.getPublic();
            const xaxis=publicKey.getX();
            const xaxisString = xaxis.toString(16); 
            const xaxisBytes32 = web3.eth.abi.encodeParameter('bytes32', '0x' + xaxisString.padStart(64, '0'));
            const tx = await proto.tokenAggregate(web3.utils.sha3('some transaction'),
                              web3.utils.sha3('signature'),xaxisBytes32,true,{from:addr2});
            const receipt = await web3.eth.getTransactionReceipt(tx.tx);
            console.log("Gas used for token registration: " + receipt.gasUsed);
            //get event
            const event = tx.logs[0];
            assert.equal(event.event, "TokenAggregateEvent");
            results['Gas4TokenReg']=receipt.gasUsed;
          })
    
          it('should have sufficient tokens', async()=>{
            const res = await proto.validateTokens(web3.utils.sha3('some transaction'));
            res.should.equal(true);
          })
    
          it('should revoke a public key of a vehicle',async()=> {
            const tx = await proto.deletepk(web3.utils.sha3('pk1'),{from:addr2});
            const receipt = await web3.eth.getTransactionReceipt(tx.tx);
            console.log("Gas used for public key revocation: " + receipt.gasUsed);
            const event = tx.logs[0];
            assert.equal(event.event, "PKRevocationEvent");
            results['Gas4TokenRev']=receipt.gasUsed;
          })
    
          it('should has the correct output',async()=> {
            const res=await proto.getStateInfo();
            console.log("info: "+res[0].toNumber()+","+res[1].toNumber());
          })
        })

        after('Store the result', async()=> {
          if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify([], null, 2), 'utf8');
          }
          let data = fs.readFileSync(path, 'utf8');
          let json = JSON.parse(data);
          json.push(results);
          fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
      })



      })
    }
    

  })
})
