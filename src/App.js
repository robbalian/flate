import logo from './logo.svg';
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
      connectSigner();
    }

    if (rpcProvider) {
      getContract(rpcProvider);
      getPublicBalances();
      if (signedProvider) {
        getUserBalances();
        getTokenInfo();
      }
    }
  }, [rpcProvider, tokenContract, signedProvider]);

  async function connectProvider() {
    console.log("connecting to rpcProvider");
    let ethersProvider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
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
    return parseFloat(ethers.utils.formatUnits(bn).toString()).toFixed(4);
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
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Total Supply: {data.totalSupply != null ? formatEth(data.totalSupply) : 'loading'} OneCoin
        </p>
        <p>
          OneCoin Treasury Balance: {data.oneCoinTreasuryBalance != null ? formatEth(data.oneCoinTreasuryBalance) : 'loading'} ETH
        </p>
        <p>
          My Balances: <p />
          Someone's eth balance: {data.ethBalance != null ? formatEth(data.ethBalance) : 'loading'} ETH<p />
          {data.myEthBalance != null ? formatEth(data.myEthBalance) : 'loading'} ETH<p />
          {data.myONEBalance != null ? formatEth(data.myONEBalance) : 'loading'} ONE
        </p>
        <button
          className='btn-gradient-border btn'
          onClick ={!signedProvider ? connectSigner : disconnectSigner} >
        {!signedProvider ? 'Connect' : 'Disconnect' }
        </button>
        {mintButton()}
        
      </header>
    </div>
  );
}

export default App;
