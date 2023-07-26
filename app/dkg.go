package main

import (
	"math/big"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

type SmartContract struct {
	votingPrivateKeySharesOfShares map[*common.Point][]EncryptedShare
	votingPublicKeyShares          []common.Point
	votes                          []EncryptedBallot
	partialDecryptions             map[*common.Point]common.Point
}

type EncryptedShare struct {
	signcryptedShare common.Signcryption
	senderPubKey     common.Point
}

type EncryptedBallot struct {
	voterPubKey common.Point
	a           common.Point
	b           common.Point
}

func (sc *SmartContract) AddShare(senderPubKey common.Point, shares []*common.SigncryptedOutput, publicKeyVotingShare common.Point, proofOfExponent []byte) {
	// validate signature
	for _, s := range shares {
		signcryptedShare := s.SigncryptedShare
		encryptedShare := EncryptedShare{
			signcryptedShare: signcryptedShare,
			senderPubKey:     senderPubKey,
		}
		pubKey := &s.NodePubKey
		sc.votingPrivateKeySharesOfShares[pubKey] = append(sc.votingPrivateKeySharesOfShares[pubKey], encryptedShare)
		// validate shares against public key
	}
	sc.votingPublicKeyShares = append(sc.votingPublicKeyShares, publicKeyVotingShare)
}

func (sc *SmartContract) GetPartyVotingPrivKeyShares(partyPubKey common.Point) []EncryptedShare {
	return sc.votingPrivateKeySharesOfShares[&partyPubKey]
}

func (sc *SmartContract) VotingPublicKey() common.Point {
	sum := sc.votingPublicKeyShares[0]
	for _, pubKey := range sc.votingPublicKeyShares[1:] {
		X, Y := secp256k1.Curve.Add(&sum.X, &sum.Y, &pubKey.X, &pubKey.Y)
		sum.X, sum.Y = *X, *Y
	}
	return common.BigIntToPoint(&sum.X, &sum.Y)
}

func (sc *SmartContract) AddVote(encryptedVoteOption EncryptedBallot) {
	sc.votes = append(sc.votes, encryptedVoteOption)
}

func (sc *SmartContract) OnlineTally(publicKey common.Point, privateKey big.Int) {
	// Sum the first part of the ballots (aka. shared keys)
	A := sc.votes[0].a
	for _, vote := range sc.votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.a.X, &vote.a.Y, &A.X, &A.Y)
		A.X, A.Y = *X, *Y
	}

	d := new(big.Int)
	for _, signcryptedShare := range sc.votingPrivateKeySharesOfShares[&publicKey] {
		publicKeySender, signcryptedShare := signcryptedShare.senderPubKey, signcryptedShare.signcryptedShare

		votingPrivateKeyShare, err := pvss.UnsigncryptShare(signcryptedShare, privateKey, publicKeySender)
		if err != nil {
			panic(err)
		}
		d.SetBytes(*votingPrivateKeyShare)
	}

	partialDecryption := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A.X, &A.Y, d.Bytes()))
	sc.partialDecryptions[&publicKey] = partialDecryption
}

func (sc *SmartContract) OfflineTally(n_threshold int) {
	// TODO: Implement lagrange interpolation

	t := n_threshold
	// shares must be allocated to the appropriate xs for a particular party
	// so that t here is always constant (e.g 3) whereas the indices of the shares are normalised
	// to the number of shares for a particular party.

	for pk, partialDecryption := range sc.partialDecryptions {

		// t is a number of points needed to interpolate the polynomial
		// t-1 is a degree of the polynomial
		// lagrange coefficients
		// l[i] = \prod_{j=1, j \neq i}^t \frac{j}{j-i}

		var est float64

		for i := 0; i < t; i++ {
			prod := lg.Y[i]
			for j := 0; j < len(lg.X); j++ {
				if i != j {
					prod = prod * (val - lg.X[j]) / (lg.X[i] - lg.X[j])
				}
			}
			est += prod
		}
		// I need to know the index of the node in the list of nodes
	}
	// Everyone can calculate:
	// - Compute $Z=\sum_{i=1}^k A_i \times \Pi_{j=1}^t \frac{j}{j-i}, i\neq j$.
	// - Sum of the second part $B=\sum_{i=1}^k (r_{i} \times \mathbf{E} + v_i \times C)$.
	// - The decryption of the partial result is $M=B-Z=C \times \sum_{i=1}^k v_i$, because:
	// - The total number of $\textrm{"yes"}$ votes is $x=\sum_{i=1}^kv_i$.
	// - To extract $x$ from $M=x \times C$ we have to solve Elliptic-Curve Discrete Logarithm Problem. Fortunatelly, since the value of $x$ is small, i.e., in range $[0,k]$, we can use exhaustive search or Shanks’ baby-step giant-step algorithm.
}
func Interpolate(val float64) float64 {
	var est float64

	for i := 0; i < len(lg.X); i++ {
		prod := lg.Y[i]
		for j := 0; j < len(lg.X); j++ {
			if i != j {
				prod = prod * (val - lg.X[j]) / (lg.X[i] - lg.X[j])
			}
		}
		est += prod
	}

	return est
}

