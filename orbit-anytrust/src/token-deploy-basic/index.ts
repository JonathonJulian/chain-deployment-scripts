import "@nomicfoundation/hardhat-ethers"
import { ethers, run } from "hardhat";
import { utils } from "ethers";
const { arbLog, requireEnvVariables } = require("arb-shared-dependencies");
import * as dotenv from "dotenv";

dotenv.config();
requireEnvVariables(['PRIVATE_KEY', 'PARENT_CHAIN_RPC', 'ARBISCAN_API_KEY']);

const INITIAL_SUPPLY = utils.parseEther('500000000');

async function main() {
  await arbLog('Deploying Basic Custom Token to Arbitrum Sepolia Testnet');

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${await deployer.getAddress()}`);

  const basicTokenFactory = await ethers.getContractFactory('BasicERC20');
  console.log('Deploying Basic Custom Token...');
  const basicToken = await basicTokenFactory.deploy(INITIAL_SUPPLY);

  await basicToken.waitForDeployment();
  console.log(`Basic Custom Token deployed at: ${basicToken.target}`);

  console.log('Verifying contract on Arbiscan...');
  try {
    await run('verify:verify', {
      address: basicToken.target,
      constructorArguments: [INITIAL_SUPPLY.toString()],
      contract: 'contracts/BasicERC20.sol:BasicERC20',
    });
    console.log('Contract verified successfully!');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error verifying contract:', error.message);
    } else {
      console.error('Error verifying contract:', error);
    }
  }

  console.log('Deployment completed successfully!');
  console.log(`Basic Custom Token Address: ${basicToken.target}`);
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exitCode = 1;
});
