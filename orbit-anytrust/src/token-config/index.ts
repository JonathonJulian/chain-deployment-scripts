import { providers, Wallet, Contract, utils } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ArbOwner precompile address on Arbitrum Sepolia
const ARB_OWNER_ADDRESS = "0x0000000000000000000000000000000000000070";

// ABI for ArbOwner precompile
const ARB_OWNER_ABI = [
  "function setL1PricePerUnit(address token, uint256 pricePerUnit) external",
  "function setL1PricingRewardRate(address token, uint64 weiPerUnit) external",
  "function isChainOwner(address addr) external view returns (bool)",
  // ... include other relevant functions if needed
];

// Validate necessary environment variables
if (!process.env.ORBIT_CHAIN_RPC) {
  console.error("Error: ORBIT_CHAIN_RPC is not defined in the environment variables.");
  process.exit(1);
}

if (!process.env.PRIVATE_KEY) {
  console.error("Error: PRIVATE_KEY is not defined in the environment variables.");
  process.exit(1);
}

if (!process.env.TOKEN_ADDRESS) {
  console.error("Error: TOKEN_ADDRESS is not defined in the environment variables.");
  process.exit(1);
}
// Initialize the provider
const provider = new providers.JsonRpcProvider(process.env.ORBIT_CHAIN_RPC);

// Initialize the wallet (signer) and connect it to the provider
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// Initialize the contract with ABI, address, and signer (wallet)
const arbOwner = new Contract(ARB_OWNER_ADDRESS, ARB_OWNER_ABI, wallet);

// Initialize Interface for debugging
const iface = new utils.Interface(ARB_OWNER_ABI);

async function testProvider() {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected to network. Current block number: ${blockNumber}`);
  } catch (error) {
    console.error("Provider connection failed:", error);
    process.exit(1);
  }
}

async function checkOwnership() {
  try {
    const ownerAddress = await wallet.getAddress();
    const isOwner = await arbOwner.isChainOwner(ownerAddress);
    console.log(`Is the deploying account a Chain Owner? ${isOwner}`);
    if (!isOwner) {
      console.error("Deploying account does not have Chain Owner permissions.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error checking chain ownership:", error);
    process.exit(1);
  }
}

async function configureOrbitChain() {
  try {
    const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as string;

    // **1. Set L1PricePerUnit to 0 for the specified token**
    console.log(`\nAttempting to set L1PricePerUnit for token: ${TOKEN_ADDRESS}`);
    const dataPrice = iface.encodeFunctionData("setL1PricePerUnit", [TOKEN_ADDRESS, 0]);
    console.log(`Encoded data for setL1PricePerUnit: ${dataPrice}`);

    const txPrice = await arbOwner.setL1PricePerUnit(TOKEN_ADDRESS, 0);
    console.log(`setL1PricePerUnit Transaction submitted: ${txPrice.hash}`);
    const receiptPrice = await txPrice.wait();
    console.log("L1PricePerUnit set to 0 successfully.", receiptPrice);

    // **2. Set L1PricingRewardRate to 0 for the specified token**
    console.log(`\nAttempting to set L1PricingRewardRate for token: ${TOKEN_ADDRESS}`);
    const dataReward = iface.encodeFunctionData("setL1PricingRewardRate", [TOKEN_ADDRESS, 0]);
    console.log(`Encoded data for setL1PricingRewardRate: ${dataReward}`);

    const txReward = await arbOwner.setL1PricingRewardRate(TOKEN_ADDRESS, 0);
    console.log(`setL1PricingRewardRate Transaction submitted: ${txReward.hash}`);
    const receiptReward = await txReward.wait();
    console.log("L1PricingRewardRate set to 0 successfully.", receiptReward);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("\nError setting parameters:", error.message);
      console.error("Stack Trace:", error.stack);
    } else {
      console.error("\nUnknown error setting parameters:", error);
    }
    process.exitCode = 1;
  }
}

// Execute test and then configure
testProvider()
  .then(checkOwnership)
  .then(configureOrbitChain)
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exitCode = 1;
  });