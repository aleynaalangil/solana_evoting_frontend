// import { ConnectionProvider, WalletProvider, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
// import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram } from '@solana/web3.js';
// import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
// import * as anchor from '@coral-xyz/anchor';
// import { Program, AnchorProvider, web3, utils, Address } from '@coral-xyz/anchor';
// import logo from './solana.png';
// import React from 'react';
// import idl from './idls/token_contract.json';
// import idl2 from './idls/transfer_hook.json';
// import { TransferHook } from './types/transfer_hook';
// import { TokenContract } from './types/token_contract';
// import { BN } from 'bn.js';
// import {
//     TOKEN_2022_PROGRAM_ID,
//     ExtensionType,
//     createInitializeMintInstruction,
//     createInitializeTransferHookInstruction,
//     getMintLen,
//     createInitializeMetadataPointerInstruction,
//     createInitializePermanentDelegateInstruction,
//     ASSOCIATED_TOKEN_PROGRAM_ID,
//     getAssociatedTokenAddressSync,
//     createTransferCheckedWithTransferHookInstruction,
// } from '@solana/spl-token';
// import {
//     createInitializeInstruction,
// } from "@solana/spl-token-metadata";
// require('@solana/wallet-adapter-react-ui/styles.css');
// require('./App.css');

// const App: FC = () => {
//     return (
//         <Context>
//             <Content />
//         </Context>
//     );
// };
// export default App;

// const Context: FC<{ children: ReactNode }> = ({ children }) => {
//     const customClusterEndpoint = "https://api.devnet.solana.com";
//     const endpoint = customClusterEndpoint;
//     const wallets = useMemo(() => [new PhantomWalletAdapter()], []);


//     return (
//         <ConnectionProvider endpoint={endpoint}>
//             <WalletProvider wallets={wallets} autoConnect>
//                 <WalletModalProvider>{children}</WalletModalProvider>
//             </WalletProvider>
//         </ConnectionProvider>
//     );
// };

// const Content: FC = () => {
//     const wallet = useAnchorWallet();
//     const { publicKey, sendTransaction } = useWallet();
//     const [nftName, setNftName] = useState('');
//     const [shareholder, setShareholder] = useState('');
//     const [mint, setMint] = useState<Keypair | null>(null);
//     const [companyAccount, setCompanyAccount] = useState<PublicKey | Address>('');
//     const [nftDescription, setNftDescription] = useState('');
//     const [totalSupply, setTotalSupply] = useState('');
//     const [extraAccountMetaList, setExtraAccountMetaList] = useState<PublicKey | Address>('');
//     const [whitelist, setWhitelist] = useState<PublicKey | Address>('');
//     const [treasury, setTreasury] = useState<PublicKey | null>(null);
//     const [shareholderVotingPower, setShareholderVotingPower] = useState('');
//     const [shareholderVote, setShareholderVote] = useState('');
//     const [poll, setPoll] = useState<PublicKey | Address>('');
//     const [optionId, setOptionId] = useState('');
//     const [pollOptions, setPollOptions] = useState<string[]>([]);
//     const anchorWallet = useMemo(() => {
//         if (!wallet?.publicKey || !wallet?.signTransaction || !wallet.signAllTransactions) return null;
//         return {
//             publicKey: wallet.publicKey,
//             signTransaction: wallet.signTransaction.bind(wallet),
//             signAllTransactions: wallet.signAllTransactions.bind(wallet),
//         };
//     }, [wallet]);

//     const onInitializeCompany = useCallback(async () => {
//         if (!anchorWallet) return;
//         try {
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const transferHookProgram = new Program(idl2 as TransferHook, provider);
//             const tokenProgram = new Program(idl as TokenContract, provider);
//             const ATA_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");


//             // seeds = [b"company", payer.key().as_ref()],
//             const [companyAccount] = PublicKey.findProgramAddressSync(
//                 [Buffer.from('company'), anchorWallet.publicKey.toBytes()],
//                 tokenProgram.programId
//             );
//             console.log("companyAccount", companyAccount.toBase58());
//             setCompanyAccount(companyAccount);
//             // seeds = [b"token-2022-token", signer.key().as_ref(), token_name.as_bytes()],

//             const mint = new Keypair();
//             setMint(mint);

//             const [treasury] = await anchor.web3.PublicKey.findProgramAddressSync( // TODO:this can be wrong.. double check
//                 [anchorWallet.publicKey.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.publicKey.toBytes()],
//                 ATA_PROGRAM_ID,
//             );
//             setTreasury(treasury);

//             console.log("treasury", treasury.toBase58());

//             const extensions = [ExtensionType.TransferHook, ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate];
//             const mintLen = getMintLen(extensions);
//             const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);
//             console.log("lamports", lamports); // how much lamports to create the mint (SOL)

