const chai = require('chai')
const EC = require('elliptic').ec;
const BigNumber = web3.BigNumber
chai.use(require('chai-bignumber')(BigNumber)).should()
const AKA=artifacts.require('MainContract')
const fs = require('fs');
const numberOfTransactions = 10;

//addr2-4:TA, addr5:RSU, addr6-:Vehicle
contract.only('MainContract', ([addr1,addr2,addr3,addr4,...addr]) => {
  let proto;
  //for recording data
  let results = {};
  const path = './result/latency.json';
  let params=[];
  for (let i=0;i<50;i++) {
    const temp=[100+5*i,2,5]
    params.push(temp)
  }
  /* let params=[
    [128,2,5],[144,2,5],[160,2,5]
  ]; */

  
  context('Test', () => {
      for (let i=0;i<params.length;i++) {
        describe(`Starting ${i}-th iteration`,async()=>{
          before('Deploy library', async () => {
            //delete the latency.json if exists, i.e., adapt for storing
            if (i==0 && fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
            // bloomFilter = await BloomFilter.new()
            proto=await AKA.new();
            console.log('Smart contract has been deployed!')
            let addresses=[]
          
            const accounts = await web3.eth.getAccounts();
            for (let i=1;i<4;i++) {
              addresses.push(accounts[i]);
            }
            const tx = await proto.initiate(addresses,params[i][0],params[i][1],params[i][2],{from:addr1});
            results={};
            results['Capacity']=params[i][0];
            results['BucketSize']=params[i][1];
            results['MaxKicks']=params[i][2];
            const event = tx.logs[0];
            assert.equal(event.event, "InitializedEvent");
          })
    
          describe(`Performance Test: ${params[i][0]}`, async()=> {
            let startTime, endTime,latency;
            const testNumber=20;
            //the following codes test the throughput of main functions
            it('test the delay of vehicle registration function',async()=> {
              //test the vehicle regisration function
              //generate the random address
              let addrArray=[];
              for (let i =0;i<testNumber;i++) {
                let account = web3.eth.accounts.create();
                addrArray.push(account.address)
              }
              //test vehicle regisration function
              startTime = Date.now();
              for (let i =0;i<testNumber;i++) {
                if (i==0) {
                  await proto.registerVehicle(addr[0],{from:addr2});
                } else {
                  await proto.registerVehicle(addrArray[i],{from:addr2});
                }
              }
              endTime = Date.now();
              latency = endTime - startTime;
              console.log(`Vehicle Regisration Transaction Latency: ${latency/testNumber} ms`);
              results['VehRegDelay'] = latency/testNumber;
            })
      
            it('test the delay of pk regisration function', async()=> {
              //generate the random public key
              let pkArray=[];
              for (let i=0;i<testNumber;i++) {
                let pk=web3.utils.sha3('public key'+i);
                pkArray.push(pk);
              }
              //test pk regisration function
              startTime = Date.now();
              for (let i=0;i<testNumber;i++) {
                await proto.pkRegister(addr2,[pkArray[i]],{from:addr[0]});
              }
              endTime = Date.now();
              latency = endTime - startTime;
              console.log(`Public Key Regisration Transaction Latency: ${latency/testNumber} ms`);
              results['PkRegDelay'] = latency/testNumber;
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
              startTime = Date.now();
              for (let i=0;i<testNumber;i++) {
                await proto.tokenAggregate(tokenArray[i][0],tokenArray[i][1],tokenArray[i][2],true,{from:addr2})
              }
              endTime = Date.now();
              latency = endTime - startTime;
              console.log(`Token Regisration Transaction Latency: ${latency/testNumber} ms`);
              results['TokenRegDelay'] = latency/testNumber;
            })
      
            it('test the vehicle revocation function',async()=> {
              startTime = Date.now();
              for (let i=0;i<testNumber;i++) {
                await proto.deletepk(web3.utils.sha3('public key'+i),{from:addr2});
              }
              endTime = Date.now();
              latency = endTime - startTime;
              console.log(`Vehicle Revocation Transaction Latency: ${latency/testNumber} ms`);
              results['VehRevDelay'] = latency/testNumber;
            })
    
            it('should has the correct output',async()=> {
              const res=await proto.getStateInfo();
              console.log("info: "+res[0].toNumber()+","+res[1].toNumber());
            })
            
          })
    
          after('Store the result', async()=> {
            // fs.appendFileSync(`./result/latency.json`, JSON.stringify(results, null, 2), 'utf8');
            if (!fs.existsSync(path)) {
              fs.writeFileSync(path, JSON.stringify([], null, 2), 'utf8');
            }
            let data = fs.readFileSync(path, 'utf8');
            let json = JSON.parse(data);
            json.push(results);
            fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
            // 暂停5秒的功能
            await new Promise(resolve => setTimeout(resolve, 5000));
        })
        })
      }
  })  

})
