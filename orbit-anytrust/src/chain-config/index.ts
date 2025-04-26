import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Chain, createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import {
  ChainConfig,
  PrepareNodeConfigParams,
  createRollupPrepareTransaction,
  createRollupPrepareTransactionReceipt,
  prepareNodeConfig,
} from '@arbitrum/orbit-sdk';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

function getRpcUrl(chain: Chain) {
  return chain.rpcUrls.default.http[0];
}

// Check and load required environment variables
if (typeof process.env.ORBIT_DEPLOYMENT_TRANSACTION_HASH === 'undefined') {
  throw new Error(`Please provide the "ORBIT_DEPLOYMENT_TRANSACTION_HASH" environment variable`);
}

if (typeof process.env.BATCH_POSTER_PRIVATE_KEY === 'undefined') {
  throw new Error(`Please provide the "BATCH_POSTER_PRIVATE_KEY" environment variable`);
}

if (typeof process.env.VALIDATOR_PRIVATE_KEY === 'undefined') {
  throw new Error(`Please provide the "VALIDATOR_PRIVATE_KEY" environment variable`);
}

if (typeof process.env.PARENT_CHAIN_RPC === 'undefined' || process.env.PARENT_CHAIN_RPC === '') {
  console.warn(
    `Warning: you may encounter timeout errors while running the script with the default RPC endpoint. Please provide the "PARENT_CHAIN_RPC" environment variable instead.`,
  );
}

// Set the parent chain and create a public client for it
const parentChain = arbitrumSepolia;
const parentChainPublicClient = createPublicClient({
  chain: parentChain,
  transport: http(process.env.PARENT_CHAIN_RPC),
});

async function main() {
  // Transaction hash for the transaction to create rollup
  const txHash = process.env.ORBIT_DEPLOYMENT_TRANSACTION_HASH as `0x${string}`;

  // Get the transaction
  const tx = createRollupPrepareTransaction(
    await parentChainPublicClient.getTransaction({ hash: txHash }),
  );

  // Get the transaction receipt
  const txReceipt = createRollupPrepareTransactionReceipt(
    await parentChainPublicClient.getTransactionReceipt({ hash: txHash }),
  );

  // Get the chain config from the transaction inputs
  const chainConfig: ChainConfig = JSON.parse(tx.getInputs()[0].config.chainConfig);


  // Get the core contracts from the transaction receipt
  const coreContracts = txReceipt.getCoreContracts();


  // Prepare the node config
  const nodeConfigParameters: PrepareNodeConfigParams = {
    chainName: 'Gas Network',
    chainConfig,
    coreContracts,
    batchPosterPrivateKey: process.env.BATCH_POSTER_PRIVATE_KEY as `0x${string}`,
    validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY as `0x${string}`,
    parentChainId: parentChain.id,
    parentChainRpcUrl: process.env.PARENT_CHAIN_RPC || getRpcUrl(parentChain),
  };

  const nodeConfig = prepareNodeConfig(nodeConfigParameters);

  // Ensure output directory exists
  const outputDir = path.resolve(__dirname, '../../chain');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Write node-config.json to the specified directory
  const nodeConfigPath = path.join(outputDir, 'node-config.json');
  await writeFile(nodeConfigPath, JSON.stringify(nodeConfig, null, 2));
  console.log(`Node config written to "${nodeConfigPath}"`);

  // Now prepare the orbitSetupScriptConfig.json data
  // Extract necessary data
  const { chainId } = chainConfig;
  const { InitialChainOwner: chainOwner } = chainConfig.arbitrum;

  const {
    rollup,
    inbox,
    bridge,
    sequencerInbox,
    outbox,
    rollupEventInbox,
    challengeManager,
    adminProxy,
    upgradeExecutor,
    validatorUtils,
    validatorWalletCreator,
    deployedAtBlockNumber,
    nativeToken,
  } = coreContracts;

  // Set networkFeeReceiver and infrastructureFeeCollector to chainOwner
  const networkFeeReceiver = chainOwner;
  const infrastructureFeeCollector = chainOwner;

  // Additional chain information
  const chainName = 'Gas Network'; // Replace with actual chain name if required
  const minL2BaseFee = 100000000; // Replace with actual value if available
  const parentChainId = parentChain.id;
  const parentChainNodeUrl = process.env.PARENT_CHAIN_RPC || getRpcUrl(parentChain);

  // Build the setupScript object
  const setupScript = {
    networkFeeReceiver,
    infrastructureFeeCollector,
    staker: process.env.VALIDATOR_ADDRESS,
    batchPoster: process.env.BATCH_POSTER_ADDRESS,
    chainOwner,
    chainId,
    chainName,
    minL2BaseFee,
    parentChainId,
    'parent-chain-node-url': parentChainNodeUrl,
    utils: validatorUtils,
    rollup,
    inbox,
    nativeToken,
    outbox,
    rollupEventInbox,
    challengeManager,
    adminProxy,
    sequencerInbox,
    bridge,
    upgradeExecutor,
    validatorUtils,
    validatorWalletCreator,
    deployedAtBlockNumber,
  };

  // Write orbitSetupScriptConfig.json to the specified directory
  const setupScriptPath = path.join(outputDir, 'orbitSetupScriptConfig.json');
  await writeFile(setupScriptPath, JSON.stringify(setupScript, null, 4));
  console.log(`Setup script written to "${setupScriptPath}"`);
}

main().catch((error) => {
  console.error('Error generating configurations:', error);
  process.exit(1);
});