// scripts/whitelistValidator.ts
import "@nomicfoundation/hardhat-ethers"

import { providers, Wallet, Contract, utils } from 'ethers'
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Replace these with your actual values or set them in the .env file
  const parentChainRpcUrl = process.env.PARENT_CHAIN_RPC;

  // Chain owner's private key (from .env file)
  const chainOwnerPrivateKey = process.env.CHAIN_OWNER_PRIVATE_KEY;
  if (!chainOwnerPrivateKey) {
    throw new Error('Please set the CHAIN_OWNER_PRIVATE_KEY environment variable.');
  }

  // Validator address to whitelist
  const validatorAddress = process.env.VALIDATOR_ADDRESS || '0x2eFf6a9FbFD9A87E9236B333648Acdd61032F671';

  // Contract addresses (replace with your actual addresses or set them in the .env file)
  const upgradeExecutorAddress = process.env.UPGRADE_EXECUTOR_ADDRESS || '0xYourUpgradeExecutorAddress'; // Replace with your upgradeExecutor contract address
  const rollupContractAddress = process.env.ROLLUP_CONTRACT_ADDRESS || '0xc2AB89C3fEca85cC1c0bA967bA05690b58793230'; // Replace with your Rollup contract address

  // Initialize provider and wallet
  const provider = new providers.JsonRpcProvider(parentChainRpcUrl);
  const wallet = new Wallet(chainOwnerPrivateKey, provider);

  // ABIs
  const upgradeExecutorAbi = [
    'function executeCall(address destAddr, bytes data) public returns(bytes memory)'
  ];

  const rollupAbi = [
    'function isValidator(address) view returns (bool)',
    'function setValidator(address[] calldata _validators, bool[] calldata _val) external'
  ];

  // Create contract instances
  const upgradeExecutorContract = new Contract(upgradeExecutorAddress, upgradeExecutorAbi, wallet);
  const rollupInterface = new utils.Interface(rollupAbi);

  // Encode calldata for setValidator
  const validators = [validatorAddress];
  const values = [true];

  const calldata = rollupInterface.encodeFunctionData('setValidator', [validators, values]);

  console.log('Calldata:', calldata);

  // Retry mechanism variables
  const maxRetries = 5;
  let retryCount = 0;
  let transactionSent = false;

  while (!transactionSent && retryCount < maxRetries) {
    try {
      // Get the current nonce, including pending transactions
      const signerAddress = await wallet.getAddress();
      console.log('Signer Address:', signerAddress);
      const latestNonce = await provider.getTransactionCount(signerAddress, 'latest');
      const pendingNonce = await provider.getTransactionCount(signerAddress, 'pending');
      console.log('Nonce values - latest:', latestNonce, 'pending:', pendingNonce);
      let currentNonce = pendingNonce;

      // Add buffer to the nonce to anticipate rapid nonce increments
      // Adjust the buffer size based on how many transactions the bot sends rapidly
      const nonceBuffer = 0; // Example buffer size
      currentNonce += nonceBuffer;

      // Send the transaction with the adjusted nonce
      console.log(
        `Sending transaction to whitelist validator (Attempt ${
          retryCount + 1
        }, Nonce: ${currentNonce})...`
      );

      const tx = await upgradeExecutorContract.executeCall(rollupContractAddress, calldata, {
        nonce: currentNonce,
        // Optionally specify gasLimit and gasPrice
        // gasLimit: 1_000_000,
        // gasPrice: ethers.parseUnits("20", "gwei"),
      });

      console.log('Transaction sent. Tx hash:', tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);

      transactionSent = true;

      // Verify that the validator is whitelisted
      const rollupContract = new Contract(rollupContractAddress, rollupAbi, provider);
      const isValidator: boolean = await rollupContract.isValidator(validatorAddress);

      console.log(`Is address ${validatorAddress} a validator?`, isValidator);
    } catch (error: unknown) {
      if (
        typeof error === 'object' && error !== null && 'code' in error &&
        (
          (error as {code?: string}).code === "NONCE_EXPIRED" ||
          (error as {code?: string}).code === "TRANSACTION_REPLACED" ||
          ((error as {code?: string}).code === "UNPREDICTABLE_GAS_LIMIT" &&
            'message' in error && typeof (error as {message?: string}).message === 'string' &&
            (error as {message: string}).message.includes("nonce too low"))
        )
      ) {
        console.error("Nonce error encountered. Retrying with updated nonce...");
        retryCount++;
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.error("Error in script:", error);
        process.exit(1);
      }
    }
  }

  if (!transactionSent) {
    console.error(
      "Failed to send transaction after maximum retries. Please try again later."
    );
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in script:", error);
    process.exit(1);
  });
