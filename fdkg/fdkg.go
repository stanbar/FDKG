package main

import (
	"crypto/elliptic"
	"math/big"
	"math/rand"
	"time"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/pki"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

var curve = secp256k1.Curve

func main() {
	// Prime field modulus (choose a suitable prime based on the problem)
	r := rand.New(rand.NewSource(time.Now().Unix()))
	n := 6
	n_dkg := 6
	n_vote := 6

	degree := 1 // shares to reconstruct is degree+1
	n_trustedParties := 5

	localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r)

	// generate shares for each node
	partyIndexToShares := make(map[int][]sss.Share)
	for _, node := range dkgNodes {
		shares := node.GenerateShares()
		for _, share := range shares {
			partyIndexToShares[share.To] = append(partyIndexToShares[share.To], share)
		}
	}
	encryptionKey := VotingPublicKey(dkgNodes)

	votingNodes := SampleRandom(localNodes, n_vote)
	votes := Voting(votingNodes, encryptionKey, curve, r)

	OnlineTally(votes, dkgNodes, partyIndexToShares, curve, n_vote)
	// results := OfflineTally(votes, dkgNodes, partyIndexToShares, curve, n_vote)
}

func SampleRandom[T interface{}](nodes []T, n int) []T {
	tempNodes := make([]T, len(nodes))
	copy(tempNodes, nodes)
	rand.Shuffle(len(nodes), func(i, j int) { tempNodes[i], tempNodes[j] = tempNodes[j], tempNodes[i] })
	sampleNodes := tempNodes[:n]
	return sampleNodes
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

func OnlineTally(votes []elgamal.EncryptedBallot, tallyingParties []pki.DkgParty, partyIndexToShares map[int][]sss.Share, curve elliptic.Curve, n_vote int) {
	C1_X, C1_Y := big.NewInt(0), big.NewInt(0)
	for _, vote := range votes {
		C1_X, C1_Y = secp256k1.Curve.Add(&vote.C1.X, &vote.C1.Y, C1_X, C1_Y)
	}
}
