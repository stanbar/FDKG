package main

import (
	"fmt"
	"math/big"
	"math/rand"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

type LocalParty struct {
	PublicParty
	PrivateKey         *big.Int
	VotingPrivKeyShare *big.Int
	Polynomial         polynomial.Polynomial
	vote               bool
}

type PublicParty struct {
	Index           int
	PublicKey       common.Point
	VotingPublicKey common.Point
}

type DkgParty struct {
	LocalParty
	TrustedParties []PublicParty
}

func NewLocalParty(index int, prime *big.Int, degree int) LocalParty {
	if index < 1 {
		panic("index must be greater than 0")
	}
	privateKey := utils.RandomBigInt(prime)
	publicKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privateKey.Bytes()))

	polynomial := polynomial.RandomPolynomial(prime, degree)
	votingPrivKeyShare := polynomial.Evaluate(0)
	votingPubKeyShare := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(votingPrivKeyShare.Bytes()))

	return LocalParty{
		PublicParty: PublicParty{
			Index:           index,
			PublicKey:       publicKey,
			VotingPublicKey: votingPubKeyShare,
		},
		PrivateKey:         privateKey,
		VotingPrivKeyShare: votingPrivKeyShare,
		Polynomial:         polynomial,
		vote:               index%2 == 0,
	}
}

func (p LocalParty) EncryptedBallot(encryptionKey common.Point, prime *big.Int) elgamal.EncryptedBallot {
	fmt.Printf("Party_%d voting %v\n", p.Index, p.vote)
	return elgamal.EncryptBoolean(p.vote, encryptionKey, p.PublicKey, prime)
}

func (p DkgParty) GenerateShares() []sss.Share {
	indices := utils.Map(p.TrustedParties, func(party PublicParty) int { return party.Index })
	shares := sss.GenerateShares(p.Polynomial, p.Index, indices)
	return shares
}

func (p LocalParty) toDkgParty(trustedParties []PublicParty) DkgParty {
	return DkgParty{
		LocalParty:     p,
		TrustedParties: trustedParties,
	}
}

func randomTrustedParties(p LocalParty, publicNodes []PublicParty, threshold int) []PublicParty {
	// take random subset of m nodes participating in DKG without the node itself
	tempPublicNodes := make([]PublicParty, len(publicNodes))
	copy(tempPublicNodes, publicNodes)
	rand.Shuffle(len(tempPublicNodes), func(i, j int) { tempPublicNodes[i], tempPublicNodes[j] = tempPublicNodes[j], tempPublicNodes[i] })

	trustedParties := make([]PublicParty, threshold)
	parties := 0

	for _, node := range tempPublicNodes {
		if parties == threshold {
			break
		}
		if node.Index != p.Index {
			trustedParties[parties] = node
			parties += 1
		}
	}
	return trustedParties
}

func createRandomNodes(count int, prime *big.Int, degree int) []LocalParty {
	if degree >= count {
		panic("degree must be less than count otherwise it's impossible to reconstruct the secret.")
	}
	nodes := make([]LocalParty, count)
	for i := range nodes {
		newNode := NewLocalParty(i+1, prime, degree)
		nodes[i] = newNode
		fmt.Printf("Party_%d voted %v of polynomial %v\n", newNode.Index, newNode.vote, newNode.Polynomial.String())
	}
	return nodes
}

func GenerateSetOfNodes(n int, n_dkg int, n_trustedParties int, degree int, prime *big.Int) ([]LocalParty, []DkgParty) {
	localNodes := createRandomNodes(n, prime, degree)

	publicNodes := make([]PublicParty, n)
	for i := range localNodes {
		publicNodes[i] = localNodes[i].PublicParty
	}

	tempPublicNodes := make([]LocalParty, len(localNodes))
	copy(tempPublicNodes, localNodes)
	rand.Shuffle(len(tempPublicNodes), func(i, j int) { tempPublicNodes[i], tempPublicNodes[j] = tempPublicNodes[j], tempPublicNodes[i] })
	fmt.Printf("tempPublicNodes %v \n", utils.Map(tempPublicNodes, func(party LocalParty) int { return party.Index }))

	dkgNodes := make([]DkgParty, n_dkg)
	for i, node := range tempPublicNodes[:n_dkg] {
		// 	// take random subset of m nodes participating in DKG without the node itself
		trustedParties := randomTrustedParties(node, publicNodes, n_trustedParties)
		dkgNodes[i] = node.toDkgParty(trustedParties)
		fmt.Printf("Party_%d has following trusted parties %v \n", node.Index, utils.Map(trustedParties, func(party PublicParty) int { return party.Index }))
	}
	return localNodes, dkgNodes
}

func main() {
	// Prime field modulus (choose a suitable prime based on the problem)
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 6
	n_vote := 6

	degree := 1 // shares to reconstruct is degree+1
	n_trustedParties := 5

	localNodes, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)

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
	votes := voting(votingNodes, encryptionKey, prime)

	onlineTally(votes, dkgNodes, partyIndexToShares, prime, n_vote)
}

func sampleRandom[T interface{}](nodes []T, n int) []T {
	tempNodes := make([]T, len(nodes))
	copy(tempNodes, nodes)
	rand.Shuffle(len(nodes), func(i, j int) { tempNodes[i], tempNodes[j] = tempNodes[j], tempNodes[i] })
	sampleNodes := tempNodes[:n]
	return sampleNodes
}

func VotingPublicKey(dkgNodes []DkgParty) common.Point {
	sum := dkgNodes[0].VotingPublicKey
	for _, node := range dkgNodes[1:] {
		pubKey := node.VotingPublicKey
		X, Y := secp256k1.Curve.Add(&sum.X, &sum.Y, &pubKey.X, &pubKey.Y)
		sum.X, sum.Y = *X, *Y
	}
	return common.BigIntToPoint(&sum.X, &sum.Y)
}

func voting(nodes []LocalParty, encryptionKey common.Point, prime *big.Int) []elgamal.EncryptedBallot {
	votes := make([]elgamal.EncryptedBallot, len(nodes))
	for index, node := range nodes {
		encryptedBallot := node.EncryptedBallot(encryptionKey, prime)
		votes[index] = encryptedBallot
	}
	return votes
}

type PartialDecryption struct {
	Index int
	Value common.Point
}

func onlineTally(votes []elgamal.EncryptedBallot, tallyingParties []DkgParty, partyIndexToShares map[int][]sss.Share, prime *big.Int, n_vote int) {
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
