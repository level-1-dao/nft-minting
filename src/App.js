
import { ethers } from 'ethers';
import { useState, useEffect } from "react";

//ABIs
import Level1Completion from './build/Level1Completion.json';
import RelayHub from './build/RelayHub.json';


//GSN provider

import { RelayProvider } from '@opengsn/provider/dist/RelayProvider';


//Address

import level1CompletionDeployed from './deployedContractAddresses/Level1Completion.json';

import relayHubDeployed from './localGSNbuilds/RelayHub.json';

import './App.css';



function App() {
  const [relayProvider, setRelayProvider] = useState('');
  const [oneTimeAccount, setOneTimeAccount] = useState()


  //txn results
  const [proofOfTxn, setProofOfTxn]= useState()
  const [userSubmittedAddress, setUserSubmittedAddress] = useState('');
  const [poapTokenID, setPAOPTokenID] = useState(0);
  const [poapTokenURI, setPAOPTokenURI] = useState('');
  const [balanceUpdated, setBalanceUpdated] = useState(false)

  //Paymaster

  const [paymasterBalance, setPaymasterBalance]= useState(0);
  const [whitelistPMAddress, setWhitelistPMAddress] = useState();

  //contract Objects

  const [relayHubContractSign, setRelayHubContractSign] = useState()

  const [Level1CompletionContractEphemeral, setLevel1CompletionContractEphemeral] = useState()


  //error msg
  const [errorMessage, setErrorMessage]= useState('');


  const paymasterArtifact = require('./build/WhitelistPaymaster.json')


  //set provider and WhiteListPaymaster addresss

  useEffect(()=> {

    if (window.ethereum) {
        initContract()
        .then(result => console.log(result, "result"))
        .catch(error => console.log(error, "error"))

        console.log("ethereum is here")
      } else {
        console.log("ethereum not found")
      }

      async function initContract() {

        const networkId = await window.ethereum.request({method: 'net_version'})

        //for local paymaster
        //const paymasterAddress = require('./localGSNbuilds/Paymaster.json').address

        const whiteListPaymasterAddress = paymasterArtifact.networks[networkId].address;
        setWhitelistPMAddress(whiteListPaymasterAddress);

        //using metamask as a provider for now. window.ethereum will change to whatever provider the app is using
        const gsnProvider = await RelayProvider.newProvider({
          provider: window.ethereum,
          config: {
              paymasterAddress : whiteListPaymasterAddress
          }
        }).init()

        const relayedProvider =  new ethers.providers.Web3Provider(gsnProvider)
        setRelayProvider(relayedProvider) 


        //create one time account
        const uniqueOneTimeAccount = gsnProvider.newAccount()
        setOneTimeAccount(uniqueOneTimeAccount)

  

        
      }

    },[paymasterArtifact.networks])


    //create Contract Instances
    useEffect(()=> {

      if (relayProvider && oneTimeAccount) {
        createContractObjects()
      }

      async function createContractObjects() {

        //create new instance of relayHub for owner use

        const regularProvider =  new ethers.providers.Web3Provider(window.ethereum);
        const relayContractSign = await new ethers.Contract(relayHubDeployed.address, RelayHub.abi, regularProvider.getSigner(0));
        setRelayHubContractSign(relayContractSign);

        //create new instance of Level1Completion contract
        const Level1CompletionAddress = level1CompletionDeployed.address;
        const Level1CompletionContract = await new ethers.Contract(Level1CompletionAddress, Level1Completion.abi, relayProvider.getSigner());

        //let onetimeAccount connect to contract
        const ephemeralContract = Level1CompletionContract.connect(relayProvider.getSigner(oneTimeAccount.address))

        setLevel1CompletionContractEphemeral(ephemeralContract)

      }  
  
      },[relayProvider, oneTimeAccount])


      //balance listener

      useEffect(()=> {

        if ((whitelistPMAddress && relayHubContractSign) || balanceUpdated) {
          updateBalance()
        }
  
        async function updateBalance() {

          const balance = await relayHubContractSign.balanceOf(whitelistPMAddress)
          const formattedBalance = ethers.utils.formatEther(balance)

          setPaymasterBalance(formattedBalance)
          setBalanceUpdated(false)

        }  
    
        },[whitelistPMAddress, relayHubContractSign, balanceUpdated])


       

  
  //Level1Completiion Contract Function

  async function awardPOAP() {
    if (ethers.utils.isAddress(userSubmittedAddress)) {

      setErrorMessage('')

      Level1CompletionContractEphemeral.awardCertificate(userSubmittedAddress, 'https://random.imagecdn.app/500/150')
        .then((result) => {
          console.log(result, "award result") 
          setProofOfTxn(result)
        })
        .then(setUserSubmittedAddress(''))
        .then(async() => {

          const newTokenID = (await Level1CompletionContractEphemeral.tokenOfOwnerByIndex(userSubmittedAddress, 0)).toNumber()
          const newTokenURI = await Level1CompletionContractEphemeral.tokenURI(newTokenID);
          setPAOPTokenID(newTokenID)
          setPAOPTokenURI(newTokenURI)

          console.log(userSubmittedAddress, "userSubmittedAddress", newTokenID, "newTokenID", newTokenURI, "RELEVANT TXN RESULTS RESULTS")

        })
        .catch((error)=> {
          console.log(error, "award error")
          setErrorMessage(error.data.message)
        })

    } else{
        setErrorMessage('Please enter a valid address')
    }
    
  }

  //Paymaster Component


  const RefillPaymaster = () => {
    //need to be on deploying account to send
    const [amount, setAmount]= useState(0);
    const [amountMessage, setAmountMessage] = useState('');

    useEffect(()=> {
      setAmountMessage('')
      setAmount(0)
      },[])
    
    async function deposit () {
      if (amount > 0){
      await relayHubContractSign.depositFor(whitelistPMAddress, {value: amount.toString()})
        .then((result) => {
          relayProvider.waitForTransaction(result.hash)
          .then((result) => {
            if (result) {
              setBalanceUpdated(true);
              
            }
          })
        })
        .catch(err => console.log(err, 'refill error'))
        } else {
          setAmountMessage('enter an amount greater than zero')
        }
  }


 

  return (
    
    <div style={{width: '60%'}}>

      <button onClick={deposit}  style={{fontSize: '30px', width: '60%'}} > Send to Paymaster</button>
      {amountMessage ?
      <p>{amountMessage}</p>
      : null}  

      <input 
      name="refillPaymaster" 
      type="text" 
      placeholder='enter amount to send to paymaster'
      onChange={(e) => setAmount(e.target.value)} 
      value={amount || ''}
      style={{width: '70%', fontSize: '20px', marginTop: '10px', textAlign: 'center'}} />
      
       

    </div>


  )

  }

  
  return (
    <div className="App">
      <header className="App-header"> 

       

        <p>refresh the page for repeat transactions</p>
        <br />
        <button className='txnbutton' style={{fontSize: '40px', width: '50%'}} onClick={awardPOAP}>Award Level 1 POAP</button> 

            <input 
              name="userAddress" 
              type="text" 
              placeholder='enter learner address here'
              onChange={(e) => setUserSubmittedAddress(e.target.value)} 
              value={userSubmittedAddress || ''}
              style={{width: '60%', fontSize: '20px', marginTop: '50px', textAlign: 'center'}} />

         { proofOfTxn ?
          <p style={{color : 'white', fontSize: '30px'}}>Proof Of Txn: {proofOfTxn.hash}</p> :
          null
        }

        { poapTokenID ?
          <p style={{color : 'white'}}>New Token ID: {poapTokenID}</p> :
          null
        }

        { poapTokenURI ?
            <>
              <p style={{color : 'white'}}>Token Image:</p>
              <img src={poapTokenURI} alt={"poap token img"} />
            </>
           :
          null
        }

   
        {errorMessage}

        <hr style={{color: 'white', width: '80%'}} />

        <h2>Paymaster Interaction</h2>

        <p>Current Balance of Paymaster is: {paymasterBalance} eth</p>

        <RefillPaymaster />

      </header>
    </div>
  );
}


export default App;