//             const init = new web3.Transaction().add(
//                 SystemProgram.createAccount({
//                     fromPubkey: anchorWallet.publicKey,
//                     newAccountPubkey: mint.publicKey,
//                     space: mintLen,
//                     lamports: lamports,
//                     programId: TOKEN_2022_PROGRAM_ID,
//                 }),
//                 SystemProgram.transfer({
//                     fromPubkey: anchorWallet.publicKey,
//                     toPubkey: mint.publicKey,
//                     lamports: lamports
//                 }));


//             const initSig = await sendTransaction(init, connection, {
//                 signers: [mint]
//             });
//             console.log("initSig", initSig);

//             console.log("transfer hook", transferHookProgram.programId.toBase58());
//             console.log("token program", TOKEN_2022_PROGRAM_ID.toBase58());


//             const tx = new web3.Transaction().add(
//                 createInitializeTransferHookInstruction(
//                     mint.publicKey,
//                     anchorWallet.publicKey,
//                     transferHookProgram.programId, // Transfer Hook Program ID
//                     TOKEN_2022_PROGRAM_ID,
//                 ),
//                 createInitializeMetadataPointerInstruction(
//                     mint.publicKey, // Mint Account address
//                     anchorWallet.publicKey, // Authority that can set the metadata address
//                     mint.publicKey, // Account address that holds the metadata
//                     TOKEN_2022_PROGRAM_ID
//                 ),
//                 createInitializePermanentDelegateInstruction(
//                     mint.publicKey,
//                     anchorWallet.publicKey,
//                     TOKEN_2022_PROGRAM_ID,
//                 ),
//                 createInitializeMintInstruction(
//                     mint.publicKey, // Mint Account Address
//                     9, // Decimals of Mint
//                     anchorWallet.publicKey, // Designated Mint Authority
//                     null, // Optional Freeze Authority
//                     TOKEN_2022_PROGRAM_ID // Token Extension Program ID
//                 ),
//                 createInitializeInstruction({
//                     programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
//                     metadata: mint.publicKey, // Account address that holds the metadata
//                     updateAuthority: anchorWallet.publicKey, // Authority that can update the metadata
//                     mint: mint.publicKey, // Mint Account address
//                     mintAuthority: anchorWallet.publicKey, // Designated Mint Authority
//                     name: nftName,
//                     symbol: nftDescription,
//                     uri: "https://github.com/aleynaalangil/demo_company/blob/main/README.md",
//                 }),
//             );

//             const initializeExtraAccountMetaListIx = await transferHookProgram.methods
//                 .initializeExtraAccountMetaList()
//                 .accounts({
//                     mint: mint.publicKey,
//                 })
//                 .instruction();
//             tx.add(initializeExtraAccountMetaListIx);

//             const createCompanyIx = await tokenProgram.methods.initializeCompany(
//                 nftName,
//                 nftDescription,
//                 new BN(totalSupply),
//                 mint.publicKey,
//                 treasury)
//                 .accounts({
//                     // @ts-ignore
//                     company: companyAccount,
//                     payer: anchorWallet.publicKey,
//                     tokenProgram: TOKEN_2022_PROGRAM_ID,
//                     systemProgram: SystemProgram.programId,
//                 })
//                 .instruction()
//             tx.add(createCompanyIx);

//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));


//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             console.log('Transaction Signature:', sig);
//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName]);

//     const onWhitelistShareholder = useCallback(async () => {
//         if (!anchorWallet) return;
//         try {
//             if (!mint) return;
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const transferHookProgram = new Program(idl2 as TransferHook, provider);

//             const destinationTokenAccount = getAssociatedTokenAddressSync(
//                 mint.publicKey,
//                 new PublicKey(shareholder),
//                 false,
//                 TOKEN_2022_PROGRAM_ID,
//                 ASSOCIATED_TOKEN_PROGRAM_ID,
//             );

//             const tx = new web3.Transaction()

//             const addAccountToWhiteListInstruction = await transferHookProgram.methods
//                 .addToWhitelist()
//                 .accounts({
//                     newAccount: destinationTokenAccount,
//                     signer: anchorWallet.publicKey,
//                 })
//                 .instruction();
//             tx.add(addAccountToWhiteListInstruction);

//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));

//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             console.log('Transaction Signature:', sig);
//             const auth_accounts = (await transferHookProgram.account.whiteList.all()).map(account => account.account.authority.toBase58())
//             const whitelist_accounts = (await transferHookProgram.account.whiteList.all()).map(account => account.account.whiteList.every(account => account.toBase58()))
//             const account_publickeys = (await transferHookProgram.account.whiteList.all()).map(account => account.publicKey.toBase58())
//             const whitelist = await transferHookProgram.account.whiteList.all()
//             console.log("auth_accounts", auth_accounts);
//             console.log("whitelist_accounts", whitelist_accounts);
//             console.log("account_publickeys", account_publickeys);
//             console.log("whitelist", whitelist);
//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName, shareholder, mint]);

