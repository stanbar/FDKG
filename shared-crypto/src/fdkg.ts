import { BabyJubPoint } from "./types"
import * as F_Base8 from "./FBase8";
import { LagrangeCoefficient } from "./sss";
import { mulPointEscalar } from "./babyjub";

type Share = {
    x: number, // x coordinate of the share
    y: bigint, // share value which is y = f(x)
    nodes: number[] // X coordinates of other published shares
}
export const shareWithLagrange = (share: Share): bigint => {
    const lagrangeBasis = LagrangeCoefficient(share.x, share.nodes)
    const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
    return lagrangeWithShare
}

const aggregateSharesWithLagrange = (shares: Share[]): bigint => {
    return shares.reduce((acc, share) => {
        const lagrangeWithShare = shareWithLagrange(share)
        return F_Base8.add(acc, lagrangeWithShare)
    }, F_Base8.zero)
}

export const partialDecryption = (C1: BabyJubPoint, shares: Share[]): BabyJubPoint => {
    const dkgVotingPrivKeyShare = aggregateSharesWithLagrange(shares)
    return mulPointEscalar(C1, dkgVotingPrivKeyShare)
}