func newSmartContract() SmartContract {
	return SmartContract{
		votingPrivateKeySharesOfShares: make(map[*common.Point][]EncryptedShare),
		votingPublicKeyShares:          make([]common.Point, 0),
	}
}

func TestDKG(test *testing.T) {
	n := 100
	n_dkg := 30
	n_vote := 50
	n_tally := 20
	n_trusted := 5
	n_threshold := 3

	assert.True(test, n_dkg <= n)
	assert.True(test, n_tally <= n_dkg)
	assert.True(test, n_vote <= n)

	nodeList := createRandomNodes(n)

	// random subset of m nodes participating in DKG
	nodesDkg := make([]Node, len(nodeList.Nodes))
	copy(nodesDkg, nodeList.Nodes)
	rand.Shuffle(len(nodesDkg), func(i, j int) { nodesDkg[i], nodesDkg[j] = nodesDkg[j], nodesDkg[i] })
	nodesDkg = nodesDkg[:n_dkg]

	// random subset of m nodes participating in voting
	nodesVoting := make([]Node, len(nodeList.Nodes))
	copy(nodesVoting, nodeList.Nodes)
	rand.Shuffle(len(nodesVoting), func(i, j int) { nodesDkg[i], nodesDkg[j] = nodesDkg[j], nodesDkg[i] })
	nodesVoting = nodesDkg[:n_vote]

	// random subset of nodes participating in tally
	nodesTally := make([]Node, len(nodesDkg))
	copy(nodesTally, nodesDkg)
	rand.Shuffle(len(nodesTally), func(i, j int) { nodesDkg[i], nodesDkg[j] = nodesDkg[j], nodesDkg[i] })
	nodesTally = nodesTally[:n_tally]

	sc := newSmartContract()

	// Proof of exponentiation, that G^decryptionShare = encryptionShare
	dkg(&sc, nodesDkg, nodeList, n_trusted, n_threshold, test)
	voting(&sc, nodesVoting)
	tally(&sc, nodesTally, n_threshold)
}

func dkg(sc *SmartContract, nodesDkg []Node, nodeList *nodeList, n_trusted int, n_threshold int, test *testing.T) {
	for _, node := range nodesDkg {
		privKey := node.PrivKey
		privKeyVotingShare := pvss.RandomBigInt()
		pubKeyVotingShare := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privKeyVotingShare.Bytes()))

		proofOfExponent := proofOfExponent(privKeyVotingShare, pubKeyVotingShare)

		rand.Shuffle(len(nodeList.Nodes), func(i, j int) { nodeList.Nodes[i], nodeList.Nodes[j] = nodeList.Nodes[j], nodeList.Nodes[i] })
		trustedNodes := Map(nodeList.Nodes, func(n Node) common.Node { return n.Node })[:n_trusted]

		signcryptedShares, _, err := pvss.CreateAndPrepareShares(trustedNodes, *privKeyVotingShare, n_threshold, privKey)
		assert.NoError(test, err)
		sc.AddShare(node.Node.PubKey, signcryptedShares, pubKeyVotingShare, proofOfExponent)
	}
}

func voting(sc *SmartContract, nodesDkg []Node) {
	encryptionKey := sc.VotingPublicKey()
	for index, node := range nodesDkg {
		yesOrNo := index%2 == 0
		encryptedBallot := EncryptBoolean(yesOrNo, &encryptionKey, node.Node.PubKey)
		sc.AddVote(encryptedBallot)
	}
}

func tally(sc *SmartContract, nodesTally []Node, n_threshold int) {
	for _, tx := range nodesTally {
		sc.OnlineTally(tx.Node.PubKey, tx.PrivKey)
	}

	result := sc.OfflineTally(n_threshold)
}

func proofOfExponent(privKeyVotingShare *big.Int, pubKeyVotingShare common.Point) []byte {
	panic("unimplemented")
}
