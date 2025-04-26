// scripts/whitelistValidator.ts
import "@nomicfoundation/hardhat-ethers"
import { providers, Wallet, utils } from 'ethers'
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const orbitChainRpcUrl = process.env.ORBIT_CHAIN_RPC;
  if (!orbitChainRpcUrl) {
    throw new Error('Please set the ORBIT_CHAIN_RPC environment variable.');
  }

  // Sender's private key (from .env file)
  const senderPrivateKey = process.env.PRIVATE_KEY;
  if (!senderPrivateKey) {
    throw new Error('Please set the PRIVATE_KEY environment variable.');
  }

  // Destination address (from .env file)
  const destinationAddress = process.env.DESTINATION_ADDRESS;
  if (!destinationAddress) {
    throw new Error('Please set the DESTINATION_ADDRESS environment variable.');
  }

  // Initialize provider and wallet
  const provider = new providers.JsonRpcProvider(orbitChainRpcUrl);
  const wallet = new Wallet(senderPrivateKey, provider);

  // Retry mechanism variables
  const maxRetries = 5;
  let retryCount = 0;
  let transactionSent = false;

  while (!transactionSent && retryCount < maxRetries) {
    try {
      // Get the current nonce, including pending transactions
      const signerAddress = await wallet.getAddress();
      let currentNonce = await provider.getTransactionCount(
        signerAddress,
        "pending"
      );

      // Add buffer to the nonce to anticipate rapid nonce increments
      const nonceBuffer = 0;
      currentNonce += nonceBuffer;

      // Send 10 GNT
      console.log(
        `Sending 10 GNT to ${destinationAddress} (Attempt ${
          retryCount + 1
        }, Nonce: ${currentNonce})...`
      );

      const tx = await wallet.sendTransaction({
        to: destinationAddress,
        value: utils.parseEther("1000"),
        nonce: currentNonce,
      });

      console.log('Transaction sent. Tx hash:', tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);

      transactionSent = true;

      // Verify the balance
      const balance = await provider.getBalance(destinationAddress);
      console.log(`Destination wallet balance: ${utils.formatEther(balance)} GNT`);

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
