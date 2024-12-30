import { ConnectionProvider, WalletProvider, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram } from '@solana/web3.js';
import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, web3, utils, Address } from '@coral-xyz/anchor';
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
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    transferChecked,
    transferCheckedInstructionData,
    createTransferCheckedInstruction
} from '@solana/spl-token';
import {
    createInitializeInstruction,
} from "@solana/spl-token-metadata";
require('@solana/wallet-adapter-react-ui/styles.css');
require('./App.css');


const App: FC = () => {
    const [currentPage, setCurrentPage] = useState('Company');

    return (
        <div className='App'>
            <Context>
                <Header setCurrentPage={setCurrentPage} />
                {currentPage === 'Company' && <Company />}
                {currentPage === 'Shareholders' && <Shareholders />}
                {currentPage === 'Polls' && <Polls />}
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
            </nav>
            <WalletMultiButton className="wallet-button" />
        </header>
    );
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const Polls: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();
    const [nftName, setNftName] = useState('');
    const [shareholder, setShareholder] = useState<PublicKey | Address>('');
    const [mint, setMint] = useState<Keypair | null>(null);
    const [companyAccount, setCompanyAccount] = useState<PublicKey | Address>('');
    const [nftDescription, setNftDescription] = useState('');
    const [totalSupply, setTotalSupply] = useState('');
    const [extraAccountMetaList, setExtraAccountMetaList] = useState<PublicKey | Address>('');
    const [whitelist, setWhitelist] = useState<PublicKey | Address>('');
    const [treasury, setTreasury] = useState<PublicKey | null>(null);
    const [shareholderVotingPower, setShareholderVotingPower] = useState('');
    const [shareholderVote, setShareholderVote] = useState('');
    const [poll, setPoll] = useState<PublicKey | Address>('');
    const [optionId, setOptionId] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>([]);
    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);
    const onInitPoll = useCallback(async (selectedOptions: string[]) => {
        if (!anchorWallet) return;
        try {
            if (!mint) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            const poll: string[] = selectedOptions; // u need to get this from the user
            const pollKeypair = new Keypair();

            const tx = new web3.Transaction()

            const initializePollInstruction = await tokenProgram.methods
                .initializePoll(poll)
                .accounts({
                    poll: pollKeypair.publicKey,
                    owner: anchorWallet.publicKey,
                })
                .signers([pollKeypair])
                .instruction();

            tx.add(initializePollInstruction);

            const pollState = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
            console.log("pollState", pollState.options.map(option => option.label));
            console.log("pollState", pollState.voters.map(voter => voter.toBase58()));

            setPoll(pollKeypair.publicKey);
            setPollOptions(pollState.options.map(option => option.label));

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));

            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);
        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);

    const onVote = useCallback(async (optionId: number) => {
        if (!anchorWallet) return;
        try {
            if (!mint) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            const tx = new web3.Transaction()

            const shareholder = await tokenProgram.account.shareholder.fetch(new PublicKey(anchorWallet.publicKey));

            if (shareholder.votingPower === 0) {
                return;
            }

            const optionFromShareholderVote = optionId;

            if (optionFromShareholderVote < 0 || optionFromShareholderVote >= pollOptions.length) {
                return;
            }
            //already voted or poll over is checked in the contract

            const voteInstruction = await tokenProgram.methods
                .vote(optionFromShareholderVote)
                .accounts({
                    poll: poll,
                    shareholder: anchorWallet.publicKey
                })
                .instruction();
            tx.add(voteInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));

            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);


        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint, pollOptions]);
    return (
        <div className="page">
            <h1>Polls</h1>
            <div className="card">
                <h2 className='card-title'>Create Poll</h2>
                <input
                    type="text"
                    placeholder="Enter poll options separated by commas (e.g., Option1, Option2, Option3, Option4 - there cannot be more than 4 options or less than 2 options)"
                    onChange={(e) => setPollOptions(e.target.value.split(',').map(option => option.trim()))}
                />
                <div className='button-container'>
                    <button
                        onClick={() => {
                            const selectedOptions = pollOptions.slice(0, 4);
                            onInitPoll(selectedOptions);
                        }}
                        disabled={!wallet?.publicKey || pollOptions.length < 2 || pollOptions.length > 4}
                    >
                        Initialize Poll
                    </button>
                </div>
            </div>
            <div className="card">
                <h2 className='card-title'>Vote</h2>
                <div>
                    <input
                        type="text"
                        placeholder="Option Id"
                        value={optionId}
                        onChange={(e) => setOptionId(e.target.value)}
                    />
                    <div className='button-container'>
                        <button onClick={() => {
                            const optionFromShareholderVote = parseInt(optionId, 10); // Convert input to integer
                            onVote(optionFromShareholderVote);
                        }} disabled={!wallet?.publicKey || optionId === ''}>
                            Submit Vote
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Company: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();
    const [nftName, setNftName] = useState('');
    const [shareholder, setShareholder] = useState<PublicKey | Address>('');
    const [mint, setMint] = useState<Keypair | null>(null);
    const [companyAccount, setCompanyAccount] = useState<PublicKey | Address>('');
    const [nftDescription, setNftDescription] = useState('');
    const [totalSupply, setTotalSupply] = useState('');
    const [extraAccountMetaList, setExtraAccountMetaList] = useState<PublicKey | Address>('');
    const [whitelist, setWhitelist] = useState<PublicKey | Address>('');
    const [treasury, setTreasury] = useState<PublicKey | Address>('');
    const [shareholderVotingPower, setShareholderVotingPower] = useState('');
    const [shareholderVote, setShareholderVote] = useState('');
    const [poll, setPoll] = useState<PublicKey | Address>('');
    const [optionId, setOptionId] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>([]);
    const [shareholderPubkeys, setShareholderPubkeys] = useState<string[]>([]);
    const [shareholderDestinationTokenAccount, setShareholderDestinationTokenAccount] = useState<PublicKey | Address>('');

    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
    //@ts-ignore
    const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    const transferHookProgram = new Program(idl2 as TransferHook, provider);
    const tokenProgram = new Program(idl as TokenContract, provider);


    useEffect(() => {
        const fetchShareholderPubkeys = async () => {
            if (!wallet?.publicKey) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');

            // Example logic for fetching associated pubkeys (replace with real program logic)
            // const programId = new PublicKey('8ENJmtxr1HAxWhY8gXcBPggxbNc66BFjUuvWoTc48enB');
            const programId = new PublicKey('2TE5kuPuKgoXoBEtDB6EhCvP5yVRJGiS2DnthZNw3oP4');
            const accounts = await connection.getProgramAccounts(programId, {
                filters: [
                    { memcmp: { offset: 0, bytes: wallet.publicKey.toBase58() } },
                ],
            });
            const x = accounts.map(account => account.account.owner.toBase58());
            const pubkeys = await tokenProgram.account.shareholder.all();
            // const pubkeys = await transferHookProgram.account.whiteList.all();
            const pubkeys2 = pubkeys.map(account => account.account.owner.toBase58());
            setShareholderPubkeys(x);
        };

        fetchShareholderPubkeys();
    }, [wallet?.publicKey]);


    const onInitializeCompany = useCallback(async () => {
        if (!anchorWallet) return;
        try {
            // const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            // const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            // const transferHookProgram = new Program(idl2 as TransferHook, provider);
            // const tokenProgram = new Program(idl as TokenContract, provider);
            // const ATA_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");


            // seeds = [b"company", payer.key().as_ref()],
            const [companyAccount] = PublicKey.findProgramAddressSync(
                [Buffer.from('company'), anchorWallet.publicKey.toBytes()],
                tokenProgram.programId
            );
            console.log("companyAccount", companyAccount.toBase58());
            setCompanyAccount(companyAccount);
            // seeds = [b"token-2022-token", signer.key().as_ref(), token_name.as_bytes()],

            const mint = new Keypair();
            setMint(mint);

            // const [treasury] = await anchor.web3.PublicKey.findProgramAddressSync( // TODO:this can be wrong.. double check
            //     [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.publicKey.toBytes()],
            //     ASSOCIATED_TOKEN_PROGRAM_ID,
            // );
            const treasury = await getAssociatedTokenAddress(
                mint.publicKey,         // Mint's public key
                anchorWallet.publicKey, // Owner of the account
                false,                  // AllowOffCurve (usually false for ATA)
                TOKEN_2022_PROGRAM_ID,   // SPL Token program (2022)
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            setTreasury(treasury);


            console.log("treasury", treasury.toBase58());

            const extensions = [ExtensionType.TransferHook, ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate];
            const mintLen = getMintLen(extensions);
            const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);
            console.log("lamports", lamports); // how much lamports to create the mint (SOL)

            if (isNaN(Number(totalSupply)) || totalSupply === null || totalSupply === undefined) {
                console.log("Invalid totalSupply value");
                return;
            }

            const bnTotalSupply = BigInt(totalSupply) * BigInt(Math.pow(10, 9));
            console.log("bnTotalSupply", bnTotalSupply.toString);

            if (bnTotalSupply === BigInt(0)) {
                console.log("Total supply is 0");
                return;
            }

            const init = new web3.Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: anchorWallet.publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: mintLen,
                    lamports: lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                SystemProgram.transfer({
                    fromPubkey: anchorWallet.publicKey,
                    toPubkey: mint.publicKey,
                    lamports: lamports
                }));


            const initSig = await sendTransaction(init, connection, {
                signers: [mint]
            });
            console.log("initSig", initSig);

            const tx = new web3.Transaction().add(
                createInitializeTransferHookInstruction(
                    mint.publicKey,
                    anchorWallet.publicKey,
                    transferHookProgram.programId, // Transfer Hook Program ID
                    TOKEN_2022_PROGRAM_ID,
                ),
                createInitializeMetadataPointerInstruction(
                    mint.publicKey, // Mint Account address
                    anchorWallet.publicKey, // Authority that can set the metadata address
                    mint.publicKey, // Account address that holds the metadata
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializePermanentDelegateInstruction(
                    mint.publicKey,
                    anchorWallet.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
                createInitializeMintInstruction(
                    mint.publicKey, // Mint Account Address
                    9, // Decimals of Mint
                    anchorWallet.publicKey, // Designated Mint Authority
                    null, // Optional Freeze Authority
                    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
                    metadata: mint.publicKey, // Account address that holds the metadata
                    updateAuthority: anchorWallet.publicKey, // Authority that can update the metadata
                    mint: mint.publicKey, // Mint Account address
                    mintAuthority: anchorWallet.publicKey, // Designated Mint Authority
                    name: nftName,
                    symbol: nftDescription,
                    uri: "https://github.com/aleynaalangil/demo_company/blob/main/README.md",
                }),
            );

            const initializeExtraAccountMetaListIx = await transferHookProgram.methods
                .initializeExtraAccountMetaList()
                .accounts({
                    mint: mint.publicKey,
                })
                .instruction();
            tx.add(initializeExtraAccountMetaListIx);

            const createCompanyIx = await tokenProgram.methods.initializeCompany(
                nftName,
                nftDescription,
                new BN(totalSupply),
                mint.publicKey,
                treasury)
                .accounts({
                    // @ts-ignore
                    company: companyAccount,
                    payer: anchorWallet.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction()
            tx.add(createCompanyIx);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));


            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);

            const ATA = createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey,
                new PublicKey(treasury),
                anchorWallet.publicKey,
                mint.publicKey,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            console.log("ATA2", ATA);

            // Instruction to mint tokens to associated token account
            const mintToInstruction = createMintToInstruction(
                mint.publicKey, // Mint Account address
                new PublicKey(treasury), // Mint to
                anchorWallet.publicKey, // Mint Authority address
                new BN(bnTotalSupply), // Amount
                [], // Additional signers
                TOKEN_2022_PROGRAM_ID // Token Extension Program ID
            );

            // Transaction to create associated token account and mint tokens
            const transaction2 = new web3.Transaction().add(
                ATA,
                mintToInstruction
            );
            const {
                blockhash: blockhash2,
                lastValidBlockHeight: lastValidBlockHeight2
            } = await connection.getLatestBlockhash();

            transaction2.recentBlockhash = blockhash2;
            transaction2.lastValidBlockHeight = lastValidBlockHeight2;
            transaction2.feePayer = anchorWallet.publicKey;
            console.log(JSON.stringify(transaction2));

            const signedTx2 = await anchorWallet?.signTransaction(transaction2);
            const sig2 = await connection.sendRawTransaction(signedTx2.serialize());

            console.log('Transaction Signature:', sig2);

        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);

    const onWhitelistShareholder = useCallback(async () => {
        if (!anchorWallet) {
            console.log("No anchorWallet available");
            return;
        }

        try {
            if (!mint) {
                console.log("No mint available");
                return;
            }
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            console.log("Mint PublicKey:", mint.publicKey.toBase58());
            console.log("Shareholder PublicKey:", shareholder.toString());
            if (!mint.publicKey || !shareholder) {
                console.log("No mint or shareholder available");
                return;
            }

            const ataTx = new web3.Transaction()
            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mint.publicKey,
                shareholder as PublicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            const destinationTokenAccountInstruction = createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey,
                destinationTokenAccount,
                shareholder as PublicKey,
                mint.publicKey,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );
            ataTx.add(destinationTokenAccountInstruction);

            console.log("ATA TX", JSON.stringify(ataTx));

            const { blockhash: blockhashAta, lastValidBlockHeight: lastValidBlockHeightAta } = await connection.getLatestBlockhash();
            ataTx.recentBlockhash = blockhashAta;
            ataTx.lastValidBlockHeight = lastValidBlockHeightAta;
            ataTx.feePayer = anchorWallet.publicKey;
            const signedTxAta = await anchorWallet?.signTransaction(ataTx);
            const sigAta = await connection.sendRawTransaction(signedTxAta.serialize());
            console.log("sigAta", sigAta);

            

            console.log("Destination Token Account:", destinationTokenAccount.toBase58());
            setShareholderDestinationTokenAccount(destinationTokenAccount);

            const tx = new web3.Transaction()

            const addAccountToWhiteListInstruction = await transferHookProgram.methods
                .addToWhitelist()
                .accounts({
                    newAccount: destinationTokenAccount,
                    signer: anchorWallet.publicKey,
                })
                .instruction();
            tx.add(addAccountToWhiteListInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));
            const serializedTransaction = tx.serialize({ requireAllSignatures: false, });
            const base64 = serializedTransaction.toString("base64");
            console.log("TEST TX", base64);

            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);
        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);

    const onUnwhitelistShareholder = useCallback(async () => {
        if (!anchorWallet) return;
        try {
            if (!mint) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);

            if (!shareholder) {
                console.log("No shareholder available");
                return;
            }

            const tx = new web3.Transaction()

            const removeShareholderInstruction = await tokenProgram.methods
                .removeShareholder()
                .accounts({
                    shareholder: shareholder,
                    company: companyAccount,
                    payer: anchorWallet.publicKey,
                })
                .instruction();
            tx.add(removeShareholderInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));

            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);
        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);

    const onInitializeShareholderByCompany = useCallback(async () => {
        if (!anchorWallet) return;
        try {
            if (!mint) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const transferHookProgram = new Program(idl2 as TransferHook, provider);
            const tokenProgram = new Program(idl as TokenContract, provider);

            if (!shareholder.toString()) {
                console.log("No shareholder available");
                return;
            }

            const tx = new web3.Transaction()

            const bnShareholderVotingPower = new BN(shareholderVotingPower);

            if (bnShareholderVotingPower.isZero()) {
                console.log("Voting power is 0");
                return;
            }

            const newShareholderAccountAddress = Keypair.generate();

            const initializeShareholderByCompanyInstruction = await tokenProgram.methods
                .addShareholderByCompany(
                    // @ts-ignore
                    shareholder,
                    bnShareholderVotingPower
                )
                .accounts({
                    company: companyAccount,
                    shareholder: newShareholderAccountAddress.publicKey,
                    payer: anchorWallet.publicKey,
                })
                .instruction();
            tx.add(initializeShareholderByCompanyInstruction);

            // const sig = await sendTransaction(tx, connection, {
            //     signers: [newShareholderAccountAddress]
            // });

            // console.log('Transaction Signature:', sig);

            const votingPowerSol = bnShareholderVotingPower * 10 ** 9;
            console.log("votingPowerSol", votingPowerSol.toString());
            if (BigInt(votingPowerSol) === BigInt(0)) {
                console.log("Voting power is 0");
                return;
            }
            console.log("treasury", treasury.toString());
            console.log("shareholderDestinationTokenAccount", shareholderDestinationTokenAccount.toString()); //TODO: this can be not initialized yet

            const tx2 = new web3.Transaction()
            
            const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
                connection,
                treasury as PublicKey,
                mint.publicKey,
                shareholderDestinationTokenAccount as PublicKey,
                anchorWallet.publicKey,
                new BN(votingPowerSol),
                9,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )
            tx2.add(transferInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx2.recentBlockhash = blockhash;
            tx2.feePayer = anchorWallet.publicKey;

            const signedTx2 = await anchorWallet?.signTransaction(tx2);
            const sig2 = await connection.sendRawTransaction(signedTx2.serialize());

            console.log('Transaction Signature:', sig2);

            console.log(JSON.stringify(tx2));
            
        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);
    return (
        <div className="page">
            <h1>Company</h1>
            <div className='card'>
                <h2 className='card-title'>Create Company</h2>
                <div className='input-group'>
                    <input type="text" placeholder="Company Name" value={nftName} onChange={(e) => setNftName(e.target.value)} />
                </div>
                <div className='input-group'>
                    <input type="text" placeholder="Company Token Symbol" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} />
                </div>
                <div className='input-group'>
                    <input type="text" placeholder="Total Supply" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} />
                </div>
                <div className='button-container'>
                    <button onClick={onInitializeCompany} disabled={!wallet?.publicKey || !nftName || !nftDescription || !totalSupply}>
                        Create Company
                    </button>
                </div>
            </div>
            <div className='card'>
                <h2 className='card-title'>Add Shareholder to Whitelist</h2>
                <div className='input-group'>
                    <input type="text" placeholder="Wallet Address" value={shareholder.toString()} onChange={(e) => setShareholder(new PublicKey(e.target.value))} />
                </div>
                <div className='button-container'>
                    <button onClick={onWhitelistShareholder} disabled={!wallet?.publicKey || !shareholder}>
                        Add the Shareholder to the Whitelist
                    </button>
                </div>
            </div>
            <div className='card'>
                <h2 className='card-title'>Remove Shareholder from Whitelist</h2>
                <div className='input-group'>
                    <input type="text" placeholder="Wallet Address" value={shareholder.toString()} onChange={(e) => setShareholder(new PublicKey(e.target.value))} />
                </div>
                <div className='button-container'>
                    <button onClick={onUnwhitelistShareholder} disabled={!wallet?.publicKey || !shareholder}>
                        Remove the Shareholder from the Whitelist
                    </button>
                </div>
            </div>
            <div className='card'>
                <h2 className='card-title'>Manage Shareholder Voting Power</h2>
                <div className='input-group'>
                    <input type="text" placeholder="Wallet Address" value={shareholder.toString()} onChange={(e) => setShareholder(new PublicKey(e.target.value))} />
                </div>
                <div className='input-group'>
                    <input type="text" placeholder="Shareholder Voting Power" value={shareholderVotingPower} onChange={(e) => setShareholderVotingPower(e.target.value)} />
                </div>
                <div className='button-container'>
                    <button onClick={onInitializeShareholderByCompany} disabled={!wallet?.publicKey || !shareholder}>
                        Initialize Shareholder By Company
                    </button>
                </div>
            </div>
            <div className="card">
                <h2>Associated Shareholder Public Keys</h2>
                <ul>
                    {shareholderPubkeys.map((pubkey, index) => (
                        <li key={index}>{pubkey}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const Shareholders: FC = () => {
    const wallet = useAnchorWallet();
    const { publicKey, sendTransaction } = useWallet();
    const [nftName, setNftName] = useState('');
    const [shareholder, setShareholder] = useState<PublicKey | Address>('');
    const [mint, setMint] = useState<Keypair | null>(null);
    const [companyAccount, setCompanyAccount] = useState<PublicKey | Address>('');
    const [nftDescription, setNftDescription] = useState('');
    const [totalSupply, setTotalSupply] = useState('');
    const [extraAccountMetaList, setExtraAccountMetaList] = useState<PublicKey | Address>('');
    const [whitelist, setWhitelist] = useState<PublicKey | Address>('');
    const [treasury, setTreasury] = useState<PublicKey | null>(null);
    const [shareholderVotingPower, setShareholderVotingPower] = useState('');
    const [shareholderVote, setShareholderVote] = useState('');
    const [poll, setPoll] = useState<PublicKey | Address>('');
    const [optionId, setOptionId] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>([]);
    const anchorWallet = useMemo(() => {
        if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);
    const onInitializeShareholderByShareholder = useCallback(async () => {
        if (!anchorWallet) return;
        try {
            if (!mint) return;
            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
            const tokenProgram = new Program(idl as TokenContract, provider);

            if (!shareholder || shareholder.toString() === '') {
                console.log("No shareholder available");
                return;
            }

            const destinationTokenAccount = getAssociatedTokenAddressSync(
                mint.publicKey,
                // @ts-ignore
                shareholder,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            const tx = new web3.Transaction()
            const votingPowerSol = new BN(shareholderVotingPower) * 10 ** 9;
            console.log("votingPowerSol", votingPowerSol.toString());
            if (BigInt(votingPowerSol) === BigInt(0)) {
                console.log("Voting power is 0");
                return;
            }

            if (!shareholder) {
                console.log("No shareholder available");
                return;
            }

            const initializeShareholderByShareholderInstruction = await tokenProgram.methods
                .addShareholderByShareholder(
                    // @ts-ignore
                    votingPowerSol,
                    // @ts-ignore
                    shareholder
                )
                .accounts({
                    shareholder: shareholder,
                    payer: anchorWallet.publicKey,
                    company: companyAccount,
                })
                .instruction();
            tx.add(initializeShareholderByShareholderInstruction);

            const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
                connection,
                // @ts-ignore
                new PublicKey(treasury),
                mint.publicKey,
                destinationTokenAccount,
                anchorWallet.publicKey,
                new BN(shareholderVotingPower),
                6,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID,
            );
            tx.add(transferInstruction);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = anchorWallet.publicKey;

            console.log(JSON.stringify(tx));

            const signedTx = await anchorWallet?.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction Signature:', sig);
        } catch (error) {
            console.error('Error:', error);
        }
    }, [anchorWallet, nftName, shareholder, mint]);
    return (
        <div className="page">
            <h1>Shareholders</h1>
            <div className='card'>
                <h2 className='card-title'>Manage Shareholder Voting Power</h2>
                <div className='input-group'>
                    <input type="text" placeholder="Wallet Address" value={shareholder.toString()} onChange={(e) => setShareholder(new PublicKey(e.target.value))} />
                </div>
                <div className='input-group'>
                    <input type="text" placeholder="Shareholder Voting Power" value={shareholderVotingPower} onChange={(e) => setShareholderVotingPower(e.target.value)} />
                </div>
                <div className='button-container'>
                    <button onClick={onInitializeShareholderByShareholder} disabled={!wallet?.publicKey || !shareholder}>
                        Initialize Shareholder By Shareholder
                    </button>
                </div>
            </div>
        </div>
    );
};
