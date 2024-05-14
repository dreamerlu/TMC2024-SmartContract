const chai = require('chai')
const EC = require('elliptic').ec;
const BigNumber = web3.BigNumber
chai.use(require('chai-bignumber')(BigNumber)).should()
const AKA=artifacts.require('MainContract')
const fs = require('fs');

//addr2-4:TA, addr5:RSU, addr6-:Vehicle
contract.only('MainContract', ([addr1,addr2,addr3,addr4,...addr]) => {
  let proto
  const testNumber=100;
  //for recording data
  let results = [];
  const path = './result/timerecord-tokenReg.json';
  let params=[
    [100,2,5]
  ];
  context('Test for gas fee', async () => {
    //for (let i=0;i<params.length;i++) {
      describe(`Starting iteration`,async()=>{
        before('Deploy library', async () => {
          // bloomFilter = await BloomFilter.new()
          //delete the latency.json if exists, i.e., adapt for storing
          /* if (i==0 && fs.existsSync(path)) {
            fs.unlinkSync(path);
          } */
          proto=await AKA.new();
          let addresses=[]
          
          const accounts = await web3.eth.getAccounts();
          for (let i=1;i<4;i++) {
            addresses.push(accounts[i]);
          }
          const tx = await proto.initiate(addresses,params[0][0],params[0][1],params[0][2],{from:addr1});
          const event = tx.logs[0];
          assert.equal(event.event, "InitializedEvent");
        })

        describe('Test main protocol functions', async () => {
          it('should register a vehicle', async () => {
            let addrArray=[];
            for (let i =0;i<1;i++) {
              let account = web3.eth.accounts.create();
              addrArray.push(account.address)
            }
            for (let i=0;i<1;i++) {
              let start=process.hrtime.bigint();
              if (i==0) {
                await proto.registerVehicle(addr[0],{from:addr2});
              } else {
                await proto.registerVehicle(addrArray[i],{from:addr2});
              }
              let end=process.hrtime.bigint();
              //results.push(Number(end-start)/1e6);
            }
          })

          it('test the delay of token regisration function',async()=> {
            //test the token regisration function
            //generate the random token
            let tokenArray=[];
            for (let i=0;i<testNumber;i++) {
              const ec = new EC('secp256k1');
              const keyPair = ec.genKeyPair();
              const publicKey = keyPair.getPublic();
              const xaxis=publicKey.getX();
              const xaxisString = xaxis.toString(16); 
              const xaxisBytes32 = web3.eth.abi.encodeParameter('bytes32', '0x' + xaxisString.padStart(64, '0'));
              let tripleElements=[];
              tripleElements[0]=web3.utils.sha3('some transaction'+i);
              tripleElements[1]=web3.utils.sha3('signature'+i);
              tripleElements[2]=xaxisBytes32;
              tokenArray[i]=tripleElements;
            }
            //test token regisration function
            
            for (let i=0;i<testNumber;i++) {
              let startTime = process.hrtime.bigint();
              await proto.tokenAggregate(tokenArray[i][0],tokenArray[i][1],tokenArray[i][2],true,{from:addr2});
              let endTime = process.hrtime.bigint();
              results.push(Number(endTime-startTime)/1e6);
            }
          })
    
        })

        after('Store the result', async()=> {
          let json;
          if (!fs.existsSync(path)) {
            // If the file does not exist, create a new file with default JSON data
            json = [];
            fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
          } else {
            fs.unlinkSync(path);
            json = [];
            fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
          }
          // Read data from file
          let data = fs.readFileSync(path, 'utf8');
          
          // Parse the JSON data
          json = JSON.parse(data);
          
          json.push(results);
          
          // Write the updated data back to the file
          fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
          
          
          
      })



      })
    //}
    

  })
})
