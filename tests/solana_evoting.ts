// Import necessary modules
import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import idl from '../src/idls/token_contract.json'; // Update the path as needed
import transferHookIdl from '../src/idls/transfer_hook.json'; // Update the path as needed
import { TransferHook } from '../src/types/transfer_hook';
import { TokenContract } from '../src/types/token_contract';
import { start } from 'solana-bankrun';
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

const TEST_ENDPOINT = 'http://localhost:8899';

interface TestConfig {
  shareholders: number;
  participationRate: number; // e.g., 0.5 for 50% participation
}
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function runTest(config: TestConfig) {
  const context = await start([
    { name: 'token_program', programId: PublicKey.unique() },
    { name: 'transfer_hook_program', programId: PublicKey.unique() }
  ], []);

  const client = context.banksClient;
  const payer = context.payer;
  const blockhash = context.lastBlockhash;
  const connection = new Connection(TEST_ENDPOINT);

  const tokenProgram = new Program<TokenContract>(idl as TokenContract, context[0].programId);
  const transferHookProgram = new Program<TransferHook>(transferHookIdl as TransferHook, context[1].programId,);

  const company = Keypair.generate();
  const treasury = Keypair.generate();
  const poll = Keypair.generate();
  const shareholders: Keypair[] = Array.from({ length: config.shareholders }, () => Keypair.generate());

  console.log(`Test for ${config.shareholders} shareholders with ${config.participationRate * 100}% participation.`);

  try {
    // Derive company
    const [companyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('company'), payer.publicKey.toBytes()],
        tokenProgram.programId
    );

    // Create a brand new mint
    const mintKeypair = Keypair.generate();

    // Treasury ATA
    const treasuryPda = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        payer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );


    // 1) Create the Mint
    const extensions = [ExtensionType.TransferHook, ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const createMintTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        // optional extra, depends on your version
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: mintKeypair.publicKey,
            lamports,
        })
    );
    const createMintSig = await sendAndConfirmTransaction(connection, createMintTx, [mintKeypair]);
    console.log("Create Mint Sig:", createMintSig);
    await sleep(4000);

    // 2) Initialize instructions
    const initTx = new Transaction().add(
        createInitializeTransferHookInstruction(
            mintKeypair.publicKey,
            payer.publicKey,
            transferHookProgram.programId,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMetadataPointerInstruction(
            mintKeypair.publicKey,
            payer.publicKey,
            mintKeypair.publicKey,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializePermanentDelegateInstruction(
            mintKeypair.publicKey,
            payer.publicKey,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            9,
            payer.publicKey,
            null,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mintKeypair.publicKey,
            updateAuthority: payer.publicKey,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            name: "Test Company",
            symbol: "TEST",
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
            payer: payer.publicKey,
            mint: mintKeypair.publicKey, // Not an actual real mint, just a placeholder
        })
        .instruction();
    initTx.add(extraMetaIx);

    // Also "initializeCompany" in your tokenContract
    const createCompanyIx = await tokenProgram.methods
        .initializeCompany(
            "Test Company",
            "TEST",
            new BN(1000000000),
            mintKeypair.publicKey,
            treasuryPda
        )
        .accounts({
            // @ts-ignore
            company: companyPda,
            payer: payer.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .instruction();
    initTx.add(createCompanyIx);

    let { blockhash } = await connection.getLatestBlockhash();
    initTx.recentBlockhash = blockhash;
    initTx.feePayer = payer.publicKey;

    const signedTx = await client.processTransaction(initTx);
    console.log("Init Tx Sig:", signedTx);
    await sleep(3000);

    // 3) Create treasury ATA + Mint tokens
    const finalTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            treasuryPda,
            payer.publicKey,
            mintKeypair.publicKey,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(
            mintKeypair.publicKey,
            treasuryPda,
            payer.publicKey,
            BigInt(1000000000),
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );
    let { blockhash: finalBlockhash } = await connection.getLatestBlockhash();
    finalTx.recentBlockhash = finalBlockhash;
    finalTx.feePayer = payer.publicKey;

    const signedTx2 = await client.processTransaction(finalTx);
    console.log("Mint Tx Sig:", signedTx2);

    // 3. Whitelist Shareholders
     // 1) Derive the 'shareholder' ATA
     const destinationTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        payer.publicKey, // todo: this has to be iterated over
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 3) Create ATA if needed
    const txAta = new Transaction().add(
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            destinationTokenAccount,
            payer.publicKey, // todo: this has to be iterated over
            mintKeypair.publicKey,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
    );

    let { blockhash: blockhash2 } = await connection.getLatestBlockhash();
    txAta.recentBlockhash = blockhash2;
    txAta.feePayer = payer.publicKey;

    const signedAtaTx = await client.processTransaction(txAta);
    console.log("Created Shareholder ATA Sig:", signedAtaTx);
    await sleep(2000);

    // 4) Actually whitelist via `addWhitelistEntry(ATA, anchorWallet)`
    const tx2 = new Transaction();
    const addIx = await transferHookProgram.methods
        .addShareholder(payer.publicKey, destinationTokenAccount)
        .accounts({
            authority: payer.publicKey,
        })
        .instruction();
    tx2.add(addIx);

    // 4) Send the transaction, including the new Keypair as a signer
    const { blockhash: blockhash3 } = await connection.getLatestBlockhash();
    tx2.recentBlockhash = blockhash3;
    tx2.feePayer = payer.publicKey;

    const sig2 = await client.processTransaction(tx2);
    console.log("Whitelisted (ATA, anchorWallet) with signature:", sig2);

    const tx3 = new Transaction();
    const addShareholderIx = await tokenProgram.methods
        .addShareholderByCompany(payer.publicKey, new BN(100000))
        .accounts({
            company: companyPda,
            payer: payer.publicKey
        })
        .instruction();
    tx3.add(addShareholderIx);

    const sig3 = await client.processTransaction(tx3);
    console.log("Add Shareholder Tx Sig:", sig3);
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
            wl.account.wallet.toBase58() === payer.publicKey.toBase58()
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
    const votingPowerAsLamports = new BN(100000).mul(new BN(10 ** 9));
    if (votingPowerAsLamports.isZero()) {
        alert("Voting power is 0 after scaling.");
        return;
    }

    // 5) Transfer with a "transfer hook" instruction
    const tx8 = new Transaction();
    const hookIx = await createTransferCheckedWithTransferHookInstruction(
        connection,
        treasuryPda,
        mintKeypair.publicKey,
        shareholderAta,
        payer.publicKey, // the source authority
        BigInt(100000),
        9,
        [],
        'confirmed',
        TOKEN_2022_PROGRAM_ID
    );
    tx8.add(hookIx);

    let { blockhash: blockhash4 } = await connection.getLatestBlockhash();
    tx8.recentBlockhash = blockhash4;
    tx8.feePayer = payer.publicKey;

    const signedTx8 = await client.processTransaction(tx8);

    console.log("Transfer Hook Tx Sig:", signedTx8);

    // 4. Initialize Poll
    const pollKeypair = Keypair.generate();

    // Build TX
    const tx4 = new Transaction();
    const initPollIx = await tokenProgram.methods
        .initializePoll(['Option A', 'Option B'])
        .accounts({
            poll: pollKeypair.publicKey,
        })
        .instruction();
    tx4.add(initPollIx);

    // Send TX
    const { blockhash: blockhash5 } = await connection.getLatestBlockhash();
    tx4.recentBlockhash = blockhash5;
    tx4.feePayer = payer.publicKey;

    const sig4 = await client.processTransaction(tx4);
    console.log('Poll creation Sig:', sig4);

    // 5. Voting Simulation
    const pollAccount = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
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
        if (sh.account.owner.toBase58() === payer.publicKey.toBase58()) {
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
            pollKeypair.publicKey.toBuffer(),
            payer.publicKey.toBuffer()
        ],
        tokenProgram.programId
    );

    // 4) Calculate user’s "votingPower" from their associated token balance
    const destinationTokenAccount2 = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        payer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const balanceInfo = await connection.getTokenAccountBalance(destinationTokenAccount2);
    const rawUiAmount = balanceInfo.value.uiAmount ?? 0;
    console.log("VotingPower from token account:", rawUiAmount);

    // 5) Build transaction
    const tx5 = new Transaction();
    const voteIdx = Math.floor(Math.random() * 2) + 1; //todo this has to be random between 1 or 2
    if (isNaN(voteIdx)) {
        console.log("Invalid option ID");
        return;
    }

    // In the contract, the method signature is: vote(ctx, vote_id, voting_power)
    // voting_power is a u64 -> BN in JS
    const voteIx = await tokenProgram.methods
        .vote(voteIdx, new BN(rawUiAmount))  // pass the user’s voting power here
        .accounts({
            poll: pollKeypair.publicKey,
            voter: payer.publicKey,   // the signer's wallet
            // voteRecord: voteRecordPda,       // the new PDA that ensures 1 vote max
        })
        .instruction();
    tx5.add(voteIx);

    // 6) Send transaction
    const { blockhash: blockhash6 } = await connection.getLatestBlockhash();
    tx5.recentBlockhash = blockhash6;
    tx5.feePayer = payer.publicKey;

    const signedTx5 = await client.processTransaction(tx5);
    console.log("Vote Tx Sig:", signedTx5);

    // 7) (Optional) Wait, then check if all votes are cast => finish poll
    await sleep(2000);
    const updatedPollAccount = await tokenProgram.account.poll.fetch(pollKeypair.publicKey);
    let pollSum = 0;
    for (const option of updatedPollAccount.options) {
        pollSum += option.votes.toNumber();
    }

    if (pollSum === totalVotes) {
        console.log("Poll is presumably complete. Now finishing poll...");
        const tx6 = new Transaction();
        const tieBreakPollKeypair = Keypair.generate();

        // The contract’s `finishPoll` expects “oldPoll” and “tieBreakPoll”, plus the payer
        // Also ensures "tie_break_poll" is created (init).
        const finishPollIx = await tokenProgram.methods
            .finishPoll()
            .accounts({
                oldPoll: pollKeypair.publicKey,
                tieBreakPoll: tieBreakPollKeypair.publicKey,
                payer: payer.publicKey,
            })
            .signers([tieBreakPollKeypair])  // Because we are creating a new poll account
            .instruction();
        tx6.add(finishPollIx);

        // Prepare the transaction
        const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
        tx6.recentBlockhash = blockhash2;
        tx6.feePayer = payer.publicKey;

        // Must sign for the new poll account creation
        // pass the new poll keypair as well
        const sig6 = await client.processTransaction(tx6);
        console.log("Finish Poll + Tally Sig:", sig6);
    }

    // Assuming you have a function to fetch all shareholders
    const allShareholders2 = await tokenProgram.account.shareholder.all();

    // Function to check if all shareholders have voted
    async function checkAllVoted(pollPublicKey: PublicKey) {
        const pollAccount = await tokenProgram.account.poll.fetch(pollPublicKey);
        const voteRecords = await tokenProgram.account.voteRecord.all();
        return voteRecords.length === allShareholders2.length;
    }

    // Function to conclude the poll
    async function concludePoll(pollPublicKey: PublicKey) {
        const allVoted = await checkAllVoted(pollPublicKey);
        if (!allVoted) {
            console.error("Not all shareholders have voted.");
            return;
        }

        // Proceed to conclude the poll
        // This could involve tallying votes and possibly creating a new poll in case of a tie
        console.log("All shareholders have voted. Concluding the poll...");
        // Additional logic to conclude the poll goes here
    }
  } catch (error) {
    console.error('Error during test execution:', error);
  }
}

async function main() {
  const testCases: TestConfig[] = [
    { shareholders: 10, participationRate: 1.0 },
    { shareholders: 100, participationRate: 0.75 },
    { shareholders: 1000, participationRate: 0.5 },
  ];

  for (const testCase of testCases) {
    await runTest(testCase);
  }
}

main().catch((err) => console.error(err));
