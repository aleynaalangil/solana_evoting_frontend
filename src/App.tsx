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
import { Program, AnchorProvider, web3, Address } from '@coral-xyz/anchor';
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
                    {currentPage === 'Shareholders' && <Shareholders />}
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
                <button onClick={() => setCurrentPage('Shareholders')}>Shareholders</button>
                {/* <button onClick={() => setCurrentPage('CompanyInfo')}>CompanyInfo</button> */}
            </nav>
            <WalletMultiButton className="wallet-button" />
        </header>
    );
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// /* -------------------------------------------------------------------------- */
// /*                                   Polls                                    */
// /* -------------------------------------------------------------------------- */

const Polls: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();

    const { mintPubkey } = useMintContext();

    // UI states
    const [pollPubkeyInput, setPollPubkeyInput] = useState('');
    const [mintPubkeyInput, setMintPubkeyInput] = useState('');
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

    /* -------------------------------------------------------------------------- */
    /*                           onInitPoll (Create Poll)                          */
    /* -------------------------------------------------------------------------- */
    const onInitPoll = useCallback(async (selectedOptions: string[]) => {
        if (!anchorWallet) return;
        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            // This is your "token_contract" program with poll logic
            const tokenProgram = new Program(idl as TokenContract, provider);

            // Make a poll Keypair
            const pollKeypair = Keypair.generate();
            setPoll(pollKeypair.publicKey);

            // Build TX
            const tx = new Transaction();
            const initPollIx = await tokenProgram.methods
                .initializePoll(selectedOptions)
                .accounts({
                    poll: pollKeypair.publicKey,
                })
                .instruction();
            tx.add(initPollIx);

            // Send TX
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            const sig = await sendTransaction(tx, connection, {
                signers: [pollKeypair]
            });
            console.log('Poll creation Sig:', sig);

            await sleep(3000);

            // Fetch the poll
            const pollAccount = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
            const newPollOptions = pollAccount.options;
            setPollOptions(newPollOptions.map((o: any) => o.label));
            console.log("New poll's options:", newPollOptions);

        } catch (error) {
            console.error('Error creating poll:', error);
        }
    }, [anchorWallet]);

    /* -------------------------------------------------------------------------- */
    /*                                 onVote()                                   */
    /* -------------------------------------------------------------------------- */
    // const onVote = useCallback(async () => {
    //     if (!anchorWallet) return;
    //     if (optionId === '') {
    //         console.log("Option ID is empty");
    //         return;
    //     }

    //     try {
    //         const pollPublicKey = new PublicKey(pollPubkeyInput);
    //         setPoll(pollPublicKey);
    //         const mintPublicKey = new PublicKey(mintPubkeyInput);

    //         const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
    //         const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    //         // same "token_contract" program
    //         const tokenProgram = new Program(idl as TokenContract, provider);

    //         // Fetch the poll
    //         const pollFetcher = await tokenProgram.account.poll.fetch(pollPublicKey);
    //         console.log("Poll:", pollFetcher);

    //         // Check if poll is finished
    //         if (pollFetcher.finished) {
    //             console.log("Poll is over.");
    //             return;
    //         }

    //         // Find your Shareholder
    //         const allShareholders = await tokenProgram.account.shareholder.all();
    //         let shareholderPk: PublicKey | null = null;
    //         let totalVotes = 0;

    //         for (const sh of allShareholders) {
    //             if (sh.account.owner.toBase58() === anchorWallet.publicKey.toBase58()) {
    //                 shareholderPk = sh.publicKey;
    //             }
    //             totalVotes += sh.account.votingPower.toNumber();
    //         }
    //         if (!shareholderPk) {
    //             console.error("No shareholder account found for current wallet.");
    //             return;
    //         }

    //         // The voting weight is your associated token balance
    //         const destinationTokenAccount = getAssociatedTokenAddressSync(
    //             mintPublicKey,
    //             anchorWallet.publicKey,
    //             false,
    //             TOKEN_2022_PROGRAM_ID,
    //             ASSOCIATED_TOKEN_PROGRAM_ID,
    //         );
    //         const votingPowerBalance = await connection.getTokenAccountBalance(destinationTokenAccount);

    //         // Build TX
    //         const tx = new Transaction();
    //         const voteIdx = parseInt(optionId, 10);
    //         if (isNaN(voteIdx)) {
    //             console.log("Invalid option ID");
    //             return;
    //         }
    //         const voteIx = await tokenProgram.methods
    //             .vote(voteIdx, new BN(votingPowerBalance.value.uiAmount))
    //             .accounts({
    //                 poll: pollPublicKey,
    //                 voter: shareholderPk,
    //             })
    //             .instruction();
    //         tx.add(voteIx);

    //         // Send TX
    //         const { blockhash } = await connection.getLatestBlockhash();
    //         tx.recentBlockhash = blockhash;
    //         tx.feePayer = anchorWallet.publicKey;

    //         const signedTx = await anchorWallet.signTransaction(tx);
    //         const sig = await connection.sendRawTransaction(signedTx.serialize());
    //         console.log("Vote Tx Sig:", sig);

    //         await sleep(2000);

    //         // Optionally check if poll is "complete" (i.e. sum of votes == totalVotes).
    //         // If so, finish poll & tally
    //         const updatedPollAccount = await tokenProgram.account.poll.fetch(pollPublicKey);
    //         let pollSum = 0;
    //         for (const option of updatedPollAccount.options) {
    //             pollSum += option.votes.toNumber();
    //         }
    //         if (pollSum === totalVotes) {
    //             console.log("Poll is presumably complete. Finishing poll + tallying...");

    //             // Build TX2
    //             const tx2 = new Transaction();

    //             // finishPoll
    //             const tieBreakPoll = new Keypair()
    //             const finishPollIx = await tokenProgram.methods
    //                 .finishPoll()
    //                 .accounts({
    //                     oldPoll: pollPublicKey,
    //                     tieBreakPoll: tieBreakPoll.publicKey,
    //                     payer: anchorWallet.publicKey
    //                 })
    //                 .instruction();
    //             tx2.add(finishPollIx);

    //             const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
    //             tx2.recentBlockhash = blockhash2;
    //             tx2.feePayer = anchorWallet.publicKey;

    //             const signedTx2 = await anchorWallet.signTransaction(tx2);
    //             const sig2 = await connection.sendRawTransaction(signedTx2.serialize());
    //             console.log("Finish Poll + Tally Sig:", sig2);
    //         }

    //     } catch (err) {
    //         console.error("Error voting:", err);
    //     }
    // }, [anchorWallet, pollPubkeyInput, mintPubkeyInput, optionId]);
    const onVote = useCallback(async () => {
        if (!anchorWallet) return;
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

            // 1) Fetch the poll
            const pollAccount = await tokenProgram.account.poll.fetch(pollPublicKey);
            console.log("Poll:", pollAccount);

            // If poll is finished, abort
            if (pollAccount.finished) {
                console.log("Poll is over.");
                return;
            }

            // 2) “Shareholder” logic: (Optional) If you want to ensure the user has a Shareholder, you can do so:
            const allShareholders = await tokenProgram.account.shareholder.all();
            let shareholderPk: PublicKey | null = null;
            let totalVotes = 0;

            for (const sh of allShareholders) {
                // If the current wallet is the "owner" of that shareholder
                if (sh.account.owner.toBase58() === anchorWallet.publicKey.toBase58()) {
                    shareholderPk = sh.publicKey;
                }
                totalVotes += sh.account.votingPower.toNumber();
            }
            if (!shareholderPk) {
                console.error("No shareholder account found for current wallet.");
                return;
            }

            // 3) Derive a "vote-record" PDA to ensure you cannot vote twice
            const [voteRecordPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("vote-record"),
                    pollPublicKey.toBuffer(),
                    anchorWallet.publicKey.toBuffer()
                ],
                tokenProgram.programId
            );

            // 4) Calculate user’s "votingPower" from their associated token balance
            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mintPublicKey,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const balanceInfo = await connection.getTokenAccountBalance(destinationTokenAccount);
            const rawUiAmount = balanceInfo.value.uiAmount ?? 0;
            console.log("VotingPower from token account:", rawUiAmount);

            // 5) Build transaction
            const tx = new Transaction();
            const voteIdx = parseInt(optionId, 10);
            if (isNaN(voteIdx)) {
                console.log("Invalid option ID");
                return;
            }

            // In the contract, the method signature is: vote(ctx, vote_id, voting_power)
            // voting_power is a u64 -> BN in JS
            const voteIx = await tokenProgram.methods
                .vote(voteIdx, new BN(rawUiAmount))  // pass the user’s voting power here
                .accounts({
                    poll: pollPublicKey,
                    voter: anchorWallet.publicKey,   // the signer's wallet
                    // voteRecord: voteRecordPda,       // the new PDA that ensures 1 vote max
                })
                .instruction();
            tx.add(voteIx);

            // 6) Send transaction
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            const signedTx = await anchorWallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            console.log("Vote Tx Sig:", sig);

            // 7) (Optional) Wait, then check if all votes are cast => finish poll
            await sleep(2000);
            const updatedPollAccount = await tokenProgram.account.poll.fetch(pollPublicKey);
            let pollSum = 0;
            for (const option of updatedPollAccount.options) {
                pollSum += option.votes.toNumber();
            }

            if (pollSum === totalVotes) {
                console.log("Poll is presumably complete. Now finishing poll...");
                const tx2 = new Transaction();
                const tieBreakPollKeypair = Keypair.generate();

                // The contract’s `finishPoll` expects “oldPoll” and “tieBreakPoll”, plus the payer
                // Also ensures "tie_break_poll" is created (init).
                const finishPollIx = await tokenProgram.methods
                    .finishPoll()
                    .accounts({
                        oldPoll: pollPublicKey,
                        tieBreakPoll: tieBreakPollKeypair.publicKey,
                        payer: anchorWallet.publicKey,
                    })
                    .signers([tieBreakPollKeypair])  // Because we are creating a new poll account
                    .instruction();
                tx2.add(finishPollIx);

                // Prepare the transaction
                const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
                tx2.recentBlockhash = blockhash2;
                tx2.feePayer = anchorWallet.publicKey;

                // Must sign for the new poll account creation
                const signedTx2 = await anchorWallet.signTransaction(tx2);
                signedTx2.partialSign(tieBreakPollKeypair);
                // pass the new poll keypair as well
                const sig2 = await connection.sendRawTransaction(signedTx2.serialize());
                console.log("Finish Poll + Tally Sig:", sig2);
            }

        } catch (err) {
            console.error("Error voting:", err);
        }
    }, [anchorWallet, pollPubkeyInput, mintPubkeyInput, optionId]);

    /* -------------------------------------------------------------------------- */
    /*                                UI Render                                   */
    /* -------------------------------------------------------------------------- */
    return (
        <div className="page">
            <h1>Polls</h1>
            <div className="card">
                <h2 className="card-title">Create Poll</h2>
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
                <h2 className="card-title">Vote</h2>
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
    /* -------------------------------------------------------------------------- */
    /*                    onInitializeCompany (create everything)                 */
    /* -------------------------------------------------------------------------- */
    const onInitializeCompany = useCallback(async () => {
        if (!anchorWallet) return;
        await ensureOnChainState();

        if (companyAccount && mint) {
            console.log("Company or Mint already set, skipping creation");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            // Derive company
            const [companyPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('company'), anchorWallet.publicKey.toBytes()],
                tokenProgram.programId
            );
            setCompanyAccount(companyPda);

            // Create a brand new mint
            const mintKeypair = Keypair.generate();
            setMint(mintKeypair);

            // Treasury ATA
            const treasuryPda = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            setTreasury(treasuryPda);

            const bnTotalSupply = BigInt(totalSupply || "0") * BigInt(Math.pow(10, 9));
            if (bnTotalSupply === BigInt(0)) {
                alert("Invalid total supply.");
                return;
            }

            // 1) Create the Mint
            const extensions = [ExtensionType.TransferHook, ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate];
            const mintLen = getMintLen(extensions);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

            const createMintTx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: anchorWallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                // optional extra, depends on your version
                SystemProgram.transfer({
                    fromPubkey: anchorWallet.publicKey,
                    toPubkey: mintKeypair.publicKey,
                    lamports,
                })
            );
            const createMintSig = await sendTransaction(createMintTx, connection, { signers: [mintKeypair] });
            console.log("Create Mint Sig:", createMintSig);
            await sleep(4000);

            // 2) Initialize instructions
            const initTx = new Transaction().add(
                createInitializeTransferHookInstruction(
                    mintKeypair.publicKey,
                    anchorWallet.publicKey,
                    transferHookProgram.programId,
                    TOKEN_2022_PROGRAM_ID
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
            await sleep(3000);
            // const extraMetaListPda = PublicKey.findProgramAddressSync(
            //     [Buffer.from("extra-account-meta-list"), anchorWallet.publicKey.toBytes()],
            //     transferHookProgram.programId
            // );
            // // Also call `initializeExtraAccountMetaList` on the transferHook program
            const extraMetaIx = await transferHookProgram.methods
                .initializeExtraAccountMetaList()
                .accounts({
                    payer: anchorWallet.publicKey,
                    mint: mintKeypair.publicKey, // Not an actual real mint, just a placeholder
                })
                .instruction();
            initTx.add(extraMetaIx);

            // Also "initializeCompany" in your tokenContract
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

            let { blockhash } = await connection.getLatestBlockhash();
            initTx.recentBlockhash = blockhash;
            initTx.feePayer = anchorWallet.publicKey;

            const signedTx = await anchorWallet.signTransaction(initTx);
            const initSig = await connection.sendRawTransaction(signedTx.serialize());
            console.log("Init Tx Sig:", initSig);
            await sleep(3000);

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
    }, [anchorWallet, nftName, nftDescription, totalSupply, ensureOnChainState]);

    /* -------------------------------------------------------------------------- */
    /*                         onWhitelistShareholder()                           */
    /* -------------------------------------------------------------------------- */
    const onWhitelistShareholder = useCallback(async () => {
        if (!anchorWallet) return;

        const { companyPda, mintPubkey } = await ensureOnChainState();
        if (!mintPubkey || !companyPda) {
            console.log("Mint or company not found. Aborting.");
            return;
        }
        if (!shareholder) {
            alert("No shareholder address provided.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            // 1) Derive the 'shareholder' ATA
            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mintPubkey,
                shareholder,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            // console.log("Shareholder ATA:", destinationTokenAccount.toBase58());

            // 2) Check if seeds-based whitelist entry `[b"whitelist", ATA, anchorWallet]` already exists
            // Suppose you’re adding a new shareholder with (wallet = newWallet, tokenAccount = newTokenAccount)
            const allShareholders = await transferHookProgram.account.shareholderWhitelist.all();
            // const allShareholders = await transferHookProgram.account.shareholderPda.all();

            // // Check if there’s already a match
            for (const sh of allShareholders) {
                if (
                    sh.account.wallet.toBase58() === shareholder.toBase58() &&
                    sh.account.tokenAccount.toBase58() === destinationTokenAccount.toBase58()
                ) {
                    alert("That shareholder is already whitelisted!");
                    return;
                }
            }

            // 3) Create ATA if needed
            const txAta = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    anchorWallet.publicKey,
                    destinationTokenAccount,
                    shareholder,
                    mintPubkey,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            let { blockhash } = await connection.getLatestBlockhash();
            txAta.recentBlockhash = blockhash;
            txAta.feePayer = anchorWallet.publicKey;

            const signedAtaTx = await anchorWallet.signTransaction(txAta);
            const ataSig = await connection.sendRawTransaction(signedAtaTx.serialize());
            console.log("Created Shareholder ATA Sig:", ataSig);
            await sleep(2000);

            // 4) Actually whitelist via `addWhitelistEntry(ATA, anchorWallet)`
            const tx = new Transaction();
            const addIx = await transferHookProgram.methods
                .addShareholder(shareholder, destinationTokenAccount)
                .accounts({
                    authority: anchorWallet.publicKey,
                })
                .instruction();
            tx.add(addIx);

            // 4) Send the transaction, including the new Keypair as a signer
            const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash2;
            tx.feePayer = anchorWallet.publicKey;

            const sig = await sendTransaction(tx, connection, { signers: [] });
            console.log("Whitelisted (ATA, anchorWallet) with signature:", sig);

        } catch (err) {
            console.error("Error whitelisting shareholder:", err);
        }
    }, [anchorWallet, ensureOnChainState, shareholder]);

    const onUnwhitelistShareholder = useCallback(async () => {
        if (!anchorWallet) return;
        const { companyPda, mintPubkey } = await ensureOnChainState();
        if (!mintPubkey || !companyPda) {
            console.log("Mint or company not found, aborting unwhitelist call.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);
            const tokenProgram = new Program(idl as TokenContract, provider);

            if (!shareholder) {
                alert("No shareholder address provided.");
                return;
            }

            // find which WhiteList account (if any) references that `(tokenAccount, wallet)`
            const fetchedWhitelisted = await transferHookProgram.account.shareholderWhitelist.all();
            // const fetchedWhitelisted = await transferHookProgram.account.shareholderPda.all();

            let matchedTokenAccount: PublicKey | null = null;
            let matchedWhiteListPda: PublicKey | null = null;

            outerLoop:
            for (const wl of fetchedWhitelisted) {
                // Each wl.account is a single WhitelistEntryPda
                if (wl.account.wallet.toBase58() === shareholder.toBase58()) {
                    matchedTokenAccount = wl.account.tokenAccount;
                    matchedWhiteListPda = wl.publicKey;
                    break outerLoop;
                }
            }

            if (!matchedTokenAccount || !matchedWhiteListPda) {
                alert("Shareholder is not in the whitelist array. Aborting.");
                return;
            }

            // console.log("matchedTokenAccount:", matchedTokenAccount.toBase58());
            // console.log("matchedWhiteListPda:", matchedWhiteListPda.toBase58());

            if (!matchedTokenAccount || !matchedWhiteListPda) {
                alert("Shareholder is not in the whitelist array. Aborting.");
                return;
            }

            // 1) removeFromWhitelist
            const tx = new Transaction();
            const removeIx = await transferHookProgram.methods
                .removeShareholder()  
                .accounts({
                    shareholderWhitelist: matchedWhiteListPda
                })
                .instruction();
            tx.add(removeIx);

            let { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;
            const signedTx = await anchorWallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            console.log("Remove from Whitelist Sig:", sig);

            // 2) removeShareholder from `token_contract` if you want to remove them from the Company
            // (Of course, you only do this if you want to fully remove them as a shareholder)
            const allShareholders = await tokenProgram.account.shareholder.all();
            const foundShareholderAcc = allShareholders.find(
                (acc) => acc.account.owner.toBase58() === shareholder.toBase58()
            );
            if (!foundShareholderAcc) {
                alert("Shareholder account not found in token_contract. Possibly already removed?");
                return;
            }

            const removeShTx = new Transaction();
            const removeShareholderIx = await tokenProgram.methods
                .removeShareholderByCompany()
                .accounts({
                    shareholder: foundShareholderAcc.publicKey,
                })
                .instruction();
            removeShTx.add(removeShareholderIx);

            let { blockhash: blockhash2 } = await connection.getLatestBlockhash();
            removeShTx.recentBlockhash = blockhash2;
            removeShTx.feePayer = anchorWallet.publicKey;

            const signedRemoveShTx = await anchorWallet.signTransaction(removeShTx);
            const sig2 = await connection.sendRawTransaction(signedRemoveShTx.serialize());
            console.log("Remove Shareholder Sig:", sig2);

        } catch (err) {
            console.error("Error unwhitelisting shareholder:", err);
        }
    }, [anchorWallet, ensureOnChainState, shareholder]);


    /* --------------------- onInitializeShareholderByCompany -------------------- */
    const onInitializeShareholderByCompany = useCallback(async () => {
        if (!anchorWallet) return;
        const { companyPda, mintPubkey } = await ensureOnChainState();
        if (!mintPubkey || !companyPda) {
            console.log("Mint or company not found, aborting init shareholder call.");
            return;
        }
        if (!shareholder || shareholderVotingPower === '') {
            alert("Shareholder or voting power missing.");
            return;
        }

        try {
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            // 1) Create new Shareholder in token_contract
            const tx = new Transaction();
            const votingPowerBn = new BN(shareholderVotingPower);
            if (votingPowerBn.isZero()) {
                alert("Voting power is zero");
                return;
            }

            const addShareholderIx = await tokenProgram.methods
                .addShareholderByCompany(shareholder, votingPowerBn)
                .accounts({
                    company: companyPda,
                    payer: anchorWallet.publicKey
                })
                .instruction();
            tx.add(addShareholderIx);

            const sig = await sendTransaction(tx, connection, { signers: [] });
            console.log("Add Shareholder Tx Sig:", sig);
            await sleep(2000);


            // 2) We now want to Transfer tokens from treasury => shareholder's ATA
            // => That requires a whitelist entry (ATA, anchorWallet).
            // Check if we have it:
            const allEntries = await transferHookProgram.account.shareholderWhitelist.all();
            // console.log("allEntries:", allEntries);
            let matchedEntry: { tokenAccount: PublicKey, walletAccount: PublicKey } | null = null;

            for (const wl of allEntries) {
                // console.log("wl.account.wallet:", wl.account.wallet.toBase58());
                // console.log("wl.account.tokenAccount:", wl.account.tokenAccount.toBase58());
                // console.log("wl.publicKey:", wl.publicKey.toBase58());
                if (
                    wl.account.wallet.toBase58() === shareholder.toBase58()
                ) {
                    // console.log("Found matched entry:", wl.account.wallet.toBase58());
                    matchedEntry = {
                        tokenAccount: wl.account.tokenAccount,
                        walletAccount: wl.account.wallet
                    };
                    break;
                }
            }
            if (!matchedEntry) {
                alert("We did not find an entry where (walletAccount=anchorWallet). Are you sure you whitelisted (ATA, anchorWallet)?");
                return;
            }
            // console.log("matchedEntry:", matchedEntry);
            const shareholderAta = matchedEntry.tokenAccount;
            // console.log("shareholderAta found:", shareholderAta.toBase58());

            // 3) Convert votingPower => lamports
            const votingPowerAsLamports = votingPowerBn.mul(new BN(10 ** 9));
            if (votingPowerAsLamports.isZero()) {
                alert("Voting power is 0 after scaling.");
                return;
            }

            // 4) Our treasury ATA
            const treasuryPda = getAssociatedTokenAddressSync(
                mintPubkey,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            // 5) Transfer with a "transfer hook" instruction
            const tx2 = new Transaction();
            const hookIx = await createTransferCheckedWithTransferHookInstruction(
                connection,
                treasuryPda,
                mintPubkey,
                shareholderAta,
                anchorWallet.publicKey, // the source authority
                votingPowerAsLamports,
                9,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            tx2.add(hookIx);

            let { blockhash: blockhash2 } = await connection.getLatestBlockhash();
            tx2.recentBlockhash = blockhash2;
            tx2.feePayer = anchorWallet.publicKey;

            const signedTx2 = await anchorWallet.signTransaction(tx2);
            const transferSig = await connection.sendRawTransaction(signedTx2.serialize());

            console.log("Transfer Hook Tx Sig:", transferSig);

        } catch (err) {
            console.error("Error initializing shareholder:", err);
        }
    }, [anchorWallet, ensureOnChainState, shareholder, shareholderVotingPower]);

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
            <div className='card'>
                <h2 className='card-title'>Remove Shareholder from Whitelist</h2>
                <div className='input-group'>
                    <input
                        type="text"
                        placeholder="Wallet Address to remove"
                        onChange={(e) => {
                            try { setShareholder(new PublicKey(e.target.value)); }
                            catch { setShareholder(null); }
                        }}
                    />
                </div>
                <div className='button-container'>
                    <button
                        onClick={onUnwhitelistShareholder}
                        disabled={!wallet?.publicKey || !shareholder}
                    >
                        Remove the Shareholder
                    </button>
                </div>
            </div>

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

// /* -------------------------------------------------------------------------- */
// /*                             Shareholders Page                              */
// /* -------------------------------------------------------------------------- */

const Shareholders: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();

    const [delegatedTo, setDelegatedTo] = useState('');
    const [votingPower, setVotingPower] = useState('');

    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    const onDelegateVotingRights = useCallback(async () => {
        if (!anchorWallet) return;

        try {
            // 1) Connect
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            let companyPda: PublicKey | null = null;
            let companyTreasury: PublicKey | null = null;
            let companyTokenMint: PublicKey | null = null;

            // We'll create a new Shareholder account
            const newShareholderKeypair = Keypair.generate();

            // Attempt to find any existing shareholders to locate the Company
            const fetchedShareholders = await tokenProgram.account.shareholder.all();
            if (fetchedShareholders.length > 0) {
                const firstShareholderCompanyPda = fetchedShareholders[0].account.company;
                const fetchedCompanyFromShareholder = await tokenProgram.account.company.fetch(firstShareholderCompanyPda);
                console.log("Fetched Company from Shareholder:", fetchedCompanyFromShareholder);

                companyPda = firstShareholderCompanyPda;
                companyTreasury = fetchedCompanyFromShareholder.treasury;
                companyTokenMint = fetchedCompanyFromShareholder.tokenMint;
            } else {
                console.warn("No shareholders found to derive company data.");
            }
            if (!companyPda || !companyTreasury || !companyTokenMint) {
                console.log("Company PDA, Treasury, or Token Mint not found.");
                return;
            }

            console.log("Company Treasury:", companyTreasury.toBase58());
            console.log("Company Token Mint:", companyTokenMint.toBase58());
            console.log("Company PDA:", companyPda.toBase58());
            const allShareholders = await tokenProgram.account.shareholder.all();

            // 3) Filter to find if anchorWallet.publicKey is an owner
            const matchingShareholder = allShareholders.find(
                (sh) => sh.account.owner.toBase58() === anchorWallet.publicKey.toBase58()
            );

            if (!matchingShareholder || matchingShareholder.account.votingPower.toString() !== votingPower.toString() || matchingShareholder.account.votingPower.toString() === '0') {
                console.log("This wallet is NOT a shareholder or voting power is 0 or not all the voting power is delegated");
                return;
            } else {

                console.log(
                    "Anchor wallet is a shareholder with voting power:",
                    matchingShareholder.account.votingPower.toString()
                );
            }

            if (!companyPda || !companyTreasury || !companyTokenMint) {
                console.log("Company PDA, Treasury, or Token Mint not found.");
                return;
            }

            // 2) Fetch the entire whitelist array to see if "delegatedTo" is in there
            const fetchedWhitelisted = await transferHookProgram.account.shareholderWhitelist.all();
            let shareholderDestinationTokenAccount: PublicKey | null = null;
            let shareholderDestinationWallet: PublicKey | null = null;
            for (const entry of fetchedWhitelisted) {
                if (entry.account.wallet.toBase58() === delegatedTo) {
                    shareholderDestinationTokenAccount = entry.account.tokenAccount;
                    shareholderDestinationWallet = entry.account.wallet;
                    break;
                }
            }
            if (!shareholderDestinationTokenAccount) {
                alert("Shareholder is not whitelisted");
                return;
            }

            console.log("Found matching company PDA:", companyPda.toBase58());
            console.log("Company PDA:", companyPda.toBase58());

            // 5) Convert voting power to BN
            const votingPowerBn = new BN(votingPower || '0').mul(new BN(10 ** 9));
            console.log("Voting Power Bn:", votingPowerBn.toString());
            if (votingPowerBn.isZero()) {
                console.log("Voting power is 0");
                return;
            }

            // 6) Create & send delegateVoteRights instruction
            const tx = new Transaction();
            const delegateVoteRightsIx = await tokenProgram.methods
                .delegateVoteRights(new PublicKey(delegatedTo), new BN(votingPower), companyPda)
                .accounts({
                    shareholder: matchingShareholder.publicKey,
                })
                .instruction();
            tx.add(delegateVoteRightsIx);

            const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash2;
            tx.feePayer = anchorWallet.publicKey;

            const sigDelegateVoteRights = await sendTransaction(tx, connection, {
                signers: [],
            });
            console.log("Delegate vote rights success, tx sig:", sigDelegateVoteRights);
            alert("Delegated voting rights successfully!");

            // 7) Transfer Hook to move tokens from treasury to new shareholder's ATA
            const sourceTokenAccount = getAssociatedTokenAddressSync(
                companyTokenMint,
                anchorWallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );
            console.log("Source Token Account:", sourceTokenAccount.toBase58());
            console.log("Company Token Mint:", companyTokenMint.toBase58());
            console.log("New Shareholder Keypair:", newShareholderKeypair.publicKey.toBase58());
            const txTransferHook = new Transaction();
            const transferHookIx = await createTransferCheckedWithTransferHookInstruction(
                connection,
                sourceTokenAccount,
                companyTokenMint,
                shareholderDestinationTokenAccount,
                anchorWallet.publicKey,
                votingPowerBn,
                9,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            txTransferHook.add(transferHookIx);

            let { blockhash: blockhashTransferHook } = await connection.getLatestBlockhash();
            txTransferHook.recentBlockhash = blockhashTransferHook;
            txTransferHook.feePayer = anchorWallet.publicKey;

            const signedTxTransferHook = await anchorWallet.signTransaction(txTransferHook);
            const sigTransferHook = await connection.sendRawTransaction(signedTxTransferHook.serialize());
            console.log("Transfer Hook Tx Sig:", sigTransferHook);

        } catch (err) {
            console.error("Error delegating voting rights:", err);
            alert("Failed to delegate voting rights.");
        }
    }, [anchorWallet, delegatedTo, votingPower]);
    return (
        <div className="page">
            <h1>Shareholders</h1>
            <div className="card">
                <h2 className="card-title">Delegate Voting Rights</h2>
                <input
                    type="text"
                    placeholder="New Delegated Wallet"
                    value={delegatedTo}
                    onChange={(e) => setDelegatedTo(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Voting Power to Delegate"
                    value={votingPower}
                    onChange={(e) => setVotingPower(e.target.value)}
                />
                <button
                    onClick={onDelegateVotingRights}
                    disabled={!wallet?.publicKey || !delegatedTo || !votingPower}
                >
                    Delegate Vote
                </button>
            </div>
        </div>
    );
};

// /* -------------------------------------------------------------------------- */
// /*                              CompanyInfo Page                              */
// /* -------------------------------------------------------------------------- */
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
            const fetchedWhitelisted = await transferHookProgram.account.shareholderWhitelist.all();
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

            <div className="card">
                <h2>Shareholders</h2>
                {shareholders.length > 0 ? (
                    <ul>
                        {shareholders.map((sh, index) => (
                            <li key={index}>
                                <p>
                                    <strong>Shareholder PDA:</strong> {sh.publicKey.toBase58()} <br />
                                    <strong>Owner (Wallet):</strong> {sh.account.owner.toBase58()} <br />
                                    <strong>Voting Power:</strong> {sh.account.votingPower.toString()} <br />
                                    <strong>Company:</strong> {sh.account.company.toBase58()}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No shareholders found.</p>
                )}
            </div>

            <div className="card">
                <h2>Whitelisted Accounts</h2>
                {whitelistedAccounts.length > 0 ? (
                    <ul>
                        {whitelistedAccounts.map((wl, index) => (
                            <li key={index}>
                                <p>
                                    <strong>Whitelist Entry PDA:</strong> {wl.publicKey.toBase58()}
                                </p>
                                <div>
                                    <p>Authority: {wl.account.authority.toBase58()}</p>
                                    <p>Token Account: {wl.account.tokenAccount.toBase58()}</p>
                                    <p>Wallet Account: {wl.account.wallet.toBase58()}</p>
                                </div>
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