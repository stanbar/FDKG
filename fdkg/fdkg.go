package main

import (
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
)

func main() {
	// Prime field modulus (choose a suitable prime based on the problem)
	r := rand.New(rand.NewSource(time.Now().Unix()))
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 6
	n_vote := 6

	degree := 1 // shares to reconstruct is degree+1
	n_trustedParties := 5

	localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime, r)

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
	votes := voting(votingNodes, encryptionKey, prime, r)

	onlineTally(votes, dkgNodes, partyIndexToShares, prime, n_vote)
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

func voting(nodes []pki.LocalParty, encryptionKey common.Point, prime *big.Int, r *rand.Rand) []elgamal.EncryptedBallot {
	votes := make([]elgamal.EncryptedBallot, len(nodes))
	for index, node := range nodes {
		encryptedBallot := node.EncryptedBallot(encryptionKey, prime, r)
		votes[index] = encryptedBallot
	}
	return votes
}

type PartialDecryption struct {
	Index int
	Value common.Point
}

func onlineTally(votes []elgamal.EncryptedBallot, tallyingParties []pki.DkgParty, partyIndexToShares map[int][]sss.Share, prime *big.Int, n_vote int) {
	// Sum the first part of the ballots (aka. shared keys)
	fmt.Printf("len(votes) = %v\n", len(votes))
	A := votes[0].C1
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.C1.X, &vote.C1.Y, &A.X, &A.Y)
		A.X, A.Y = *X, *Y
	}

	if !secp256k1.Curve.IsOnCurve(&A.X, &A.Y) {
		panic("A is not on curve")
	}

	// Sum the second part of the ballots (payload)
	B := votes[0].C2
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.C2.X, &vote.C2.Y, &B.X, &B.Y)
		B.X, B.Y = *X, *Y
	}

	if !secp256k1.Curve.IsOnCurve(&B.X, &B.Y) {
		panic("B is not on curve")
	}

	// calculate A_i where i is party index
	primaryShares := make([]PartialDecryption, len(tallyingParties))
	for i, party := range tallyingParties {
		fmt.Printf("party.Index = %v has %v shares\n", party.Index, len(partyIndexToShares[party.Index]))
		if len(partyIndexToShares[party.Index]) == 0 {
			continue
		}

		sharesAcc := big.NewInt(0)
		for _, share := range partyIndexToShares[party.Index] {
			sharesAcc = sharesAcc.Add(sharesAcc, share.Value)
		}
		sharesAcc = big.NewInt(0).Mod(sharesAcc, prime)
		// Error is here, partialDecryption is not on curve
		partialDecryption := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A.X, &A.Y, sharesAcc.Bytes()))

		if !secp256k1.Curve.IsOnCurve(&partialDecryption.X, &partialDecryption.Y) {
			panic("partialDecryption is not on curve")
		}
		primaryShares[i] = PartialDecryption{
			Index: party.Index,
			Value: partialDecryption,
		}
	}

	// calculate Z
	Z_X, Z_Y := big.NewInt(0), big.NewInt(0)

	X := utils.Map(primaryShares, func(share PartialDecryption) int { return share.Index })
	A_is := utils.Map(primaryShares, func(share PartialDecryption) common.Point { return share.Value })

	for i := 0; i < len(X); i++ {
		lagrangeBasis := sss.LagrangeCoefficientsStartFromOne(i, 0, X, prime)

		// lagrangeBasis * A_i
		X, Y := secp256k1.Curve.ScalarMult(&A_is[i].X, &A_is[i].Y, lagrangeBasis.Bytes())

		// Z += lagrangeBasis * A_i
		Z_X, Z_Y = secp256k1.Curve.Add(Z_X, Z_Y, X, Y)
	}
	if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
		panic("Z is not on curve")
	}

	fmt.Printf("Z = (%v,%v)\n", Z_X, Z_Y)

	// M = B-Z
	ZNegY := new(big.Int).Neg(Z_Y)
	ZNegY.Mod(ZNegY, prime)
	M_X, M_Y := secp256k1.Curve.Add(&B.X, &B.Y, Z_X, ZNegY)

	if !secp256k1.Curve.IsOnCurve(M_X, M_Y) {
		panic("M=B-Z is not on curve")
	}

	M_X_test, M_Y_test := secp256k1.Curve.Add(M_X, M_Y, Z_X, Z_Y)
	if !secp256k1.Curve.IsOnCurve(M_X_test, M_Y_test) {
		panic("B=M+Z is not on curve")
	}

	if M_X_test.Cmp(&B.X) != 0 || M_Y_test.Cmp(&B.Y) != 0 {
		panic("M != B-Z")
	}
	fmt.Printf("Z = (%v,%v)\n", Z_X, Z_Y)

	// search for x such that x*G = M
	x := 0
	H := elgamal.H
	for x <= n_vote {
		X, Y := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(x)).Bytes())
		if X.Cmp(M_X) == 0 && Y.Cmp(M_Y) == 0 {
			break
		}
		x += 1
		if x > n_vote {
			panic("x not found")
		}
	}

	fmt.Printf("The voting result is %v\n", x)
}
