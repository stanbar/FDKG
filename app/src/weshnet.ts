import sizeof from 'object-sizeof'
import { EncryptedShare, PublicParty } from './party'
import { BabyJubPoint, Proof, PubKey, PublicSignals } from 'shared-crypto'
import { spawn } from 'child_process';

const weshnetBin = process.env.WESHNET_BIN
  ? process.env.WESHNET_BIN : '../weshnet/bin/weshnet'

export class MyGoApp {
  private process;
  private outs: string[];

  constructor() {
    // Initialize and start the Go binary as a subprocess
    this.process = spawn(weshnetBin);
    this.outs = []
    

    // Listen to the subprocess stdout and log it
    this.process.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      this.outs.push(data as string)
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
    console.log("sending command: " + command)
    this.process.stdin.write(command + '\n');
  }

  // Function to stop the Go app
  stop() {
    this.process.kill();
  }

  lastOut(): string {
    return this.outs[this.outs.length -1 ]
  }
}

export const init = (app: MyGoApp, node: PublicParty) => {
  app.sendCommand(`init ${node.index}`);
}

export const createGroup = (app: MyGoApp) => {
  app.sendCommand("createGroup");
}

export const invite = (app: MyGoApp) => {
  app.sendCommand("invitation");
}

export const joinGroup = (app: MyGoApp, groupPk: string) => {
  app.sendCommand(`joinGroup ${groupPk}`);
}

export const broadcastContributeDkg = async (app: MyGoApp, node: PublicParty, encryptedShares: EncryptedShare[], votingPublicKey: PubKey, proof?: Proof, publicSignals?: PublicSignals) => {
  console.log({ encryptedShares: sizeof({ encryptedShares, votingPublicKey, proof, publicSignals }) })
  app.sendCommand(`sendMessage ${JSON.stringify({ contributeDkg: encryptedShares })}`)
}

export const broadcastPublishVote = async (app: MyGoApp, node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof?: Proof, publicSignals?: PublicSignals }) => {
  console.log({ encryptedBallot: sizeof(encryptedBallot) })

  app.sendCommand(`sendMessage ${JSON.stringify({ publishVote: encryptedBallot })}`)
}

export const broadcastPublishPartialDecryption = async (app: MyGoApp, node: PublicParty, partialDecryption: Array<{
  pd: BabyJubPoint
  from: PubKey
  proof?: Proof
  publicSignals?: PublicSignals
}>) => {
  console.log({ partialDecryption: sizeof(partialDecryption) })

  app.sendCommand(`sendMessage ${JSON.stringify({ partialDecryption: partialDecryption })}`)
}