//     const onInitializeShareholderByCompany = useCallback(async () => {
//         if (!anchorWallet) return;
//         try {
//             if (!mint) return;
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const transferHookProgram = new Program(idl2 as TransferHook, provider);
//             const tokenProgram = new Program(idl as TokenContract, provider);

//             const destinationTokenAccount = getAssociatedTokenAddressSync(
//                 mint.publicKey,
//                 new PublicKey(shareholder),
//                 false,
//                 TOKEN_2022_PROGRAM_ID,
//                 ASSOCIATED_TOKEN_PROGRAM_ID,
//             );



//             // if (shareholder) {

//             const tx = new web3.Transaction()

//             const initializeShareholderByCompanyInstruction = await tokenProgram.methods
//                 .addShareholderByCompany(
//                     new PublicKey(companyAccount)
//                 )
//                 .accounts({
//                     shareholder: shareholder,
//                     payer: anchorWallet.publicKey,
//                     company: companyAccount,
//                 })
//                 .instruction();
//             tx.add(initializeShareholderByCompanyInstruction);

//             // Standard token transfer instruction
//             const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
//                 connection,
//                 // @ts-ignore
//                 new PublicKey(treasury),
//                 mint.publicKey,
//                 destinationTokenAccount,
//                 anchorWallet.publicKey,
//                 new BN(shareholderVotingPower),
//                 6,
//                 [],
//                 'confirmed',
//                 TOKEN_2022_PROGRAM_ID,
//             );
//             tx.add(transferInstruction);



//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));

//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             // const initSig = await sendTransaction(tx2, connection, {
//             //     signers: [] // there will be one different signer for shareholder
//             // });
//             // console.log("initSig", initSig);

//             console.log('Transaction Signature:', sig);
//             // }
//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName, shareholder, mint]);
//     const onInitializeShareholderByShareholder = useCallback(async () => {
//         if (!anchorWallet) return;
//         try {
//             if (!mint) return;
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const tokenProgram = new Program(idl as TokenContract, provider);

//             const destinationTokenAccount = getAssociatedTokenAddressSync(
//                 mint.publicKey,
//                 new PublicKey(shareholder),
//                 false,
//                 TOKEN_2022_PROGRAM_ID,
//                 ASSOCIATED_TOKEN_PROGRAM_ID,
//             );

//             const tx = new web3.Transaction()

//             const initializeShareholderByShareholderInstruction = await tokenProgram.methods
//                 .addShareholderByShareholder(
//                     new PublicKey(companyAccount)
//                 )
//                 .accounts({
//                     shareholder: shareholder,
//                     payer: anchorWallet.publicKey,
//                     company: companyAccount,
//                 })
//                 .instruction();
//             tx.add(initializeShareholderByShareholderInstruction);

//             const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
//                 connection,
//                 // @ts-ignore
//                 new PublicKey(treasury),
//                 mint.publicKey,
//                 destinationTokenAccount,
//                 anchorWallet.publicKey,
//                 new BN(shareholderVotingPower),
//                 6,
//                 [],
//                 'confirmed',
//                 TOKEN_2022_PROGRAM_ID,
//             );
//             tx.add(transferInstruction);

//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));

//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             console.log('Transaction Signature:', sig);
//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName, shareholder, mint]);

//     const onInitPoll = useCallback(async (selectedOptions: string[]) => {
//         if (!anchorWallet) return;
//         try {
//             if (!mint) return;
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const tokenProgram = new Program(idl as TokenContract, provider);

//             const poll: string[] = selectedOptions; // u need to get this from the user
//             const pollKeypair = new Keypair();

//             const tx = new web3.Transaction()

//             const initializePollInstruction = await tokenProgram.methods
//                 .initializePoll(poll)
//                 .accounts({
//                     poll: pollKeypair.publicKey,
//                     owner: anchorWallet.publicKey,
//                 })
//                 .signers([pollKeypair])
//                 .instruction();

//             tx.add(initializePollInstruction);

//             const pollState = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
//             console.log("pollState", pollState.options.map(option => option.label));
//             console.log("pollState", pollState.voters.map(voter => voter.toBase58()));

//             setPoll(pollKeypair.publicKey);
//             setPollOptions(pollState.options.map(option => option.label));

//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));

//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             console.log('Transaction Signature:', sig);
//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName, shareholder, mint]);

