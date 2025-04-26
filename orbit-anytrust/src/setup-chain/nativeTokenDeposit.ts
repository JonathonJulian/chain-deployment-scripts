import { ethers } from 'ethers'
import { getL2Network, AdminErc20Bridger } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import fs from 'fs'

async function sendEthOrDepositERC20(
  erc20Inbox: ethers.Contract,
  l2Signer: ethers.Wallet,
  l2Provider: ethers.providers.Provider
) {
  const configRaw = fs.readFileSync(
    './config/orbitSetupScriptConfig.json',
    'utf-8'
  )
  const config = JSON.parse(configRaw)
  const nativeToken = config.nativeToken

  // Get chain ID and L2 network info
  const chainId = (await l2Provider.getNetwork()).chainId
  const orbitNetwork = await getL2Network(Number(chainId))
  const adminTokenBridger = new AdminErc20Bridger(orbitNetwork)

  if (nativeToken === ethers.constants.AddressZero) {
    // Send 0.4 ETH if nativeToken is zero address
    const inboxAddress = config.inbox
    const depositEthInterface = new ethers.utils.Interface([
      'function depositEth() public payable',
    ])

    const contract = new ethers.Contract(
      inboxAddress,
      depositEthInterface,
      l2Signer
    )
    const tx = await contract.depositEth({
      value: ethers.utils.parseEther('0.4'),
    })
    console.log('Transaction hash on parent chain: ', tx.hash)
    await tx.wait()
    console.log('0.4 ETHs are deposited to your account')
  } else {
    // For custom gas token chains
    console.log('Using custom gas token for deposit')

    const nativeTokenContract = new ethers.Contract(
      nativeToken,
      ERC20__factory.abi,
      l2Signer
    )

    console.log('Approving native token for deposit through inbox')
    const approveTx = await nativeTokenContract.approve(
      erc20Inbox.address,
      ethers.constants.MaxUint256
    )
    const approveTxReceipt = await approveTx.wait()
    console.log(
      'Transaction hash for approval: ',
      approveTxReceipt.hash
    )

    const decimals = await nativeTokenContract.decimals()
    if (decimals !== 18) {
      throw new Error('We currently only support 18 decimals token')
    }

    // Use AdminErc20Bridger for the deposit
    const depositParams = {
      amount: ethers.utils.parseUnits('0.4', decimals),
      erc20L1Address: nativeToken,
      l1Signer: l2Signer,
      l2Provider: l2Provider
    }

    console.log('Depositing tokens through bridge')
    const depositTx = await adminTokenBridger.deposit(depositParams)
    const depositRec = await depositTx.wait()
    console.log('Deposit transaction hash:', depositRec.transactionHash)

    // Wait for L2 message to be processed
    const l1ToL2Messages = await depositRec.getL1ToL2Messages(l2Provider)
    if (l1ToL2Messages && l1ToL2Messages.length > 0) {
      const status = await l1ToL2Messages[0].waitForStatus()
      console.log('L2 message status:', status)
    }

    console.log('Native Token has been Deposited')
  }
}

export async function ethOrERC20Deposit(
  privateKey: string,
  L2_RPC_URL: string
) {
  if (!privateKey || !L2_RPC_URL) {
    throw new Error('Required environment variable not found')
  }

  const l2Provider = new ethers.providers.JsonRpcProvider(L2_RPC_URL)
  const l2Signer = new ethers.Wallet(privateKey, l2Provider)

  const configRaw = fs.readFileSync(
    './config/orbitSetupScriptConfig.json',
    'utf-8'
  )
  const config = JSON.parse(configRaw)
  const ERC20InboxAddress = config.inbox

  const erc20Inbox = new ethers.Contract(
    ERC20InboxAddress,
    ['function depositERC20(uint256) public returns (uint256)'],
    l2Signer
  )

  await sendEthOrDepositERC20(erc20Inbox, l2Signer, l2Provider)
}
