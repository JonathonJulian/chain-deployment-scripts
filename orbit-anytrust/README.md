# orbit-devnet

# 🚀 Orbit Chain Deployment Prerequisites

## Prerequisites

### 1. Install NVM (Node Version Manager)

- **Download and Install NVM**: Follow the instructions on the [NVM GitHub page](https://github.com/nvm-sh/nvm#installing-and-updating) to install NVM on your system.
- **Verify Installation**: Run `nvm --version` to ensure NVM is installed correctly.

### 2. Install Node.js

- **Use NVM to Install Node.js**: Run `nvm install node` to install the latest version of Node.js.
- **Set Default Node Version**: Run `nvm use node` to set the installed version as the default.

### 3. Install pnpm

- **Install pnpm Package Manager**: Run `npm install --global pnpm` to install pnpm globally.
- **Verify Installation**: Run `pnpm --version` to ensure pnpm is installed correctly.

### 4. MetaMask Setup

- **Install MetaMask**: [MetaMask Download](https://metamask.io/download.html)
- **Create a New Account**: Follow the MetaMask setup instructions to create a new wallet.
- **Add Arbitrum Sepolia Network**:
  - **Network Name**: Arbitrum Sepolia
  - **RPC URL**: `https://sepolia-rollup.arbitrum.io/rpc`
  - **Chain ID**: `421614`
  - **Currency Symbol**: `ETH`
  - **Block Explorer URL**: `https://sepolia.arbiscan.io/`

### 5. Fund Your MetaMask Wallet

- **Get Sepolia ETH**: Use the [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia) to obtain Sepolia ETH.
- **Minimum Balance**: Ensure your wallet has at least **5 ETH** on Arbitrum Sepolia.

---

With these prerequisites in place, you're ready to proceed with the Orbit chain deployment process. Make sure your MetaMask wallet is connected to the Arbitrum Sepolia network and funded with the required ETH.

## Deployment

### Environment Variables

Before deploying the ERC20 token, ensure the following environment variables are set:

- **PRIVATE_KEY**: Your Ethereum account's private key. This is used to sign transactions.
- **PARENT_CHAIN_RPC**: The RPC URL of the parent chain (e.g., Ethereum mainnet or testnet).
- **ARBISCAN_API_KEY**: Your API key for Arbiscan, used for contract verification.

You can set these variables in a `.env` file at the root of your project:

```
PRIVATE_KEY=your_private_key_here
PARENT_CHAIN_RPC=https://your_rpc_url_here
ARBISCAN_API_KEY=your_arbiscan_api_key_here
```

### Deploying the ERC20 Token

To deploy the ERC20 token to the Arbitrum Sepolia Testnet, run the following command:

```
pnpm deploy-erc20
```

This command will:

1. Deploy the BasicERC20 token to the Arbitrum Sepolia Testnet.
2. Verify the contract on Arbiscan.
3. Output the deployed contract address.

### Post-Deployment Steps

1. **Check Contract Verification**: After deployment, visit [Arbiscan](https://sepolia.arbiscan.io/) and search for your contract address to ensure it has been verified successfully.

2. **Store the Contract Address**: Add the deployed contract address to your `.env` file for future reference:

```
TOKEN_ADDRESS=your_deployed_contract_address_here
```

Ensure your MetaMask wallet is connected to the Arbitrum Sepolia network and funded with the required ETH before running the script.

## Deploying the Chain

### Environment Variables

Before deploying the chain, ensure the following environment variables are set:

- **PRIVATE_KEY**: Your Ethereum account's private key. This is used to sign transactions.
- **PARENT_CHAIN_RPC**: The RPC URL of the parent chain (e.g., Ethereum mainnet or testnet).
- **TOKEN_ADDRESS**: The address of the ERC20 token to be used as the native token for the chain.
- **BATCH_POSTER_PRIVATE_KEY** (optional): Private key for the batch poster account. If not provided, a random key will be generated.
- **VALIDATOR_PRIVATE_KEY** (optional): Private key for the validator account. If not provided, a random key will be generated.

You can set these variables in a `.env` file at the root of your project:

```
PRIVATE_KEY=your_private_key_here
PARENT_CHAIN_RPC=https://your_rpc_url_here
TOKEN_ADDRESS=your_erc20_token_address_here
BATCH_POSTER_PRIVATE_KEY=your_batch_poster_private_key_here
VALIDATOR_PRIVATE_KEY=your_validator_private_key_here
```

### Deploying the Chain

To deploy the chain to Arbitrum using the provided script, run the following command:

```
pnpm deploy-chain
```

This command will:

1. Generate a random chain ID.
2. Set the custom fee token using the provided ERC20 token address.
3. Prepare and send transactions to deploy the core contracts.
4. Output the transaction hash and link to the block explorer for verification.

Ensure your MetaMask wallet is connected to the Arbitrum Sepolia network and funded with the required ETH before running the script.

## Funding Validators and Batch Poster

### Environment Variables

Before running the `fund-validators` script, ensure the following environment variables are set:

- **PRIVATE_KEY**: Your Ethereum account's private key. This is used to sign transactions.
- **PARENT_CHAIN_RPC**: The RPC URL of the parent chain (e.g., Ethereum mainnet or testnet).
- **BATCH_POSTER_ADDRESS**: The address of the batch poster account to be funded.
- **STAKER_ADDRESS**: The address of the validator account to be funded.

You can set these variables in a `.env` file at the root of your project:

```
PRIVATE_KEY=your_private_key_here
PARENT_CHAIN_RPC=https://your_rpc_url_here
BATCH_POSTER_ADDRESS=your_batch_poster_address_here
STAKER_ADDRESS=your_staker_address_here
```

### Running the Fund Validators Script

To fund the validator and batch poster accounts, run the following command:

```
pnpm fund-validators
```

This command will:

1. Fund the batch poster account with 0.3 ETH.
2. Fund the staker (validator) account with 0.3 ETH.
3. Output the transaction hashes for each funding transaction.

Ensure your MetaMask wallet is connected to the Arbitrum Sepolia network and funded with the required ETH before running the script.

## Generating the Chain Configuration

### Environment Variables

Before generating the chain configuration, ensure the following environment variables are set. These should have been obtained from previous deployment steps:

- **PRIVATE_KEY**: Your Ethereum account's private key. This is used to sign transactions.
- **PARENT_CHAIN_RPC**: The RPC URL of the parent chain (e.g., Ethereum mainnet or testnet).
- **TOKEN_ADDRESS**: The address of the deployed ERC20 token, which acts as the native token for the chain.
- **BATCH_POSTER_PRIVATE_KEY**: Private key for the batch poster account. This should have been generated or set during the chain deployment.
- **VALIDATOR_PRIVATE_KEY**: Private key for the validator account. This should have been generated or set during the chain deployment.

You can set these variables in a `.env` file at the root of your project:

```
PRIVATE_KEY=your_private_key_here
PARENT_CHAIN_RPC=https://your_rpc_url_here
TOKEN_ADDRESS=your_erc20_contract_address_here
BATCH_POSTER_PRIVATE_KEY=your_batch_poster_private_key_here
VALIDATOR_PRIVATE_KEY=your_validator_private_key_here
```

### Running the Chain Config Generation Script

To generate the chain configuration, run the following command:

```
pnpm get-chain-config
```

This command will:

1. Use the provided environment variables to prepare the chain configuration.
2. Output the configuration details necessary for further deployment or setup steps.

Ensure your MetaMask wallet is connected to the Arbitrum Sepolia network and funded with the required ETH before running the script.
