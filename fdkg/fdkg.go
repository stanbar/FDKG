package main

import (
	"crypto/elliptic"
	"fmt"
	"math/big"
	"math/rand"
	"time"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/pki"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"

	"github.com/samber/lo"
)

var curve = secp256k1.Curve

func main() {
	voting := common.VotingConfig{
		Size:          6,
		Options:       5,
		Threshold:     2,
		GuardiansSize: 5,
	}
	r := rand.New(rand.NewSource(time.Now().Unix()))
	n_dkg := 6
	n_vote := 6

	localNodes, dkgNodes := pki.GenerateSetOfNodes(voting, n_dkg, curve, r)

	// generate shares for each node
	partyIndexToShares := make(map[int][]sss.Share)
	for _, node := range dkgNodes {
		shares := node.GenerateShares()
		for _, share := range shares {
			partyIndexToShares[share.To] = append(partyIndexToShares[share.To], share)
		}
	}
	encryptionKey := VotingPublicKey(dkgNodes)

	votingNodes := lo.Samples(localNodes, n_vote)
	votes := Voting(votingNodes, encryptionKey, curve, r)

	partialDecryptions := OnlineTally(votes, partyIndexToShares, curve)
	results := OfflineTally(votes, partialDecryptions, curve)
	fmt.Printf("Results: %v\n", results)
}

func VotingPublicKey(dkgNodes []pki.DkgParty) common.Point {
	sum := dkgNodes[0].VotingPublicKey
	for _, node := range dkgNodes[1:] {
		pubKey := node.VotingPublicKey
		X, Y := secp256k1.Curve.Add(&sum.X, &sum.Y, &pubKey.X, &pubKey.Y)
		sum.X, sum.Y = *X, *Y
	}
	return common.BigIntToPoint(&sum.X, &sum.Y)
}

func Voting(nodes []pki.LocalParty, encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) []elgamal.EncryptedBallot {
	return utils.Map(nodes, func(node pki.LocalParty) elgamal.EncryptedBallot {
		return node.EncryptedBallot(encryptionKey, curve, r)
	})
}

type PartialDecryption struct {
	Index int
	Value common.Point
}

type PartyIndexToShares = map[int][]sss.Share
type PartyIndexToVotingPrivKeyShare = map[int][]sss.Share

func PartyToVotingPrivKeyShare(shares PartyIndexToShares) map[int]big.Int {
	partyToVotingPrivKeyShare := make(map[int]big.Int)
	for party, shares := range shares {
		sharesTimesCoefficients := utils.Map(shares, func(share sss.Share) big.Int {
			return share.ProductOfShareAndCoefficient().Value
		})

		votingPrivKeyShare := utils.Sum(sharesTimesCoefficients, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })
		partyToVotingPrivKeyShare[party] = votingPrivKeyShare
	}
	return partyToVotingPrivKeyShare
}

type PartialDecryptions = []common.Point

func OnlineTally(votes []elgamal.EncryptedBallot, shares PartyIndexToShares, curve elliptic.Curve) PartialDecryptions {
	C1s := utils.Map(votes, func(vote elgamal.EncryptedBallot) common.Point { return vote.C1 })
	C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
		return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
	})

	partyToVotingPrivKeyShare := PartyToVotingPrivKeyShare(shares)

	Zs := lo.MapToSlice(partyToVotingPrivKeyShare, func(index int, votingPrivKeyShare big.Int) common.Point {
		return common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, votingPrivKeyShare.Bytes()))
	})
	return Zs
}

func OfflineTally(votes []elgamal.EncryptedBallot, partialDecryptions PartialDecryptions, curve elliptic.Curve) int {
	Z := utils.Sum(partialDecryptions, func(p1, p2 common.Point) common.Point {
		return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
	})

	C2s := utils.Map(votes, func(vote elgamal.EncryptedBallot) common.Point { return vote.C2 })
	C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
		return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
	})

	negZ_Y := new(big.Int).Neg(&Z.Y)
	negZ_Y.Mod(negZ_Y, curve.Params().P)
	negZ := common.BigIntToPoint(&Z.X, negZ_Y)

	M := common.BigIntToPoint(curve.Add(&C2.X, &C2.Y, &negZ.X, &negZ.Y))

	x := 0
	for x <= len(votes) {
		X, Y := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, big.NewInt(int64(x)).Bytes())
		if X.Cmp(&M.X) == 0 && Y.Cmp(&M.Y) == 0 {
			break
		}
		x += 1
		if x > len(votes) {
			panic("x not found")
		}
	}
	return x
}
