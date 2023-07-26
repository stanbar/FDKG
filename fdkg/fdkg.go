package main

import (
	"fmt"
	"math/big"
	"math/rand"

	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
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

func newLocalParty(index int, prime *big.Int, degree int) LocalParty {
	polynomial := polynomial.RandomPolynomial(prime, degree)
	privateKey := polynomial.Evaluate(0)
	publicKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privateKey.Bytes()))
	votingPrivKeyShare := pvss.RandomBigInt()
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

func (p LocalParty) EncryptedBallot(encryptionKey common.Point) elgamal.EncryptedBallot {
	return elgamal.EncryptBoolean(p.vote, &encryptionKey, p.PublicKey)
}

func (p DkgParty) GenerateShares() []sss.Share {
	shares := make([]sss.Share, len(p.TrustedParties))
	for i, party := range p.TrustedParties {
		shares[i] = sss.Share{
			From:  p.Index,
			To:    party.Index,
			Value: p.LocalParty.Polynomial.Evaluate(party.Index),
		}
	}
	return shares
}

func (p LocalParty) toDkgParty(threshold int, trustedParties []PublicParty) DkgParty {
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
	for i, node := range tempPublicNodes {
		if parties == threshold {
			break
		}
		if i != p.Index {
			trustedParties[parties] = node
			parties += 1
		}
	}
	return trustedParties
}

func main() {
	// Prime field modulus (choose a suitable prime based on the problem)
	prime := big.NewInt(17)
	n := 6
	n_vote := 5
	n_dkg := 3
	n_tally := 3
	degree := 3
	threshold := 2

	localNodes := make([]LocalParty, n)
	for i := range localNodes {
		localNodes[i] = newLocalParty(i+1, prime, degree)
		fmt.Printf("Party %v: private key %v, public key %v, voting public key %v, polynomial %v\n", i, localNodes[i].PrivateKey, localNodes[i].PublicKey, localNodes[i].VotingPublicKey, localNodes[i].Polynomial.String())
	}

	publicNodes := make([]PublicParty, n)
	for i := range localNodes {
		publicNodes[i] = localNodes[i].PublicParty
	}

	tempPublicNodes := make([]PublicParty, len(publicNodes))
	copy(tempPublicNodes, publicNodes)
	rand.Shuffle(len(tempPublicNodes), func(i, j int) { tempPublicNodes[i], tempPublicNodes[j] = tempPublicNodes[j], tempPublicNodes[i] })

	dkgNodes := make([]DkgParty, n_dkg)
	for i := range tempPublicNodes[:n_dkg] {
		node := localNodes[i]
		// 	// take random subset of m nodes participating in DKG without the node itself
		trustedParties := randomTrustedParties(node, publicNodes, threshold)
		dkgNodes[i] = node.toDkgParty(threshold, trustedParties)
	}
	// generate shares for each node
	partyIndexToShares := make(map[int][]sss.Share)
	for i := range dkgNodes {
		shares := dkgNodes[i].GenerateShares()
		for _, share := range shares {
			partyIndexToShares[share.To] = append(partyIndexToShares[share.To], share)
		}
	}
	encryptionKey := VotingPublicKey(dkgNodes)

	votingNodes := sampleRandom(localNodes, n_vote)
	votes := voting(votingNodes, encryptionKey)

	tallyNodes := sampleRandom(dkgNodes, n_tally)
	onlineTally(votes, tallyNodes, partyIndexToShares, prime, n_vote)
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

func voting(nodes []LocalParty, encryptionKey common.Point) []elgamal.EncryptedBallot {
	votes := make([]elgamal.EncryptedBallot, len(nodes))
	for index, node := range nodes {
		encryptedBallot := node.EncryptedBallot(encryptionKey)
		votes[index] = encryptedBallot
	}
	return votes
}

func onlineTally(votes []elgamal.EncryptedBallot, tallyingParties []DkgParty, partyIndexToShares map[int][]sss.Share, prime *big.Int, n_vote int) {
	// Sum the first part of the ballots (aka. shared keys)
	A := votes[0].A
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.A.X, &vote.A.Y, &A.X, &A.Y)
		A.X, A.Y = *X, *Y
	}

	// Sum the second part of the ballots (payload)
	B := votes[0].B
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.B.X, &vote.B.Y, &B.X, &B.Y)
		B.X, B.Y = *X, *Y
	}

	// calculate A_i where i is party index
	partialDecryptions := make(map[int]common.Point, len(tallyingParties))
	for _, party := range tallyingParties {

		sharesAcc := big.NewInt(0)
		for _, share := range partyIndexToShares[party.Index] {
			sharesAcc.Add(sharesAcc, share.Value)
		}
		partialDecryption := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A.X, &A.Y, sharesAcc.Bytes()))
		partialDecryptions[party.Index] = partialDecryption
	}

	// calculate Z
	Z_X, Z_Y := big.NewInt(0), big.NewInt(0)

	for i, A_i := range partialDecryptions {
		if i == 0 {
			panic("index must not be 0 because f(0) is the secret")
		}
		lagrangeBasis := sss.CalculateBasisPolynomial(i, partyIndexToShares[i], prime)
		X := &A_i.X
		Y := &A_i.Y

		// lagrangeBasis * A_i
		X, Y = secp256k1.Curve.ScalarMult(X, Y, lagrangeBasis.Bytes())

		// Z += lagrangeBasis * A_i
		Z_X, Z_Y = secp256k1.Curve.Add(Z_X, Z_Y, X, Y)
	}
	// M = B-Z
	M_X, M_Y := secp256k1.Curve.Add(&B.X, &B.Y, Z_X, Z_Y.Neg(Z_Y))

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
