import { BabyJubPoint } from "./types"
import * as F_Base8 from "./FBase8";
import { interpolateOneZ } from "./sss";
import { mulPointEscalar } from "./babyjub";

export const shareWithLagrange = (share: { share: bigint, shareIndex: number, sharesSize: number }): bigint => {
    const lagrangeBasis = interpolateOneZ(share.shareIndex, share.sharesSize)
    const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.share)
    return lagrangeWithShare
}

const aggregateSharesWithLagrange = (shares: Array<{ share: bigint, shareIndex: number, sharesSize: number }>): bigint => {
    return shares.reduce((acc, share) => {
        const lagrangeWithShare = shareWithLagrange(share)
        return F_Base8.add(acc, lagrangeWithShare)
    }, F_Base8.zero)
}

export const partialDecryption = (C1: BabyJubPoint, shares: Array<{ share: bigint, shareIndex: number, sharesSize: number }>): BabyJubPoint => {
    const dkgVotingPrivKeyShare = aggregateSharesWithLagrange(shares)
    return mulPointEscalar(C1, dkgVotingPrivKeyShare)
}