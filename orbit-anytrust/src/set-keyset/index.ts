import * as dotenv from 'dotenv';
dotenv.config();

import { Chain, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { setValidKeysetPrepareTransactionRequest } from '@arbitrum/orbit-sdk';
import { sanitizePrivateKey } from '@arbitrum/orbit-sdk/utils';

function getBlockExplorerUrl(chain: Chain) {
  return chain.blockExplorers?.default.url;
}

// Check for required environment variables
if (
  typeof process.env.PRIVATE_KEY === 'undefined' ||
  process.env.PRIVATE_KEY === ''
) {
  throw new Error(`Please provide the "PRIVATE_KEY" environment variable`);
}

if (
  typeof process.env.PARENT_CHAIN_RPC === 'undefined' ||
  process.env.PARENT_CHAIN_RPC === ''
) {
  console.warn(
    `Warning: You may encounter timeout errors while running the script with the default RPC endpoint. Please provide the "PARENT_CHAIN_RPC" environment variable instead.`
  );
}

if (
  typeof process.env.UPGRADE_EXECUTOR_ADDRESS === 'undefined' ||
  process.env.UPGRADE_EXECUTOR_ADDRESS === ''
) {
  throw new Error(`Please provide the "UPGRADE_EXECUTOR_ADDRESS" environment variable`);
}

if (
  typeof process.env.SEQUENCER_INBOX_ADDRESS === 'undefined' ||
  process.env.SEQUENCER_INBOX_ADDRESS === ''
) {
  throw new Error(`Please provide the "SEQUENCER_INBOX_ADDRESS" environment variable`);
}

if (typeof process.env.KEYSET === 'undefined' || process.env.KEYSET === '') {
  throw new Error(`Please provide the "KEYSET" environment variable`);
}

if (
  typeof process.env.PRIVATE_KEY === 'undefined' ||
  process.env.PRIVATE_KEY === ''
) {
  throw new Error(`Please provide the "PRIVATE_KEY" environment variable`);
}

// Read the keyset from the environment variable
const keyset = process.env.KEYSET! as `0x${string}`;

// Set the parent chain and create a public client for it
const parentChain = arbitrumSepolia;
const parentChainPublicClient = createPublicClient({
  chain: parentChain,
  transport: http(process.env.PARENT_CHAIN_RPC || parentChain.rpcUrls.default.http[0]),
});

// Load the deployer account
const deployer = privateKeyToAccount(sanitizePrivateKey(process.env.PRIVATE_KEY));

async function main() {
  // Prepare the transaction setting the keyset
  const txRequest = await setValidKeysetPrepareTransactionRequest({
    coreContracts: {
      upgradeExecutor: process.env.UPGRADE_EXECUTOR_ADDRESS! as `0x${string}`,
      sequencerInbox: process.env.SEQUENCER_INBOX_ADDRESS! as `0x${string}`,
    },
    keyset,
    account: deployer.address as `0x${string}`,
    publicClient: parentChainPublicClient,
  });

  // Sign and send the transaction
  const txHash = await parentChainPublicClient.sendRawTransaction({
    serializedTransaction: await deployer.signTransaction(txRequest),
  });

  // Wait for the transaction receipt
  const txReceipt = await parentChainPublicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  console.log(
    `Keyset updated in ${getBlockExplorerUrl(parentChain)}/tx/${txReceipt.transactionHash}`
  );
}

main();