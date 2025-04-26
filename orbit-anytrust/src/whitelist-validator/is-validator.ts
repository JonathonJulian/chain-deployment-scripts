import { providers, Contract } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function testIsValidator() {
  // Initialize provider
  const orbitChainRpcUrl =
    process.env.PARENT_CHAIN_RPC || "https://arbitrum-sepolia.arbitrum.io/rpc";
  const provider = new providers.JsonRpcProvider(orbitChainRpcUrl);

  // Contract address and ABI
  const rollupContractAddress =
    process.env.ROLLUP_CONTRACT_ADDRESS ||
    "0xc2AB89C3fEca85cC1c0bA967bA05690b58793230";

  try {
    // First verify the contract exists
    const code = await provider.getCode(rollupContractAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address ${rollupContractAddress}`);
    }

    const rollupAbi = [
      "function isValidator(address _validator) external view returns (bool)",
    ];

    const rollupContract = new Contract(
      rollupContractAddress,
      rollupAbi,
      provider
    );

    const validatorAddress =
      process.env.VALIDATOR_ADDRESS ||
      "0x2eff6a9fbfd9a87e9236b333648acdd61032f671";

    console.log(`Checking if address ${validatorAddress} is a validator...`);
    const isValidator: boolean = await rollupContract.isValidator(validatorAddress);
    console.log(`Is address ${validatorAddress} a validator?`, isValidator);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unknown error:", error);
    }
    process.exit(1);
  }
}

testIsValidator();
