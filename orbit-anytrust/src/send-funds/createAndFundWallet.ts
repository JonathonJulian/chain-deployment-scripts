import "@nomicfoundation/hardhat-ethers";
import { providers, Wallet, utils } from 'ethers';
import * as dotenv from "dotenv";

dotenv.config();

// Define an interface for wallet info
interface WalletInfo {
  address: string;
  privateKey: string;
  balance: string;
}

async function main() {
  const orbitChainRpcUrl = process.env.ORBIT_CHAIN_RPC;
  if (!orbitChainRpcUrl) {
    throw new Error('Please set the ORBIT_CHAIN_RPC environment variable.');
  }

  // Get the funding key
  const funderKey = process.env.FUNDER_PRIVATE_KEY;
  if (!funderKey) {
    throw new Error('Please set the FUNDER_PRIVATE_KEY environment variable.');
  }

  // Get list of private keys to create accounts with
  const targetPrivateKeys = process.env.PRIVATE_KEYS;
  if (!targetPrivateKeys) {
    throw new Error('Please set the PRIVATE_KEYS environment variable.');
  }

  // Parse comma-delimited list of private keys
  const privateKeys = targetPrivateKeys.split(',').map(key => key.trim()).filter(key => key);
  console.log(`Found ${privateKeys.length} private keys to create accounts with`);

  // Get amount to send to each wallet
  const amount = process.env.AMOUNT || '1000';
  console.log(`Will send ${amount} tokens to each account`);

  // Initialize provider
  const provider = new providers.JsonRpcProvider(orbitChainRpcUrl);

  // Initialize the funding wallet
  const funderWallet = new Wallet(funderKey, provider);
  const funderAddress = await funderWallet.getAddress();

  // Get funder balance
  const funderBalance = await provider.getBalance(funderAddress);
  console.log(`Funder address: ${funderAddress}`);
  console.log(`Funder balance: ${utils.formatEther(funderBalance)} tokens`);

  // Calculate total required amount
  const totalRequired = parseFloat(amount) * privateKeys.length;
  if (parseFloat(utils.formatEther(funderBalance)) < totalRequired) {
    console.warn(`WARNING: Funder balance may not be sufficient for all accounts!`);
    console.warn(`Required: ${totalRequired}, Available: ${utils.formatEther(funderBalance)}`);
  }

  // Create and fund accounts
  const createdAccounts: WalletInfo[] = [];

  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    console.log(`\nProcessing account ${i + 1}/${privateKeys.length}...`);

    try {
      // Create wallet from private key
      const wallet = new Wallet(privateKey, provider);
      const address = await wallet.address;

      console.log(`Account address: ${address}`);

      // Check if account already has a balance
      const initialBalance = await provider.getBalance(address);
      console.log(`Initial balance: ${utils.formatEther(initialBalance)} tokens`);

      // Send funds
      console.log(`Funding account with ${amount} tokens...`);

      const tx = await funderWallet.sendTransaction({
        to: address,
        value: utils.parseEther(amount),
        gasLimit: 101000
      });

      console.log('Transaction sent. Tx hash:', tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);

      // Verify the balance
      const newBalance = await provider.getBalance(address);
      console.log(`New balance: ${utils.formatEther(newBalance)} tokens`);

      createdAccounts.push({
        address,
        privateKey,
        balance: utils.formatEther(newBalance)
      });

    } catch (error) {
      console.error(`Failed to create account ${i + 1}:`, error);
      // Continue with next account
    }
  }

  // Summary
  console.log('\n===== SUMMARY =====');
  console.log(`Successfully created and funded ${createdAccounts.length} account(s)`);
  createdAccounts.forEach((account, index) => {
    console.log(`\nAccount #${index + 1}:`);
    console.log(`Address: ${account.address}`);
    console.log(`Private Key: ${account.privateKey}`);
    console.log(`Balance: ${account.balance} tokens`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in script:", error);
    process.exit(1);
  });
