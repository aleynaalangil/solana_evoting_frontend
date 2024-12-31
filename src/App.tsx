import { ConnectionProvider, WalletProvider, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction
} from '@solana/web3.js';
import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import logo from './solana.png';
import React from 'react';
import idl from './idls/token_contract.json';
import idl2 from './idls/transfer_hook.json';
import { TransferHook } from './types/transfer_hook';
import { TokenContract } from './types/token_contract';
import { BN } from 'bn.js';
import {
    TOKEN_2022_PROGRAM_ID,
    ExtensionType,
    createInitializeMintInstruction,
    createInitializeTransferHookInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    createInitializePermanentDelegateInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createTransferCheckedWithTransferHookInstruction,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
    createInitializeInstruction,
} from "@solana/spl-token-metadata";
import { MintProvider, useMintContext } from './components/Mint';
require('@solana/wallet-adapter-react-ui/styles.css');
require('./App.css');

/* -------------------------------------------------------------------------- */
/*                               Main App Shell                               */
/* -------------------------------------------------------------------------- */
const App: FC = () => {
    const [currentPage, setCurrentPage] = useState('Company');

    return (
        <div className='App'>
            <Context>
                <MintProvider>
                    <Header setCurrentPage={setCurrentPage} />
                    {currentPage === 'Company' && <Company />}
                    {currentPage === 'Polls' && <Polls />}
                    {/* {currentPage === 'CompanyInfo' && <CompanyInfo />} */}
                    <CompanyInfo />

                </MintProvider>
            </Context>
        </div>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const customClusterEndpoint = "https://api.devnet.solana.com";
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={customClusterEndpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Header: FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    return (
        <header className="header">
            <img src={logo} alt="Logo" className="logo" />
            <nav>
                <button onClick={() => setCurrentPage('Polls')}>Polls</button>
                <button onClick={() => setCurrentPage('Company')}>Company</button>
                {/* <button onClick={() => setCurrentPage('CompanyInfo')}>CompanyInfo</button> */}
            </nav>
            <WalletMultiButton className="wallet-button" />
        </header>
    );
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/*                                   Polls                                    */
/* -------------------------------------------------------------------------- */

const Polls: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();
    const { mintPubkey } = useMintContext();
    const [pollPubkeyInput, setPollPubkeyInput] = useState('');
    const [mintPubkeyInput, setMintPubkeyInput] = useState('');



    // States
    const [poll, setPoll] = useState<PublicKey | null>(null);
    const [pollOptions, setPollOptions] = useState<string[]>([]);
    const [optionId, setOptionId] = useState('');

    // Derive an anchorWallet object if wallet is connected
    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    /* ---------------------------- Initialize a Poll ---------------------------- */
    const onInitPoll = useCallback(async (selectedOptions: string[]) => {
        if (!anchorWallet) return;

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            // If you do have to ensure the company or mint, you might call your "ensure" function here:
            // await ensureOnChainState();

            // Create the poll
            const pollKeypair = Keypair.generate();
            setPoll(pollKeypair.publicKey);

            const tx = new web3.Transaction();
            const initializePollInstruction = await tokenProgram.methods
                .initializePoll(selectedOptions)
                .accounts({
                    poll: pollKeypair.publicKey,
                    owner: anchorWallet.publicKey,
                })
                .signers([pollKeypair])
                .instruction();
            tx.add(initializePollInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            const sig = await sendTransaction(tx, connection, {
                signers: [pollKeypair]
            });
            console.log('Transaction Signature:', sig);

            await sleep(3000);

            const pollAccount = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
            const pollOptions = pollAccount.options;
            setPollOptions(pollOptions);

            console.log("Poll Options:", pollOptions);
        } catch (error) {
            console.error('Error creating poll:', error);
        }
    }, [anchorWallet]);

    /* ---------------------------------- Vote ---------------------------------- */
    const onVote = useCallback(async () => {
        if (!anchorWallet) return;
        // Start of Selection
        if (optionId === '') {
            console.log("Option ID is empty");
            return;
        }

        try {

            const pollPublicKey = new PublicKey(pollPubkeyInput);
            setPoll(pollPublicKey);
            const mintPublicKey = new PublicKey(mintPubkeyInput);

            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            // Possibly ensure mint/company is set here if relevant:
            // const { companyPda, mintPubkey } = await ensureOnChainState();

            const pollFetcher = await tokenProgram.account.poll.fetch(pollPublicKey);
            console.log("Poll Account:", pollFetcher);
            const pollOptionsFetched = pollFetcher.options;
            setPollOptions(pollOptionsFetched);

            if (pollOptionsFetched.length === 0) {
                console.log("No poll options available");
                return;
            }
            // Make sure the poll is not finished
            const pollAccount = await tokenProgram.account.poll.fetch(pollPublicKey);
            if (pollAccount.finished) {
                console.log("Poll is over");
                return;
            }

            const shareholders = await tokenProgram.account.shareholder.all();
            let shareholderPk: PublicKey | null = null;
            let shareholdersLength = shareholders.length;
            let totalVotes = 0;
            
            for (let i = 0; i < shareholdersLength; i++) {
                if (shareholders[i].account.owner.toBase58() === anchorWallet.publicKey.toBase58()) {
                    shareholderPk = shareholders[i].publicKey;
                }
                totalVotes += shareholders[i].account.votingPower;
            }
            if (!shareholderPk) {
                console.error("No shareholder account found for the current wallet.");
                return;
            }

            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mintPublicKey,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );
            const shareholderVotingPower = await connection.getTokenAccountBalance(destinationTokenAccount);

            // Create transaction
            const tx = new web3.Transaction();
            const voteIdx = parseInt(optionId, 10);
            if (isNaN(voteIdx)) {
                console.log("Invalid option ID");
                return;
            }
            const voteInstruction = await tokenProgram.methods
                .vote(new BN(voteIdx), anchorWallet.publicKey, new BN(shareholderVotingPower.value.uiAmount))
                .accounts({
                    poll: pollPublicKey,
                    shareholder: shareholderPk,//tek bir shareholder olduğu için calisiyor
                })
                .instruction();
            tx.add(voteInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            const signedTx = await anchorWallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            console.log('Transaction Signature:', sig);

            await sleep(2000);

            const pollAccountForFinishCheck = await tokenProgram.account.poll.fetch(pollPublicKey);
            let pollVotes = 0;
            let winnerOption = "";
            
            for( let i = 0; i < pollAccountForFinishCheck.options.length; i++) {
                pollVotes += pollAccountForFinishCheck.options[i].votes.toNumber();

            }
            let maxVotes = 0;
            for( let i = 0; i < pollAccountForFinishCheck.options.length; i++) {
                if(pollAccountForFinishCheck.options[i].votes.toNumber() > maxVotes) {
                    maxVotes = pollAccountForFinishCheck.options[i].votes.toNumber();
                    winnerOption = pollAccountForFinishCheck.options[i].label;
                }
            }
            console.log("Winner Option: " + winnerOption);
            if (pollVotes === totalVotes) {
                console.log("Poll is over");
                let maxVotes = 0;
                for( let i = 0; i < pollAccountForFinishCheck.options.length; i++) {
                    if(pollAccountForFinishCheck.options[i].votes.toNumber() > maxVotes) {
                        maxVotes = pollAccountForFinishCheck.options[i].votes.toNumber();
                        winnerOption = pollAccountForFinishCheck.options[i].label;
                    }
                }
                console.log("Winner Option: " + winnerOption + " with " + maxVotes + " votes in the client side");
                const tx2 = new web3.Transaction();
                const finishPollInstruction = await tokenProgram.methods
                    .finishPoll()
                    .accounts({
                        poll: pollPublicKey,
                    })
                    .instruction();
                tx2.add(finishPollInstruction);

                const voteTallyTX = await tokenProgram.methods
                .tallyVotes()
                .accounts({
                    poll: pollPublicKey,
                })
                .instruction();
                tx2.add(voteTallyTX);

                const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
                tx2.recentBlockhash = blockhash2;
                tx2.feePayer = anchorWallet.publicKey;
                const pollFinishedTX  = await anchorWallet.signTransaction(tx2);
                const pollFinishedSig = await connection.sendRawTransaction(pollFinishedTX.serialize());
                console.log("Poll Finished Sig:", pollFinishedSig);
                return;
            }

        } catch (error) {
            console.error('Error voting:', error);
        }
    }, [anchorWallet, poll, optionId, pollOptions]);

    /* ------------------------------- UI Render ------------------------------- */
    return (
        <div className="page">
            <h1>Polls</h1>
            <div className="card">
                <h2 className='card-title'>Create Poll</h2>
                <input
                    type="text"
                    placeholder="Enter poll options (Option1, Option2, ...)"
                    onChange={(e) => setPollOptions(e.target.value.split(',').map(opt => opt.trim()))}
                />
                <button
                    onClick={() => onInitPoll(pollOptions)}
                    disabled={!wallet?.publicKey || pollOptions.length < 2 || pollOptions.length > 4}
                >
                    Initialize Poll
                </button>
            </div>
            <div className="card">
                <h2 className='card-title'>Vote</h2>
                <input
                    type="text"
                    placeholder="Poll Account Address"
                    value={pollPubkeyInput}
                    onChange={(e) => setPollPubkeyInput(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Mint Address"
                    value={mintPubkeyInput}
                    onChange={(e) => setMintPubkeyInput(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Option Id"
                    value={optionId}
                    onChange={(e) => setOptionId(e.target.value)}
                />

                <button
                    onClick={onVote}
                    disabled={!wallet?.publicKey || optionId === '' || !pollPubkeyInput || !mintPubkeyInput}
                >
                    Submit Vote
                </button>
            </div>

        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                 Company                                    */
/* -------------------------------------------------------------------------- */

const Company: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();

    // States
    const [nftName, setNftName] = useState('');
    const [nftDescription, setNftDescription] = useState('');
    const [totalSupply, setTotalSupply] = useState('');
    const [companyAccount, setCompanyAccount] = useState<PublicKey | null>(null);

    const { mintPubkey, setMintPubkey } = useMintContext();
    const [mint, setMint] = useState<Keypair | null>(null);
    const [treasury, setTreasury] = useState<PublicKey | null>(null);

    const [shareholder, setShareholder] = useState<PublicKey | null>(null);
    const [shareholderVotingPower, setShareholderVotingPower] = useState('');
    const [shareholderDestinationTokenAccount, setShareholderDestinationTokenAccount] = useState<PublicKey | null>(null);
    const [shareholderPubkeys, setShareholderPubkeys] = useState<string[]>([]);

    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    const ensureOnChainState = useCallback(async () => {
        if (!anchorWallet) {
            return { companyPda: null, mintPubkey: null };
        }

        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const tokenProgram = new Program(idl as TokenContract, provider);

        let finalCompanyPda: PublicKey | null = companyAccount;
        let finalMintPubkey: PublicKey | null = mint?.publicKey ?? null;

        try {
            // If we do NOT have a company in state, try to fetch one
            if (!finalCompanyPda) {
                const [companyPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("company"), anchorWallet.publicKey.toBytes()],
                    tokenProgram.programId
                );
                const fetchedCompany = await tokenProgram.account.company.fetch(companyPda);

                console.log("Found an existing company on chain:", fetchedCompany);

                // Set them in React state if you wish
                setCompanyAccount(companyPda);
                setMint({
                    publicKey: fetchedCompany.tokenMint,
                    secretKey: new Uint8Array(),
                } as Keypair);
                setMintPubkey(fetchedCompany.tokenMint);

                // Also store local references so we can return them
                finalCompanyPda = companyPda;
                finalMintPubkey = fetchedCompany.tokenMint;
            }
        } catch (err) {
            console.log("No existing company PDA found:", err);
        }

        return {
            companyPda: finalCompanyPda,
            mintPubkey: finalMintPubkey,
        };
    }, [anchorWallet, companyAccount, mint]);
    /* ---------------------------------------------------------------------- */
    /* onInitializeCompany - Create a new company if it doesn't exist already */
    /* ---------------------------------------------------------------------- */
    const onInitializeCompany = useCallback(async () => {
        if (!anchorWallet) return;

        // 1) Ensure we haven't already got a company or minted token on chain
        await ensureOnChainState();

        // 2) If we STILL don't have a company or mint, create them
        if (companyAccount && mint) {
            console.log("Company or Mint is already set, skipping creation.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            // Derive company PDA
            const [companyPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('company'), anchorWallet.publicKey.toBytes()],
                tokenProgram.programId
            );
            setCompanyAccount(companyPda);

            // Create a brand new Keypair for the mint
            const mintKeypair = Keypair.generate();
            setMint(mintKeypair);

            // Derive treasury ATA
            const treasuryPda = await getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            setTreasury(treasuryPda);

            // Prepare the instructions for initializing the mint (with Transfer Hook, etc.)
            const extensions = [ExtensionType.TransferHook, ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate];
            const mintLen = getMintLen(extensions);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

            const bnTotalSupply = BigInt(totalSupply || "0") * BigInt(Math.pow(10, 9));
            if (bnTotalSupply === BigInt(0)) {
                console.log("Total supply is 0 or invalid.");
                return;
            }

            // 1) Create the Mint account
            const createMintTx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: anchorWallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                SystemProgram.transfer({
                    fromPubkey: anchorWallet.publicKey,
                    toPubkey: mintKeypair.publicKey,
                    lamports: lamports
                })
            );
            // sign & send
            const createSig = await sendTransaction(createMintTx, connection, { signers: [mintKeypair] });
            console.log("Create Mint Tx Sig:", createSig);

            // 2) Initialize instructions in a second transaction
            const initTx = new Transaction().add(
                createInitializeTransferHookInstruction(
                    mintKeypair.publicKey,
                    anchorWallet.publicKey,
                    transferHookProgram.programId,
                    TOKEN_2022_PROGRAM_ID,
                ),
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,
                    anchorWallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializePermanentDelegateInstruction(
                    mintKeypair.publicKey,
                    anchorWallet.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9,
                    anchorWallet.publicKey,
                    null,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    metadata: mintKeypair.publicKey,
                    updateAuthority: anchorWallet.publicKey,
                    mint: mintKeypair.publicKey,
                    mintAuthority: anchorWallet.publicKey,
                    name: nftName,
                    symbol: nftDescription,
                    uri: "https://example.com/metadata.json",
                })
            );

            // Add "initializeExtraAccountMetaList" from Transfer Hook
            const extraMetaIx = await transferHookProgram.methods
                .initializeExtraAccountMetaList()
                .accounts({
                    mint: mintKeypair.publicKey,
                })
                .instruction();
            initTx.add(extraMetaIx);

            // Add "initializeCompany" from your Token Program
            const createCompanyIx = await tokenProgram.methods
                .initializeCompany(
                    nftName,
                    nftDescription,
                    new BN(totalSupply),
                    mintKeypair.publicKey,
                    treasuryPda
                )
                .accounts({
                    // @ts-ignore
                    company: companyPda,
                    payer: anchorWallet.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();
            initTx.add(createCompanyIx);

            // sign & send
            let { blockhash } = await connection.getLatestBlockhash();
            initTx.recentBlockhash = blockhash;
            initTx.feePayer = anchorWallet.publicKey;

            const signedTx = await anchorWallet.signTransaction(initTx);
            const initSig2 = await connection.sendRawTransaction(signedTx.serialize());
            console.log("Init Tx Sig:", initSig2);

            // 3) Create treasury ATA + Mint tokens
            const finalTx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    anchorWallet.publicKey,
                    treasuryPda,
                    anchorWallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,
                    treasuryPda,
                    anchorWallet.publicKey,
                    new BN(bnTotalSupply),
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );
            let { blockhash: finalBlockhash } = await connection.getLatestBlockhash();
            finalTx.recentBlockhash = finalBlockhash;
            finalTx.feePayer = anchorWallet.publicKey;

            const signedTx2 = await anchorWallet.signTransaction(finalTx);
            const mintSig = await connection.sendRawTransaction(signedTx2.serialize());
            console.log("Mint Tx Sig:", mintSig);

        } catch (err) {
            console.error("Error creating company:", err);
        }
    }, [
        anchorWallet,
        nftName,
        nftDescription,
        totalSupply,
        companyAccount,
        mint,
        ensureOnChainState
    ]);

    /* -------------------------- onWhitelistShareholder ------------------------- */
    const onWhitelistShareholder = useCallback(async () => {
        if (!anchorWallet) return;

        // 1) Ensure we have a mint / company before proceeding
        const { companyPda, mintPubkey } = await ensureOnChainState();
        if (!mintPubkey || !companyPda) {
            console.log("Mint or company not found, aborting whitelist call.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);
            const tokenProgram = new Program(idl as TokenContract, provider);

            // Prepare the ATA for the shareholder
            if (!shareholder) {
                console.log("No shareholder address provided.");
                return;
            }

            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mintPubkey,
                shareholder,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            const fetchedShareholders = await tokenProgram.account.shareholder.all();
            const shareholdersLength = fetchedShareholders.length;

            for (let i = 0; i < shareholdersLength; i++) {
                if (fetchedShareholders[i].account.owner.toBase58() === shareholder.toBase58()) {
                    if (fetchedShareholders[i].account.isWhitelisted) {
                        alert("Shareholder already whitelisted");
                        return;
                    }
                    alert("Shareholder already exists");
                    return;
                }
            }

            setShareholderDestinationTokenAccount(destinationTokenAccount);

            // Create transaction for the ATA
            const txAta = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    anchorWallet.publicKey,
                    destinationTokenAccount,
                    shareholder,
                    mintPubkey,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                )
            );
            let { blockhash: blockhashAta } = await connection.getLatestBlockhash();
            txAta.recentBlockhash = blockhashAta;
            txAta.feePayer = anchorWallet.publicKey;

            const signedTxAta = await anchorWallet.signTransaction(txAta);
            const sigAta = await connection.sendRawTransaction(signedTxAta.serialize());
            console.log("ATA creation sig:", sigAta);

            // Add to whitelist
            const txWhitelist = new Transaction();
            const addAccountToWhiteListIx = await transferHookProgram.methods
                .addToWhitelist()
                .accounts({
                    newAccount: destinationTokenAccount,
                    signer: anchorWallet.publicKey,
                })
                .instruction();
            txWhitelist.add(addAccountToWhiteListIx);

            let { blockhash } = await connection.getLatestBlockhash();
            txWhitelist.recentBlockhash = blockhash;
            txWhitelist.feePayer = anchorWallet.publicKey;

            const signedTx = await anchorWallet.signTransaction(txWhitelist);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            console.log('Add to Whitelist Sig:', sig);

        } catch (err) {
            console.error("Error whitelisting shareholder:", err);
        }
    }, [anchorWallet, companyAccount, mint, shareholder, ensureOnChainState]);

    /* ------------------------ onUnwhitelistShareholder ------------------------ */
    // const onUnwhitelistShareholder = useCallback(async () => {
    //     if (!anchorWallet) return;

    //     // 1) Ensure we have a mint / company
    //     const { companyPda, mintPubkey } = await ensureOnChainState();
    //     if (!mintPubkey || !companyPda) {
    //         console.log("Mint or company not found, aborting unwhitelist call.");
    //         return;
    //     }

    //     try {
    //         const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
    //         const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    //         const tokenProgram = new Program(idl as TokenContract, provider);

    //         if (!shareholder) {
    //             console.log("No shareholder address provided.");
    //             return;
    //         }
    //         const destinationTokenAccount = getAssociatedTokenAddressSync(
    //             mintPubkey,
    //             shareholder,
    //             false,
    //             TOKEN_2022_PROGRAM_ID,
    //             ASSOCIATED_TOKEN_PROGRAM_ID,
    //         );

    //         const tx = new Transaction();
    //         const removeShareholderIx = await tokenProgram.methods
    //             .removeShareholder()
    //             .accounts({
    //                 shareholder: destinationTokenAccount,
    //                 company: companyPda,
    //                 payer: anchorWallet.publicKey,
    //             })
    //             .instruction();
    //         tx.add(removeShareholderIx);

    //         console.log("tx: ", JSON.stringify(tx));

    //         let { blockhash } = await connection.getLatestBlockhash();
    //         tx.recentBlockhash = blockhash;
    //         tx.feePayer = anchorWallet.publicKey;

    //         const signedTx = await anchorWallet.signTransaction(tx);
    //         const sig = await connection.sendRawTransaction(signedTx.serialize());

    //         console.log('Remove Shareholder Sig:', sig);
            
    //         sleep(3000);

    //         const fetchedShareholders = await tokenProgram.account.shareholder.all();
    //         const shareholdersLength = fetchedShareholders.length;

    //         for (let i = 0; i < shareholdersLength; i++) {
    //             if (fetchedShareholders[i].account.owner.toBase58() === shareholder.toBase58()) {
    //                 if (!fetchedShareholders[i].account.isWhitelisted) {
    //                     alert("Shareholder already unwhitelisted");
    //                     return;
    //                 }
    //                 alert("Shareholder already exists");
    //                 return;
    //             }
    //         }          

    //     } catch (err) {
    //         console.error("Error unwhitelisting shareholder:", err);
    //     }
    // }, [anchorWallet, companyAccount, mint, shareholder, ensureOnChainState]);

    /* --------------------- onInitializeShareholderByCompany -------------------- */
    const onInitializeShareholderByCompany = useCallback(async () => {
        if (!anchorWallet) return;
        // 1) Ensure we have a mint / company
        const { companyPda, mintPubkey } = await ensureOnChainState();
        if (!mintPubkey || !companyPda) {
            console.log("Mint or company not found, aborting init shareholder call.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            if (!shareholder || shareholderVotingPower === '') {
                console.log("Shareholder or voting power missing.");
                return;
            }
            const fetchedShareholders = await tokenProgram.account.shareholder.all();
            const shareholdersLength = fetchedShareholders.length;

            for (let i = 0; i < shareholdersLength; i++) {
                if (fetchedShareholders[i].account.owner.toBase58() === shareholder.toBase58()) {
                    alert("Shareholder already exists");
                    return;
                }
            }

            // 1) Create a new keypair for the shareholder
            const newShareholderAccount = Keypair.generate(); // Shareholder acc data assigned in this keypair 
            console.log("New Shareholder PDA:", newShareholderAccount.publicKey.toBase58());

            // 2) Add shareholder by company
            const tx = new Transaction();
            const votingPowerBn = new BN(shareholderVotingPower);
            if (votingPowerBn.isZero()) {
                console.log("Voting power is 0");
                return;
            }

            const initializeShareholderIx = await tokenProgram.methods
                .addShareholderByCompany(shareholder, votingPowerBn)
                .accounts({
                    company: companyPda,
                    shareholder: newShareholderAccount.publicKey,
                    payer: anchorWallet.publicKey,
                })
                .instruction();
            tx.add(initializeShareholderIx);

            const sig = await sendTransaction(tx, connection, {
                signers: [newShareholderAccount],
            });
            console.log("Add Shareholder Tx Sig:", sig);

            // 3) Transfer tokens from treasury to the new shareholder's ATA
            const votingPowerAsLamports = new BN(votingPowerBn.mul(new BN(10 ** 9))); // e.g. 1 = 1 * 1e9
            if (votingPowerAsLamports.isZero()) {
                console.log("Voting power is 0 after scaling.");
                return;
            }
            console.log("Voting Power As Lamports:", votingPowerAsLamports.toString());
            console.log("Shareholder Destination Token Account:", shareholderDestinationTokenAccount?.toBase58());
            console.log("Mint:", mintPubkey.toBase58());
            console.log("Anchor Wallet:", anchorWallet.publicKey.toBase58());
            console.log("Shareholder:", shareholder?.toBase58());

            const treasuryPublicKey = await getAssociatedTokenAddress(
                mintPubkey,         // Mint's public key
                anchorWallet.publicKey, // Owner of the account
                false,                  // AllowOffCurve (usually false for ATA)
                TOKEN_2022_PROGRAM_ID,   // SPL Token program (2022)
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            console.log("Treasury Public Key:", treasuryPublicKey.toBase58());
            const tx2 = new Transaction();
            const transferHookIx = await createTransferCheckedWithTransferHookInstruction(
                connection,
                treasuryPublicKey,
                mintPubkey,
                shareholderDestinationTokenAccount as PublicKey,
                anchorWallet.publicKey,
                votingPowerAsLamports,
                9,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            tx2.add(transferHookIx);

            let { blockhash } = await connection.getLatestBlockhash();
            tx2.recentBlockhash = blockhash;
            tx2.feePayer = anchorWallet.publicKey;

            const signedTx2 = await anchorWallet.signTransaction(tx2);
            const sig2 = await connection.sendRawTransaction(signedTx2.serialize());
            console.log("Transfer Hook Tx Sig:", sig2);

        } catch (err) {
            console.error("Error initializing shareholder by company:", err);
        }
    }, [
        anchorWallet,
        companyAccount,
        mint,
        treasury,
        shareholder,
        shareholderVotingPower,
        shareholderDestinationTokenAccount,
        ensureOnChainState
    ]);

    /* ------------------------------- Rendering -------------------------------- */
    return (
        <div className="page">
            <h1>Company</h1>

            {/* Create Company */}
            <div className='card'>
                <h2 className='card-title'>Create Company</h2>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Company Name"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                    />
                </div>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Company Token Symbol"
                        value={nftDescription}
                        onChange={(e) => setNftDescription(e.target.value)}
                    />
                </div>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Total Supply"
                        value={totalSupply}
                        onChange={(e) => setTotalSupply(e.target.value)}
                    />
                </div>
                <div className='button-container'>
                    <button
                        onClick={onInitializeCompany}
                        disabled={!wallet?.publicKey || !nftName || !nftDescription || !totalSupply}
                    >
                        Create Company
                    </button>
                </div>
            </div>

            {/* Whitelist Shareholder */}
            <div className='card'>
                <h2 className='card-title'>Add Shareholder to Whitelist</h2>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Wallet Address"
                        onChange={(e) => {
                            try { setShareholder(new PublicKey(e.target.value)); }
                            catch { setShareholder(null); }
                        }}
                    />
                </div>
                <div className='button-container'>
                    <button
                        onClick={onWhitelistShareholder}
                        disabled={!wallet?.publicKey || !shareholder}
                    >
                        Add the Shareholder to the Whitelist
                    </button>
                </div>
            </div>

            {/* Unwhitelist Shareholder */}
            {/* <div className='card'>
                <h2 className='card-title'>Remove Shareholder from Whitelist</h2>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Wallet Address"
                        onChange={(e) => {
                            try { setShareholder(new PublicKey(e.target.value)); }
                            catch { setShareholder(null); }
                        }}
                    />
                </div>
                 TODO: implement a delegation logic instead of this 
                <div className='button-container'>
                    <button
                        onClick={onUnwhitelistShareholder}
                        disabled={!wallet?.publicKey || !shareholder}
                    >
                        Remove the Shareholder
                    </button>
                </div>
            </div> */}

            {/* Manage Shareholder Voting Power */}
            <div className='card'>
                <h2 className='card-title'>Initialize Shareholder and Voting Power</h2>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Shareholder Wallet Address"
                        onChange={(e) => {
                            try { setShareholder(new PublicKey(e.target.value)); }
                            catch { setShareholder(null); }
                        }}
                    />
                </div>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Shareholder Voting Power"
                        value={shareholderVotingPower}
                        onChange={(e) => setShareholderVotingPower(e.target.value)}
                    />
                </div>
                <div className='button-container'>
                    <button
                        onClick={onInitializeShareholderByCompany}
                        disabled={!wallet?.publicKey || !shareholderVotingPower || !shareholder}
                    >
                        Initialize Shareholder By Company
                    </button>
                </div>
            </div>
        </div>
    );
};

const Shareholders: FC = () => {


    return (
        <div>
            <h1>Shareholders Page</h1>
        </div>
    );
}


/* -------------------------------------------------------------------------- */
/*                              CompanyInfo Page                              */
/* -------------------------------------------------------------------------- */
const CompanyInfo: FC = () => {
    const anchorWallet = useAnchorWallet();

    // ----- State for on-chain data -----
    const [companyData, setCompanyData] = useState<any>(null);
    const [shareholders, setShareholders] = useState<any[]>([]);
    const [whitelistedAccounts, setWhitelistedAccounts] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);

    /**
     * Fetch all relevant data from the chain:
     *  1. Company data (by PDA)
     *  2. All Shareholders (by .all())
     *  3. All Whitelisted Accounts (by .all())
     *  4. All Polls (by .all())
     */
    const fetchAllData = useCallback(async () => {
        if (!anchorWallet) return;
        const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const tokenProgram = new Program(idl as TokenContract, provider);
        const transferHookProgram = new Program(idl2 as TransferHook, provider);

        // 1) Derive & fetch "Company" by PDA
        try {
            const [companyPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('company'), anchorWallet.publicKey.toBytes()],
                tokenProgram.programId
            );
            const fetchedCompany = await tokenProgram.account.company.fetch(companyPda);
            console.log("Fetched Company:", fetchedCompany);
            setCompanyData(fetchedCompany);

        } catch (err) {

            const fetchedShareholders = await tokenProgram.account.shareholder.all();
            if (fetchedShareholders.length > 0) {
                const firstShareholderCompanyPda = fetchedShareholders[0].account.company;
                const fetchedCompanyFromShareholder = await tokenProgram.account.company.fetch(firstShareholderCompanyPda);
                console.log("Fetched Company from Shareholder:", fetchedCompanyFromShareholder);
                setCompanyData(fetchedCompanyFromShareholder);
            } else {
                console.warn("No shareholders found to derive company data.");
                setCompanyData(null);
            }
        }

        // 2) Fetch all Shareholders
        try {
            const fetchedShareholders = await tokenProgram.account.shareholder.all();
            console.log("Fetched Shareholders:", fetchedShareholders);
            setShareholders(fetchedShareholders);
        } catch (err) {
            console.warn("Error fetching shareholders:", err);
        }

        // 3) Fetch all Whitelisted
        try {
            const fetchedWhitelisted = await transferHookProgram.account.whiteList.all();
            console.log("Fetched Whitelisted Accounts:", fetchedWhitelisted);
            setWhitelistedAccounts(fetchedWhitelisted);
        } catch (err) {
            console.warn("Error fetching whitelisted accounts:", err);
        }

        // 4) Fetch all Polls
        try {
            const fetchedPolls = await tokenProgram.account.poll.all();
            console.log("Fetched Polls:", fetchedPolls);
            setPolls(fetchedPolls);
        } catch (err) {
            console.warn("Error fetching polls:", err);
        }
    }, [anchorWallet]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return (
        <div className="page">
            <h1>Company Information</h1>

            {/* ===== Display the Company Data ===== */}
            <div className="card">
                <h2>Company Account</h2>
                {companyData ? (
                    <div>
                        <p><strong>Name:</strong> {companyData.name}</p>
                        <p><strong>Symbol:</strong> {companyData.symbol}</p>
                        <p><strong>Total Supply:</strong> {companyData.totalSupply?.toString()}</p>
                        <p><strong>Treasury:</strong> {companyData.treasury?.toString()}</p>
                        <p><strong>Token Mint:</strong> {companyData.tokenMint?.toString()}</p>
                    </div>
                ) : (
                    <p>No company data found (or not created yet).</p>
                )}
            </div>

            {/* ===== Display the Shareholders ===== */}
            <div className="card">
                <h2>Shareholders</h2>
                {shareholders.length > 0 ? (
                    <ul>
                        {shareholders.map((sh, index) => (
                            <li key={index}>
                                <p>
                                    <strong>Shareholder Account Address:</strong> {sh.publicKey.toBase58()} <br />
                                    <strong>Shareholder Wallet Address:</strong> {sh.account.owner.toBase58()} <br />
                                    <strong>Voting Power:</strong> {sh.account.votingPower.toString()} <br />
                                    <strong>Delegated To:</strong> {sh.account.delegatedTo.toBase58()} <br />
                                    <strong>Is Whitelisted:</strong> {sh.account.isWhitelisted ? 'Yes' : 'No'} <br />
                                    <strong>Company:</strong> {sh.account.company.toBase58()}

                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No shareholders found.</p>
                )}
            </div>

            {/* ===== Display Whitelisted Accounts ===== */}
            <div className="card">
                <h2>Whitelisted Addresses</h2>
                {whitelistedAccounts.length > 0 ? (
                    <ul>
                        {whitelistedAccounts.map((wl, index) => (
                            <li key={index}>
                                <p>
                                    <strong>Whitelist Account Address:</strong> {wl.publicKey.toBase58()} <br />
                                    {/* 
                                        If your whitelist struct is an array of keys, e.g.:
                                        pub whiteList: Vec<Pubkey>
                                    */}
                                    <strong>Whitelist:</strong>{' '}
                                    {wl.account.whiteList
                                        .map((pk: PublicKey) => pk.toBase58())
                                        .join(', ')}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No whitelisted accounts found.</p>
                )}
            </div>

            {/* ===== Display Polls ===== */}
            <div className="card">
                <h2>Polls</h2>
                {polls.length > 0 ? (
                    <ul>
                        {polls.map((p, index) => (
                            <li key={index}>
                                <p>
                                    <strong>Poll Account Address:</strong> {p.publicKey.toBase58()} <br />
                                    <strong>Options:</strong>{' '}
                                    {p.account.options
                                        .map(
                                            (option: any) =>
                                                `${option.label} (${option.votes} votes)`
                                        )
                                        .join(', ')}
                                    <br />
                                    <strong>Finished?:</strong>{' '}
                                    {p.account.finished ? 'Yes' : 'No'}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No polls found.</p>
                )}
            </div>
        </div>
    );
};

export { CompanyInfo };