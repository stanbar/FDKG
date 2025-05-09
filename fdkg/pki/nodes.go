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
	"github.com/samber/lo"
	"github.com/torusresearch/pvss/secp256k1"
)

type LocalParty struct {
	PublicParty
	PrivateKey         big.Int
	VotingPrivKeyShare big.Int
	Polynomial         polynomial.Polynomial
	vote               int
	config             common.VotingConfig
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

func NewLocalParty(index int, config common.VotingConfig, curve elliptic.Curve, r *rand.Rand) LocalParty {
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

	polynomial := polynomial.RandomPolynomialForSecret(votingPrivKeyShare, config.Threshold, curve, r)

	return LocalParty{
		PublicParty: PublicParty{
			Index:           index,
			PublicKey:       publicKey,
			VotingPublicKey: votingPubKeyShare,
		},
		PrivateKey:         privateKey,
		VotingPrivKeyShare: votingPrivKeyShare,
		Polynomial:         polynomial,
		vote:               index % config.Options,
		config:             config,
	}
}

func (p LocalParty) EncryptedBallot(encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
	fmt.Printf("Party_%d voting %v, options: %v\n", p.Index, p.vote, p.config.Options)
	return elgamal.EncryptBallot(p.vote, p.config.Options, encryptionKey, curve, r)
}

func (p DkgParty) GenerateShares(curve elliptic.Curve) []sss.Share {
	indices := lo.Map(p.TrustedParties, func(party PublicParty, _ int) int { return party.Index })
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

func CreateRandomNodes(config common.VotingConfig, curve elliptic.Curve, r *rand.Rand) []LocalParty {
	if config.Threshold > config.Size-1 {
		panic("Threshold must be less than size-1 otherwise it's impossible to reconstruct the secret.")
	}
	nodes := make([]LocalParty, config.Size)
	for i := range nodes {
		newNode := NewLocalParty(i+1, config, curve, r)
		nodes[i] = newNode
		fmt.Printf("Party_%d voted %v of polynomial %v\n", newNode.Index, newNode.vote, newNode.Polynomial.String())
	}
	return nodes
}

func GenerateSetOfNodes(config common.VotingConfig, n_dkg int, curve elliptic.Curve, r *rand.Rand) ([]LocalParty, []DkgParty) {
	localNodes := CreateRandomNodes(config, curve, r)

	publicNodes := make([]PublicParty, config.Size)
	for i := range localNodes {
		publicNodes[i] = localNodes[i].PublicParty
	}

	tempPublicNodes := make([]LocalParty, len(localNodes))
	copy(tempPublicNodes, localNodes)
	rand.Shuffle(len(tempPublicNodes), func(i, j int) { tempPublicNodes[i], tempPublicNodes[j] = tempPublicNodes[j], tempPublicNodes[i] })

	dkgCandidates := lo.Samples(localNodes, n_dkg)
	dkgNodes := lo.Map(dkgCandidates, func(node LocalParty, index int) DkgParty {
		trustedParties := randomTrustedParties(node, publicNodes, config.GuardiansSize)
		fmt.Printf("Party_%d has following trusted parties %v \n", node.Index, lo.Map(trustedParties, func(party PublicParty, _ int) int { return party.Index }))
		return node.ToDkgParty(trustedParties)
	})
	return localNodes, dkgNodes
}
