import "@nomicfoundation/hardhat-ethers"
import { providers, Wallet, utils } from 'ethers'
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Script started...");

  // Initialize providers for both regions
  console.log("Initializing providers...");
  const usProvider = new providers.JsonRpcProvider('https://http-rpc.devnet.gas.network');
  const frankfurtProvider = new providers.JsonRpcProvider('https://http-rpc.frankfurt.devnet.gas.network');
  
  console.log("Setting up wallet...");
  const senderPrivateKey = "0x21cc1548fbc603b9dad0f7fa805623bb6ef5c39511240b7efaf2f9431705b214";
  const senderWallet = new Wallet(senderPrivateKey, usProvider);
  
  const receiverAddress = "0x48Da5C31390252D92b846d789790dC8eA8Dc2b1C";

  // Test provider connections

  console.log("Testing US provider connection...");
  try {
    const usBlock = await Promise.race([
      usProvider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
    ]);
    console.log("US Provider block number:", usBlock);
  } catch (error) {
    console.error("Error connecting to US provider:", error);
    console.error("Provider URL:", usProvider.connection.url);
    process.exit(1);
  }

  console.log("Testing Frankfurt provider connection...");
  try {
    const frankfurtBlock = await Promise.race([
      frankfurtProvider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
    ]);
    console.log("Frankfurt Provider block number:", frankfurtBlock);
  } catch (error) {
    console.error("Error connecting to Frankfurt provider:", error);
    console.error("Provider URL:", frankfurtProvider.connection.url);
    process.exit(1);
  }

  // Retry mechanism variables
  const maxRetries = 5;
  let retryCount = 0;
  let transactionSent = false;

  console.log("Starting transaction process...");
  while (retryCount < maxRetries) {
    try {
      // Get the current nonce
      console.log("Getting nonce...");
      const signerAddress = await senderWallet.getAddress();
      console.log("Signer address:", signerAddress);

      let currentNonce = await usProvider.getTransactionCount(
        signerAddress,
        "pending"
      );
      console.log("Current nonce:", currentNonce);

      const nonceBuffer = 0;
      currentNonce += nonceBuffer;
      console.log("Adjusted nonce:", currentNonce);

      // Record start time before sending transaction
      const startTime = Date.now();
      console.log(`Preparing to send 5 GNT (Attempt ${retryCount + 1}, Nonce: ${currentNonce})...`);
      
      const tx = await senderWallet.sendTransaction({
        to: receiverAddress,
        value: utils.parseEther("1"),
        nonce: currentNonce,
        gasLimit: 21000 * 2,
        maxFeePerGas: utils.parseUnits("2", "gwei"),
        maxPriorityFeePerGas: utils.parseUnits("1", "gwei"),
      });

      console.log('Transaction sent. Time to submit:', Date.now() - startTime, 'ms');

      // Wait for US receipt first
      console.log('Waiting for US receipt...');
      const usReceipt = await tx.wait();
      console.log('\nUS Transaction Receipt:');
      console.log('--------------------------------');
      console.log(`Block number: ${usReceipt.blockNumber}`);
      console.log(`Block hash: ${usReceipt.blockHash}`);
      console.log(`Gas used: ${usReceipt.gasUsed.toString()}`);

      console.log('\nWaiting for transaction to appear in Frankfurt...');

      // Poll Frankfurt endpoint until transaction is found
      let txFound = false;
      let pollCount = 0;
      const maxPolls = 10000000000000000; // Add maximum number of polls

      while (!txFound && pollCount < maxPolls) {
        pollCount++;
        console.log(`Polling attempt ${pollCount}...`);

        try {
          const frankfurtTx = await frankfurtProvider.getTransaction(tx.hash);
          if (frankfurtTx) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log('\nTransaction Propagation Metrics:');
            console.log('--------------------------------');
            console.log(`Total time: ${duration}ms`);
            console.log(`Time in seconds: ${duration / 1000} seconds`);
            
            // Wait for confirmation and get block details
            const receipt = await frankfurtTx.wait();
            console.log(`Block number: ${receipt.blockNumber}`);
            console.log(`Block hash: ${receipt.blockHash}`);
            
            txFound = true;
            transactionSent = true;
            break;
          }
        } catch (error) {
          console.log(`Poll failed, error:`, error);
        }
        
        // Small delay between polls
        console.log("Waiting 50ms before next poll...");
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (pollCount >= maxPolls) {
        console.log("Maximum polling attempts reached without finding transaction");
        break;
      }

      break;

    } catch (error: unknown) {
      console.error("Caught error:", error);
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
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.error("Fatal error in script:", error);
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

  console.log("Script completed successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main:", error);
    process.exit(1);
  });
