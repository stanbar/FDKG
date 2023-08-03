package pki

import (
	"crypto/elliptic"
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
	PrivateKey         big.Int
	VotingPrivKeyShare big.Int
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

func NewLocalParty(index int, curve elliptic.Curve, threshold int, r *rand.Rand) LocalParty {
	if index < 1 {
		panic("index must be greater than 0")
	}
	privateKey := utils.RandomBigInt(curve, r)
	publicKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privateKey.Bytes()))
	if !secp256k1.Curve.IsOnCurve(&publicKey.X, &publicKey.Y) {
		panic("publicKey is not on curve")
	}

	votingPrivKeyShare := utils.RandomBigInt(curve, r)
	votingPubKeyShare := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(votingPrivKeyShare.Bytes()))
	if !secp256k1.Curve.IsOnCurve(&votingPubKeyShare.X, &votingPubKeyShare.Y) {
		panic("votingPubKeyShare is not on curve")
	}

	polynomial := polynomial.RandomPolynomial(votingPrivKeyShare, threshold, curve, r)

	return LocalParty{
		PublicParty: PublicParty{
			Index:           index,
			PublicKey:       publicKey,
			VotingPublicKey: votingPubKeyShare,
		},
		PrivateKey:         privateKey,
		VotingPrivKeyShare: votingPrivKeyShare,
		Polynomial:         polynomial,
		vote:               index%2 == 1,
	}
}

func (p LocalParty) EncryptedBallot(encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) elgamal.EncryptedBallot {
	fmt.Printf("Party_%d voting %v\n", p.Index, p.vote)
	return elgamal.EncryptBoolean(p.vote, encryptionKey, curve, r)
}

func (p DkgParty) GenerateShares() []sss.Share {
	indices := utils.Map(p.TrustedParties, func(party PublicParty) int { return party.Index })
	shares := sss.GenerateShares(p.Polynomial, p.Index, indices)
	return shares
}

func (p LocalParty) ToDkgParty(trustedParties []PublicParty) DkgParty {
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

func createRandomNodes(count int, curve elliptic.Curve, degree int, r *rand.Rand) []LocalParty {
	if degree >= count {
		panic("degree must be less than count otherwise it's impossible to reconstruct the secret.")
	}
	nodes := make([]LocalParty, count)
	for i := range nodes {
		newNode := NewLocalParty(i+1, curve, degree, r)
		nodes[i] = newNode
		fmt.Printf("Party_%d voted %v of polynomial %v\n", newNode.Index, newNode.vote, newNode.Polynomial.String())
	}
	return nodes
}

func GenerateSetOfNodes(n int, n_dkg int, n_trustedParties int, degree int, curve elliptic.Curve, r *rand.Rand) ([]LocalParty, []DkgParty) {
	localNodes := createRandomNodes(n, curve, degree, r)

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
		dkgNodes[i] = node.ToDkgParty(trustedParties)
		fmt.Printf("Party_%d has following trusted parties %v \n", node.Index, utils.Map(trustedParties, func(party PublicParty) int { return party.Index }))
	}
	return localNodes, dkgNodes
}
