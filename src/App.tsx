import { ConnectionProvider, WalletProvider, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { Connection, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram } from '@solana/web3.js';
import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, web3, utils } from '@coral-xyz/anchor';
import logo from './solana.png';
import React from 'react';
import idl from './idls/token_contract.json';
import { TokenContract } from './types/token_contract';
import { BN } from 'bn.js';
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
    const customClusterEndpoint = "https://api.devnet.solana.com";
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

    const onMintNFT = useCallback(async () => {
        if (!anchorWallet) return;
        try {
          const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
          const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
          const program = new Program(idl as TokenContract, provider);
          const ATA_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

          console.log("anchorWallet.publicKey", anchorWallet.publicKey.toBase58());
      
        // seeds = [b"company", payer.key().as_ref()],
          const [companyAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from('company'),anchorWallet.publicKey.toBytes()],
            program.programId
          );

        // seeds = [b"token-2022-token", signer.key().as_ref(), token_name.as_bytes()],
          const [mint] = PublicKey.findProgramAddressSync(
            [Buffer.from('token-2022-token'), anchorWallet.publicKey.toBytes(), Buffer.from(nftName)],
            program.programId
          );

          const [payerATA] = anchor.web3.PublicKey.findProgramAddressSync(
            [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.toBytes()],
            ATA_PROGRAM_ID,
        );

        const [treasury] = await anchor.web3.PublicKey.findProgramAddressSync( // TODO:this can be wrong.. double check
            [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.toBytes()],
            ATA_PROGRAM_ID,
        );
      
          console.log('Company PDA:', companyAccount.toBase58());
      
          const tx = new web3.Transaction();
      
          const createTokenIx = await program.methods
            .createToken(nftName)
            .accounts({ 
                signer: anchorWallet.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .instruction();

            const createATAIx = await program.methods
            .createAssociatedTokenAccount()
            .accounts({ 
                // @ts-ignore
                tokenAccount: payerATA,
                mint: mint,
                signer: anchorWallet.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .instruction();

            const mintTokenIx = await program.methods
            .mintToken(new anchor.BN(totalSupply))
            .accounts({
                mint: mint,
                signer: anchorWallet.publicKey,
                receiver: treasury, //or payerATA???
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .instruction();

            const createCompanyIx = await program.methods.initializeCompany(
                nftName, 
                nftDescription, 
                new BN(totalSupply),
                mint, 
                treasury)
            .accounts({
                // @ts-ignore
                company: companyAccount,
                payer: anchorWallet.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .instruction();
      
          tx.add(createTokenIx);
          tx.add(createATAIx);
          tx.add(mintTokenIx);
          tx.add(createCompanyIx);
      
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = anchorWallet.publicKey;

          console.log(JSON.stringify(tx));

          
        // fetching the latest company account
        //   const accounts = await program.account.company.all();
        //   const lenght = accounts.length;
        //   console.log(accounts[lenght - 1].account.authority.toBase58());
        //   console.log(accounts[lenght - 1].account.name);
        //   console.log(accounts[lenght - 1].account.symbol);
        //   console.log(accounts[lenght - 1].account.totalSupply.toString());
        //   console.log(accounts[lenght - 1].account.tokenMint.toBase58());
        //   console.log(accounts[lenght - 1].account.treasury.toBase58());
        //   console.log(accounts[lenght - 1].account.shareholderCount.toString());

          const signedTx = await anchorWallet?.signTransaction(tx);
          const sig = await connection.sendRawTransaction(signedTx.serialize());
      
          console.log('Transaction Signature:', sig);
        } catch (error) {
          console.error('Error:', error);
        }
      }, [anchorWallet, nftName]);
    
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
