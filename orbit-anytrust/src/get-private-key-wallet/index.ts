import * as fs from 'fs';
import * as readline from 'readline';
import { Wallet } from 'ethers';

// Define interfaces for wallet types
interface WalletWithPrivateKey {
  address: string;
  privateKey: string;
}

interface KeystoreCrypto {
  cipher: string;
  ciphertext: string;
  cipherparams: {
    iv: string;
  };
  kdf: string;
  kdfparams: {
    dklen: number;
    n: number;
    p: number;
    r: number;
    salt: string;
  };
  mac: string;
}

interface KeystoreWallet {
  address: string;
  crypto: KeystoreCrypto;
  version: number;
  id: string;
}

type WalletType = WalletWithPrivateKey | KeystoreWallet;

// Parse command line arguments
interface CommandLineArgs {
  walletPath: string;
  password?: string;
}

function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = { walletPath: '' };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if ((arg === '--wallet' || arg === '--keyfile') && i + 1 < process.argv.length) {
      args.walletPath = process.argv[++i];
    } else if (arg === '--password' && i + 1 < process.argv.length) {
      args.password = process.argv[++i];
    }
  }

  return args;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Process a wallet file and extract the private key
async function extractPrivateKey(filePath: string, password: string): Promise<string | null> {
  try {
    console.log(`Processing wallet file at ${filePath}...`);

    if (!fs.existsSync(filePath)) {
      console.error(`Error: Wallet file not found at ${filePath}`);
      return null;
    }

    const walletRaw = fs.readFileSync(filePath, 'utf8');
    let wallet: WalletType;

    try {
      wallet = JSON.parse(walletRaw);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error parsing wallet file. Is it a valid JSON file?', err.message);
      } else {
        console.error('Error parsing wallet file. Is it a valid JSON file?');
      }
      return null;
    }

    console.log(`Wallet address: ${wallet.address}`);
    let privateKey: string | null = null;

    if ('crypto' in wallet) {
      console.log('Wallet is in keystore format, decrypting...');
      try {
        const walletInstance = await Wallet.fromEncryptedJson(walletRaw, password);
        privateKey = walletInstance.privateKey;
        console.log('Successfully decrypted private key');
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('Failed to decrypt wallet:', err.message);
        } else {
          console.error('Failed to decrypt wallet');
        }
        return null;
      }
    } else if ('privateKey' in wallet) {
      console.log('Wallet is in plain format');
      privateKey = wallet.privateKey;
    } else {
      console.error('Wallet format not recognized');
      return null;
    }

    return privateKey;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error processing wallet file:', error.message);
    } else {
      console.error('Error processing wallet file');
    }
    return null;
  }
}

// Main function
async function main(): Promise<void> {
  console.log('Private Key Extractor');
  console.log('---------------------');

  const cmdArgs = parseArgs();

  if (!cmdArgs.walletPath) {
    console.error('Error: No wallet path provided');
    console.log('\nUsage: node index.js --wallet <path> [--password <password>]');
    console.log('  --wallet <path>       Path to wallet JSON file');
    console.log('  --keyfile <path>      Alternative name for wallet path');
    console.log('  --password <password> Password to decrypt the wallet (optional)');
    rl.close();
    return;
  }

  console.log(`Using wallet file: ${cmdArgs.walletPath}`);

  // Use password from command line or prompt for it
  if (cmdArgs.password) {
    const privateKey = await extractPrivateKey(cmdArgs.walletPath, cmdArgs.password);
    outputResult(privateKey);
  } else {
    rl.question('Enter password to access private key: ', async (password: string) => {
      const privateKey = await extractPrivateKey(cmdArgs.walletPath, password);
      outputResult(privateKey);
    });
  }
}

function outputResult(privateKey: string | null): void {
  if (privateKey) {
    console.log('\nPrivate Key:', privateKey);
  } else {
    console.error('\nFailed to extract private key');
    process.exit(1);
  }
  rl.close();
}

main();