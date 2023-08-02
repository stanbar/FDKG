package main

import (
	"crypto/elliptic"
	"math/rand"
	"time"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/pki"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
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

	localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r, r)

	// generate shares for each node
	partyIndexToShares := make(map[int][]sss.Share)
	for _, node := range dkgNodes {
		shares := node.GenerateShares()
		for _, share := range shares {
			partyIndexToShares[share.To] = append(partyIndexToShares[share.To], share)
		}
	}
	encryptionKey := VotingPublicKey(dkgNodes)

	votingNodes := sampleRandom(localNodes, n_vote)
	votes := voting(votingNodes, encryptionKey, curve, r)

	onlineTally(votes, dkgNodes, partyIndexToShares, curve, n_vote)
}

func sampleRandom[T interface{}](nodes []T, n int) []T {
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

func voting(nodes []pki.LocalParty, encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) []elgamal.EncryptedBallot {
	votes := make([]elgamal.EncryptedBallot, len(nodes))
	for index, node := range nodes {
		encryptedBallot := node.EncryptedBallot(encryptionKey, curve, r)
		votes[index] = encryptedBallot
	}
	return votes
}

type PartialDecryption struct {
	Index int
	Value common.Point
}

func onlineTally(votes []elgamal.EncryptedBallot, tallyingParties []pki.DkgParty, partyIndexToShares map[int][]sss.Share, curve elliptic.Curve, n_vote int) {

}
