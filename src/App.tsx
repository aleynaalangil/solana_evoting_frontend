import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
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
    // const customClusterEndpoint = "https://127.0.0.1:8899";
    const endpoint = customClusterEndpoint;
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
    // const wallet = provider.wallet as anchor.Wallet;


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
        const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const program = new Program(idl as TokenContract, provider);
        const tx = new anchor.web3.Transaction();
        const ATA_PROGRAM_ID = new anchor.web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');



        try {
            // const [tokenMint] = await PublicKey.findProgramAddressSync(
            //     [utils.bytes.utf8.encode("token-2022-token"), anchorWallet.publicKey.toBuffer(), new TextEncoder().encode(nftName)],
            //     program.programId
            // );
            const [tokenMint] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from('token-2022-token'), anchorWallet.publicKey.toBytes(), Buffer.from(nftName)],
                program.programId,
            );
            const [treasury] = await anchor.web3.PublicKey.findProgramAddressSync(
                [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), tokenMint.toBytes()],
                ATA_PROGRAM_ID,
            );
            const [companyAccount] = await PublicKey.findProgramAddressSync(
                [Buffer.from("company"), anchorWallet.publicKey.toBytes()],
                program.programId
            );
            console.log("company account", companyAccount);
            const [payerATA] = anchor.web3.PublicKey.findProgramAddressSync(
                [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), tokenMint.toBytes()],
                ATA_PROGRAM_ID,
            );
            console.log("payer ata ", payerATA);
            console.log("token mint", tokenMint.toBase58());
            console.log("company name", nftName);

            const symbolArray = Array.from(nftDescription).map(char => char.charCodeAt(0)).slice(0, 5);
            console.log(symbolArray.toString());

            const ix = await program.methods
                .createToken(nftName)
                .accounts({
                    signer: anchorWallet.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .instruction();
            tx.add(ix)
            // .transaction()

            // anchorWallet.signTransaction(ix);

            const ix1 = await program.methods
                .createAssociatedTokenAccount()
                .accounts({
                    // @ts-ignore
                    tokenAccount: payerATA,
                    mint: tokenMint,
                    signer: anchorWallet.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .instruction();
            tx.add(ix1);
            // .transaction()

            // anchorWallet.signTransaction(ix1);

            const ix2 = await program.methods
                .mintToken(new anchor.BN(totalSupply))
                .accounts({
                    mint: tokenMint,
                    signer: anchorWallet.publicKey,
                    receiver: treasury,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .instruction();

            tx.add(ix2);
            // .transaction()

            // anchorWallet.signTransaction(ix2);

            const ix0 = await program.methods.initializeCompany(nftName, symbolArray, new BN(totalSupply), tokenMint, treasury)
                .accounts({
                    company: companyAccount,
                    payer: anchorWallet.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .instruction();
            // console.log("company: ", ix0.data.BYTES_PER_ELEMENT)
            tx.add(ix0);
            // .transaction()

            // anchorWallet.signTransaction(ix0);
            

            console.log('Transaction created');

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.lastValidBlockHeight = lastValidBlockHeight;
            tx.feePayer = anchorWallet.publicKey;
            console.log('Transaction prepared with blockhash:', blockhash);

            let transactionSignature: string;

            try {
                const serializedTransaction = tx.serialize({
                    requireAllSignatures: false,
                });
                const base64 = serializedTransaction.toString("base64");
                console.log("Serialized Transaction (base64):", base64);


                const sig = await anchorWallet?.signTransaction(tx);
                // const sig = await anchorWallet.signAllTransactions(
                //     [
                //         ix,
                //         ix0,
                //         ix1, 
                //         ix2
                //     ]
                // )
                const ac1 = await program.account.company.all();
                console.log("company", ac1) 
                // Simulate the transaction
                // const simulationResult = await connection.simulateTransaction(tx);
                // console.log("Simulation result:", simulationResult.value.returnData?.dat);


                console.log('Transaction confirmed with signature:', sig);
                try {
                    const accounts = await program.account.company.fetchMultiple(
                        [companyAccount, tokenMint, treasury]
                    );
                    console.log("Accounts fetched: ", accounts);
                } catch (error) {
                    console.error("Error fetching accounts: ", error);
                }



                // alert(`Company Created! Mint: ${tokenMint.toBase58()}, Transaction signature: ${transactionSignature?.signature?.toString()}`);

                postMessage(
                    `LET'S GOOO:"https://solana.fm/tx/${sig}?cluster=devnet`
                );

                

            } catch (error) {
                console.error("Transaction failed", error);
            }

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
