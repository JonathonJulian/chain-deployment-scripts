import { Chain, createPublicClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import {
  createRollupPrepareDeploymentParamsConfig,
  prepareChainConfig,
  createRollupEnoughCustomFeeTokenAllowance,
  createRollupPrepareCustomFeeTokenApprovalTransactionRequest,
  createRollupPrepareTransactionRequest,
  createRollupPrepareTransactionReceipt,
} from '@arbitrum/orbit-sdk';
import { sanitizePrivateKey, generateChainId } from '@arbitrum/orbit-sdk/utils';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';

config();

function generateRandomPrivateKey(): string {
  return '0x' + randomBytes(32).toString('hex');
}

function withFallbackPrivateKey(privateKey?: string): string {
  if (privateKey) {
    return privateKey;
  } else {
    const newKey = generateRandomPrivateKey();
    console.log('Generated New Private Key:', newKey);
    return newKey;
  }
}

function getBlockExplorerUrl(chain: Chain) {
  return chain.blockExplorers?.default.url;
}

if (typeof process.env.PRIVATE_KEY === 'undefined') {
  throw new Error(`Please provide the "PRIVATE_KEY" environment variable`);
}

if (typeof process.env.TOKEN_ADDRESS === 'undefined') {
  throw new Error(`Please provide the "TOKEN_ADDRESS" environment variable`);
}

if (typeof process.env.PARENT_CHAIN_RPC === 'undefined' || process.env.PARENT_CHAIN_RPC === '') {
  console.warn(
    `Warning: you may encounter timeout errors while running the script with the default rpc endpoint. Please provide the "PARENT_CHAIN_RPC" environment variable instead.`,
  );
}

// Load or generate a random batch poster account
const batchPosterPrivateKey = withFallbackPrivateKey(process.env.BATCH_POSTER_PRIVATE_KEY);
const batchPosterAccount = privateKeyToAccount(batchPosterPrivateKey as `0x${string}`);
const batchPoster: Address = batchPosterAccount.address;

// Print Batch Poster Address and Private Key
console.log('=== Batch Poster Account ===');
console.log(`Address: ${batchPoster}`);
console.log('-----------------------------\n');

// Load or generate a random validator account
const validatorPrivateKey = withFallbackPrivateKey(process.env.VALIDATOR_PRIVATE_KEY) as `0x${string}`;
const validatorAccount = privateKeyToAccount(validatorPrivateKey);
const validator: Address = validatorAccount.address;

// Print Validator Address and Private Key
console.log('=== Validator Account ===');
console.log(`Address: ${validator}`);
console.log('---------------------------\n');

// Set the parent chain and create a public client for it
const parentChain = arbitrumSepolia;
const parentChainPublicClient = createPublicClient({
  chain: parentChain,
  transport: http(process.env.PARENT_CHAIN_RPC!),
});

// Load the deployer account
const deployer = privateKeyToAccount(sanitizePrivateKey(process.env.PRIVATE_KEY));

// Print Deployer Address
console.log('=== Deployer Account ===');
console.log(`Address: ${deployer.address}`);
console.log('-------------------------\n');

async function main() {
  // Generate a random chain id
  const chainId = generateChainId();
  console.log(`Generated Chain ID: ${chainId}\n`);

  // Set the custom fee token
  const nativeToken: Address = process.env.TOKEN_ADDRESS as `0x${string}`;

  // Create the chain config
  const chainConfig = prepareChainConfig({
    chainId,
    arbitrum: {
      InitialChainOwner: deployer.address,
      DataAvailabilityCommittee: true,
    },
  });

  const allowanceParams = {
    nativeToken,
    account: deployer.address,
    publicClient: parentChainPublicClient,
  };

  if (!(await createRollupEnoughCustomFeeTokenAllowance(allowanceParams))) {
    const approvalTxRequest = await createRollupPrepareCustomFeeTokenApprovalTransactionRequest(
      allowanceParams,
    );

    // Sign and send the transaction
    const approvalTxHash = await parentChainPublicClient.sendRawTransaction({
      serializedTransaction: await deployer.signTransaction(approvalTxRequest),
    });

    // Get the transaction receipt after waiting for the transaction to complete
    const approvalTxReceipt = createRollupPrepareTransactionReceipt(
      await parentChainPublicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
      }),
    );

    console.log(
      `Tokens approved in ${getBlockExplorerUrl(parentChain)}/tx/${
        approvalTxReceipt.transactionHash
      }`,
    );
  }

  // Prepare the transaction for deploying the core contracts
  const txRequest = await createRollupPrepareTransactionRequest({
    params: {
      config: createRollupPrepareDeploymentParamsConfig(parentChainPublicClient, {
        chainId: BigInt(chainId),
        owner: deployer.address,
        chainConfig,
      }),
      batchPosters: [batchPoster],
      validators: [validator],
      nativeToken,
    },
    account: deployer.address,
    publicClient: parentChainPublicClient,
  });

  // Sign and send the transaction
  const txHash = await parentChainPublicClient.sendRawTransaction({
    serializedTransaction: await deployer.signTransaction(txRequest),
  });

  // Get the transaction receipt after waiting for the transaction to complete
  const txReceipt = createRollupPrepareTransactionReceipt(
    await parentChainPublicClient.waitForTransactionReceipt({ hash: txHash }),
  );

  console.log(`Deployed in ${getBlockExplorerUrl(parentChain)}/tx/${txReceipt.transactionHash}`);
  console.log(`ORBIT_DEPLOYMENT_TX_HASH: ${txReceipt.transactionHash}`);
}

main();