//     const onVote = useCallback(async (optionId: number) => {
//         if (!anchorWallet) return;
//         try {
//             if (!mint) return;
//             const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
//             const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
//             const tokenProgram = new Program(idl as TokenContract, provider);

//             const tx = new web3.Transaction()

//             const shareholder = await tokenProgram.account.shareholder.fetch(new PublicKey(anchorWallet.publicKey));

//             if (shareholder.votingPower === 0) {
//                 return;
//             }

//             const optionFromShareholderVote = optionId;

//             if (optionFromShareholderVote < 0 || optionFromShareholderVote >= pollOptions.length) {
//                 return;
//             }
//             //already voted or poll over is checked in the contract

//             const voteInstruction = await tokenProgram.methods
//                 .vote(optionFromShareholderVote)
//                 .accounts({
//                     poll: poll,
//                     shareholder: anchorWallet.publicKey
//                 })
//                 .instruction();
//             tx.add(voteInstruction);

//             const { blockhash } = await connection.getLatestBlockhash();
//             tx.recentBlockhash = blockhash;
//             tx.feePayer = anchorWallet.publicKey;

//             console.log(JSON.stringify(tx));

//             const signedTx = await anchorWallet?.signTransaction(tx);
//             const sig = await connection.sendRawTransaction(signedTx.serialize());

//             console.log('Transaction Signature:', sig);


//         } catch (error) {
//             console.error('Error:', error);
//         }
//     }, [anchorWallet, nftName, shareholder, mint, pollOptions]);


//     return (
//         <div className="App">
//             <header className="title-header">
//                 Solana E-Voting Platform
//             </header>
//             <img src={logo} alt="Logo" className="logo" />
//             <WalletMultiButton className="WalletMultiButton" />
//             <div>
//                 <input type="text" placeholder="Company Name" value={nftName} onChange={(e) => setNftName(e.target.value)} />
//                 <input type="text" placeholder="Company Token Symbol" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} />
//                 <input type="text" placeholder="Total Supply" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} />
//                 <button onClick={onInitializeCompany} disabled={!wallet?.publicKey || !nftName || !nftDescription || !totalSupply}>
//                     Create Company
//                 </button>
//             </div>
//             <div>
//                 <input type="text" placeholder="Wallet Address" value={shareholder} onChange={(e) => setShareholder(e.target.value)} />
//                 <button onClick={onWhitelistShareholder} disabled={!wallet?.publicKey || !shareholder}>
//                     Add the Shareholder to the Whitelist
//                 </button>
//             </div>
//             <div>
//                 <input type="text" placeholder="Wallet Address" value={shareholder} onChange={(e) => setShareholder(e.target.value)} />
//                 <input type="text" placeholder="Shareholder Voting Power" value={shareholderVotingPower} onChange={(e) => setShareholderVotingPower(e.target.value)} />
//                 <button onClick={onInitializeShareholderByCompany} disabled={!wallet?.publicKey || !shareholder}>
//                     Initialize Shareholder By Company
//                 </button>
//             </div>
//             <div>
//                 <input type="text" placeholder="Wallet Address" value={shareholder} onChange={(e) => setShareholder(e.target.value)} />
//                 <input type="text" placeholder="Shareholder Voting Power" value={shareholderVotingPower} onChange={(e) => setShareholderVotingPower(e.target.value)} />
//                 <button onClick={onInitializeShareholderByShareholder} disabled={!wallet?.publicKey || !shareholder}>
//                     Initialize Shareholder By Shareholder
//                 </button>
//             </div>
//             <div>
//                 <input
//                     type="text"
//                     placeholder="Enter poll options separated by commas (e.g., Option1, Option2, Option3, Option4 - there cannot be more than 4 options or less than 2 options)"
//                     onChange={(e) => setPollOptions(e.target.value.split(',').map(option => option.trim()))}
//                 />
//                 <button
//                     onClick={() => {
//                         const selectedOptions = pollOptions.slice(0, 4);
//                         onInitPoll(selectedOptions);
//                     }}
//                     disabled={!wallet?.publicKey || pollOptions.length < 2 || pollOptions.length > 4}
//                 >
//                     Initialize Poll
//                 </button>
//             </div>
//             <div>
//                 <div>
//                     <input
//                         type="text"
//                         placeholder="Option Id"
//                         value={optionId}
//                         onChange={(e) => setOptionId(e.target.value)}
//                     />
//                     <button onClick={() => {
//                         const optionFromShareholderVote = parseInt(optionId, 10); // Convert input to integer
//                         onVote(optionFromShareholderVote);
//                     }} disabled={!wallet?.publicKey || optionId === ''}>
//                         Submit Vote
//                     </button>
//                 </div>
//             </div>
//         </div>

//     );
// };