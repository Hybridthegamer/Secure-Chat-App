import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractData from "../contracts/contracts.json";

export const ROLE = { None: 0, Viewer: 1, Editor: 2, Admin: 3 };
export const ROLE_LABEL = { 0: "None", 1: "Viewer", 2: "Editor", 3: "Admin" };

const BlockchainContext = createContext(null);

export function BlockchainProvider({ children }) {
  const [provider,    setProvider]    = useState(null);
  const [signer,      setSigner]      = useState(null);
  const [account,     setAccount]     = useState(null);
  const [userRole,    setUserRole]    = useState(ROLE.None);
  const [username,    setUsername]    = useState("");
  const [uacContract, setUac]         = useState(null);
  const [crContract,  setCr]          = useState(null);
  const [isConnected, setConnected]   = useState(false);
  const [isLoading,   setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [networkOk,   setNetworkOk]   = useState(false);

  const isDeployed = Boolean(contractData?.contracts?.UserAccessControl?.address);

  const loadProfile = useCallback(async (uac, addr) => {
    try {
      const profile = await uac.getProfile(addr);
      setUserRole(Number(profile.role));
      setUsername(profile.username || "");
    } catch {
      setUserRole(ROLE.None);
      setUsername("");
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask and configure it for localhost:8545 (Chain ID 31337).");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer   = await web3Provider.getSigner();
      const addr         = await web3Signer.getAddress();
      const network      = await web3Provider.getNetwork();

      if (Number(network.chainId) !== 31337) {
        setError("Wrong network. Please switch MetaMask to Hardhat Local (Chain ID 31337, RPC http://127.0.0.1:8545).");
        setLoading(false);
        return;
      }

      if (!isDeployed) {
        setError("Contracts not yet deployed. Run 'npm run deploy' in the blockchain/ directory first.");
        setLoading(false);
        return;
      }

      const uac = new ethers.Contract(
        contractData.contracts.UserAccessControl.address,
        contractData.contracts.UserAccessControl.abi,
        web3Signer
      );
      const cr = new ethers.Contract(
        contractData.contracts.ChatRoom.address,
        contractData.contracts.ChatRoom.abi,
        web3Signer
      );

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(addr);
      setUac(uac);
      setCr(cr);
      setConnected(true);
      setNetworkOk(true);
      await loadProfile(uac, addr);
    } catch (err) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  }, [isDeployed, loadProfile]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setUserRole(ROLE.None);
    setUsername("");
    setUac(null);
    setCr(null);
    setConnected(false);
    setNetworkOk(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnect();
      else connect();
    };
    const onChainChanged = () => { window.location.reload(); };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [connect, disconnect]);

  const value = {
    provider, signer, account, userRole, username,
    uacContract, crContract,
    isConnected, isLoading, error, networkOk, isDeployed,
    connect, disconnect, loadProfile,
    contractData,
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain() {
  const ctx = useContext(BlockchainContext);
  if (!ctx) throw new Error("useBlockchain must be used inside BlockchainProvider");
  return ctx;
}
