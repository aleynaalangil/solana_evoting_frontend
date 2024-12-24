import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import { Program, AnchorProvider, web3, utils } from '@coral-xyz/anchor';
import logo from './solana.png';
import React from 'react';
import  idl  from './idls/token_contract.json';
import { TokenContract } from './types/token_contract';
import {BN} from 'bn.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
require('@solana/wallet-adapter-react-ui/styles.css');
require('./App.css');

const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const customClusterEndpoint = "https://127.0.0.1:8899";
    const endpoint = customClusterEndpoint;
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {
    const wallet = useAnchorWallet();
    const [nftName, setNftName] = useState('');
    const [nftDescription, setNftDescription] = useState('');
    const [totalSupply, setTotalSupply] = useState('');

    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    // const onMintNFT = useCallback(async () => {
    //     if (!anchorWallet) return;
    //     const connection = new Connection("https://127.0.0.1:8899", 'confirmed');
    //     const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    //     const program = new Program(idl as TokenContract, provider);

    //     try {
    //       const [tokenMint] = await PublicKey.findProgramAddressSync(
    //         [utils.bytes.utf8.encode("token-2022-token"), anchorWallet.publicKey.toBuffer(), new TextEncoder().encode(nftName)],
    //         program.programId
    //     );
    //     console.log(tokenMint.toBase58());
    //     console.log(nftName);
    //         const symbolArray = Array.from(nftDescription).map(char => char.charCodeAt(0)).slice(0, 5);
    //         console.log(symbolArray.toString());
    //         await program.methods.initializeCompany(nftName, symbolArray, new BN(totalSupply), tokenMint).rpc();
    //         alert("NFT minted successfully");
    //     } catch (error) {
    //         console.error("Error minting NFT:", error);
    //         alert("Error minting NFT: " + (error as Error).message);
    //     }
    // }, [anchorWallet, nftName, nftDescription, totalSupply]);
    const onMintNFT = useCallback(async () => {
      if (!anchorWallet) return;
      const connection = new Connection("https://127.0.0.1:8899", 'confirmed');
      const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
      const program = new Program(idl as TokenContract, provider);
  
      try {
          const [tokenMint] = await PublicKey.findProgramAddressSync(
              [utils.bytes.utf8.encode("token-2022-token"), anchorWallet.publicKey.toBuffer(), new TextEncoder().encode(nftName)],
              program.programId
          );
          const [voteAccount] = await PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("vote-account"), anchorWallet.publicKey.toBuffer()],
            program.programId
        );
        const [companyAccount] = await PublicKey.findProgramAddressSync(
          [utils.bytes.utf8.encode("company"), anchorWallet.publicKey.toBuffer()],
          program.programId
      );
          console.log(tokenMint.toBase58());
          console.log(nftName);
  
          const symbolArray = Array.from(nftDescription).map(char => char.charCodeAt(0)).slice(0, 5);
          console.log(symbolArray.toString());
  
          await program.methods.initializeCompany(nftName, symbolArray, new BN(totalSupply), tokenMint)
          .accounts({
            company: companyAccount, // Ensure this is defined and correct
            tokenMint: tokenMint,
            voteAccount: voteAccount, // Ensure this is defined and correct
            payer: anchorWallet.publicKey,
            // systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_2022_PROGRAM_ID, // Ensure this is defined and correct
            tokenContract: program.programId,          
          })
          .signers([wallet?.publicKey])
          .rpc();
          
          alert("Company created successfully");
      } catch (error) {
          console.error("Error creating company:", error);
          alert("Error creating company: " + (error as Error).message);
      }
  }, [anchorWallet, nftName, nftDescription, totalSupply]);

    return (
        <div className="App">
            <header className="title-header">
                Solana E-Voting Platform
            </header>
            <img src={logo} alt="Logo" className="logo" />
            <WalletMultiButton className="WalletMultiButton" />
            <div>
                <input type="text" placeholder="Company Name" value={nftName} onChange={(e) => setNftName(e.target.value)} />
                <input type="text" placeholder="Company Token Symbol" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} />
                <input type="text" placeholder="Total Supply" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} />
                <button onClick={onMintNFT} disabled={!wallet?.publicKey || !nftName || !nftDescription || !totalSupply}>
                    Create Company
                </button>
            </div>
        </div>
    );
};
