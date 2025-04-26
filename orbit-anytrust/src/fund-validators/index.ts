import { providers, Wallet, ethers } from 'ethers'
import dotenv from 'dotenv'
import type { TransactionResponse } from '@ethersproject/abstract-provider'

// Load environment variables from .env file
dotenv.config()

export async function fundValidators(): Promise<void> {
  // Required environment variables
  const privateKey = process.env.PRIVATE_KEY
  const PARENT_CHAIN_RPC = process.env.PARENT_CHAIN_RPC
  const BATCH_POSTER_ADDRESS = process.env.BATCH_POSTER_ADDRESS
  const STAKER_ADDRESS = process.env.STAKER_ADDRESS

  // Validate environment variables
  if (!privateKey || !PARENT_CHAIN_RPC || !BATCH_POSTER_ADDRESS || !STAKER_ADDRESS) {
    throw new Error(
      'Missing required environment variables: PRIVATE_KEY, PARENT_CHAIN_RPC, BATCH_POSTER_ADDRESS, STAKER_ADDRESS',
    )
  }

  try {
    // Setup parent chain provider and signer
    const parentProvider = new providers.JsonRpcProvider(PARENT_CHAIN_RPC)
    const parentSigner = new Wallet(privateKey, parentProvider)

    console.log('🏦 Funding validators on parent chain...')

    // Fund batch poster
    console.log('💸 Funding batch-poster account with 0.3 ETH')
    const batchPosterTx: TransactionResponse = await parentSigner.sendTransaction({
      to: BATCH_POSTER_ADDRESS,
      value: ethers.utils.parseEther('0.3'),
    })
    console.log(`📝 Batch poster funding tx: ${batchPosterTx.hash}`)
    await batchPosterTx.wait()

    // Fund staker
    console.log('💸 Funding staker account with 0.3 ETH')
    const stakerTx: TransactionResponse = await parentSigner.sendTransaction({
      to: STAKER_ADDRESS,
      value: ethers.utils.parseEther('0.3'),
    })
    console.log(`📝 Staker funding tx: ${stakerTx.hash}`)
    await stakerTx.wait()

    console.log('✅ Successfully funded validators on parent chain')
  } catch (error) {
    console.error('❌ Error funding validators:', error)
    throw error
  }
}

// Invoke the function when the script is run directly
fundValidators().catch((error) => {
  console.error('❌ Script execution failed:', error)
  process.exit(1)
})
