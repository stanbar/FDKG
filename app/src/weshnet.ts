import sizeof from 'object-sizeof'
import { EncryptedShare, PublicParty } from './party'
import { BabyJubPoint, Proof, PubKey, PublicSignals } from 'shared-crypto'
import { spawn } from 'child_process';

const weshnetBin = process.env.WESHNET_BIN ? process.env.WESHNET_BIN : '../../weshnet/bin/weshnet'

export class MyGoApp {
  private process;

  constructor() {
    // Initialize and start the Go binary as a subprocess
    this.process = spawn(weshnetBin);

    // Listen to the subprocess stdout and log it
    this.process.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    // Listen to the subprocess stderr and log it
    this.process.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    // Log when the subprocess closes
    this.process.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }

  // Function to send a command to the Go app
  sendCommand(command: string) {
    this.process.stdin.write(command + '\n');
  }

  // Function to stop the Go app
  stop() {
    this.process.kill();
  }
}

const app = new MyGoApp();

export const init = (node: PublicParty, id: string | number) => {
  app.sendCommand(`init ${node.index}`);
}

export const broadcastContributeDkg = async (node: PublicParty, encryptedShares: EncryptedShare[], votingPublicKey: PubKey, proof?: Proof, publicSignals?: PublicSignals) => {
  console.log({ encryptedShares: sizeof({ encryptedShares, votingPublicKey, proof, publicSignals }) })
  app.sendCommand(`sendMessage ${JSON.stringify({ contributeDkg: encryptedShares })}`)
}

export const broadcastPublishVote = async (node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof?: Proof, publicSignals?: PublicSignals }) => {
  console.log({ encryptedBallot: sizeof(encryptedBallot) })

  app.sendCommand(`sendMessage ${JSON.stringify({ publishVote: encryptedBallot })}`)
}

export const broadcastPublishPartialDecryption = async (node: PublicParty, partialDecryption: Array<{
  pd: BabyJubPoint
  from: PubKey
  proof?: Proof
  publicSignals?: PublicSignals
}>) => {
  console.log({ partialDecryption: sizeof(partialDecryption) })

  app.sendCommand(`sendMessage ${JSON.stringify({ partialDecryption: partialDecryption })}`)
}
