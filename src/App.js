//import logo from '/flatecoin.png';
import './App.css';
//import useWeb3Modal from './hooks/useWeb3Modal.js';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import React, {useState, useEffect } from 'react';
import WalletConnectProvider from "@walletconnect/web3-provider";
import tokenJSON from './Token.json';

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      97: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    },
    network: 'binance_testnet',
  }
};

function App() {
  const [signedProvider, setSignedProvider] = useState(undefined);
  const [rpcProvider, setRpcProvider] = useState(undefined);
  const [tokenContract, setTokenContract] = useState(undefined);
  const [data, setData] = useState({});
  const [web3Modal, setWeb3Modal] = useState(undefined);
 
  async function disconnectSigner() {
    setSignedProvider(undefined);
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
  }

  async function getContract(provider) {
    if (tokenContract) return;
    let contract = new ethers.Contract(tokenJSON.address, tokenJSON.abi, provider);
    setTokenContract(contract);
  }

  function cachedSignerExists() {
    // Get the cached provider from LocalStorage
    const cachedSignerName = JSON.parse(localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER"));
    
    console.log("Cached signedProvider exists? %s", cachedSignerName != undefined)
    // Get the connector for the cachedProviderName
    return cachedSignerName != undefined;
}

async function connectSigner() {
      console.log("connecting to signedProvider");
      let p = await web3Modal.connect();
      let s =  new ethers.providers.Web3Provider(p);
      let accounts = await s.listAccounts();
      console.log(accounts);
      setSignedProvider(s);
}

async function getWeb3Modal() {
  const _web3Modal = new Web3Modal({
    cacheProvider: true, // optional
    providerOptions // required
  });
  setWeb3Modal(_web3Modal);
}

  useEffect(() => {
    if (!web3Modal) getWeb3Modal();

    if (!rpcProvider) connectProvider();
    if (!signedProvider && web3Modal && cachedSignerExists()) {
      //connectSigner();
    }

    if (tokenContract) getTokenInfo();

    if (rpcProvider) {
      getContract(rpcProvider);
      getPublicBalances();
      if (signedProvider) {
        //getUserBalances();
      }
    }
  }, [rpcProvider, tokenContract, signedProvider]);

  async function connectProvider() {
    console.log("connecting to rpcProvider");
    let ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8545");//'https://bsc-dataseed.binance.org/');
    //let ethersProvider = ethers.getDefaultProvider();
    setRpcProvider(ethersProvider);
  }

  async function getTokenInfo() {
    let supply = await tokenContract.totalSupply();
    
    console.log(ethers.utils.formatUnits(supply).toString());
    //const newData = {...data, totalSupply: supply};

    setData(prevData => ({...prevData, totalSupply:supply, tokenContract:tokenContract}));
  }

  async function getPublicBalances() {
    console.log("getting public balances");
    const ethBalance = await rpcProvider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    const oneCoinTreasuryBalance = await rpcProvider.getBalance(tokenJSON.address);
    setData(prevData => ({...prevData, 
      ethBalance: ethBalance,
      oneCoinTreasuryBalance: oneCoinTreasuryBalance}));
  }

  async function getUserBalances() {
    console.log("getting user balances");
    let accounts = await signedProvider.listAccounts();
    const myEthBalance = await signedProvider.getBalance(accounts[0]);
    const myONEBalance = await tokenContract.balanceOf(accounts[0]);
    setData(prevData => ({...prevData,    
      myEthBalance: myEthBalance, 
      myONEBalance: myONEBalance,
    }));
  }

  function formatEth(bn) {
    return parseFloat(ethers.utils.formatUnits(bn).toString()).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:6});
  }

  async function mint(num) {
    console.log("mint here. %s tokens", num);
    let tokenContractWithSigner = await tokenContract.connect(signedProvider.getSigner());

    let tx = await tokenContractWithSigner.buyCoins({value: ethers.utils.parseEther(num.toString())});
    let receipt = await tx.wait();
    console.log(receipt);
  }

  function mintButton() {
    return signedProvider ? (
      <button
        className='btn-gradient-border btn'
        onClick ={() => {
          mint(.001); 
        }}
          >
          Mint 1 ETH worth of OneCoin
      </button>
    ) : null;
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={process.env.PUBLIC_URL + '/flatecoin.png'} className="App-logo" alt="logo" />
        <h1 className='text-gradient'>Welcome to Inflation Coin</h1>
        <p>
          Inflation Coin is an experiment. We start with a single coin in circulation, and every day each coins splits into 2!
        </p>
        
        <p>
          Total Supply: {data.totalSupply != null ? formatEth(data.totalSupply) : 'loading'} FLATE
        </p>
        <button className="btn btn-gradient-border"
          onClick={(e) => window.open('https://poocoin.app/tokens/'+tokenJSON.address, '_blank')} > 
          See the Price
        </button>
        <button 
          className="btn btn-gradient-border"
          onClick={(e) => window.open('https://pancakeswap.finance/swap?outputCurrency='+tokenJSON.address, '_blank')}>
            Invest in ONE
        </button>
        
      </header>
    </div>
  );
}

export default App;
