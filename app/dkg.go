package main

import (
	"fmt"
	"math/big"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

type blockchainList struct {
	Transactions []blockchainEntry
}
type blockchainEntry struct {
	Index                int
	SigncryptedShares    []*common.SigncryptedOutput
	ProofOfExponent      []byte
	PublicKeyVotingShare common.Point
}

// create typ alias PublicKey to comon.Point
type PublicKey *common.Point

type SmartContract struct {
	Shares                map[PublicKey][]*common.SigncryptedOutput
	PublicKeyVotingShares []common.Point
}

func (sc *SmartContract) AddShare(senderPubKey PublicKey, shares []*common.SigncryptedOutput, publicKeyVotingShare common.Point, proofOfExponent []byte) {
	// validate signature
	for _, s := range shares {
		sc.Shares[&s.NodePubKey] = append(sc.Shares[&s.NodePubKey], s)
		// validate shares against public key
	}
	sc.PublicKeyVotingShares = append(sc.PublicKeyVotingShares, publicKeyVotingShare)
}

func newSmartContract() SmartContract {
	return SmartContract{
		Shares:                make(map[PublicKey][]*common.SigncryptedOutput),
		PublicKeyVotingShares: make([]common.Point, 0),
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
	tally(&sc, nodesTally)
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
		sc.AddShare(&node.Node.PubKey, signcryptedShares, pubKeyVotingShare, proofOfExponent)
	}
}

func voting(sc *SmartContract, nodesDkg []Node) {
}

func tally(sc *SmartContract, nodesDkg []Node) {
	for i, tx := range blockchain.Transactions {
		_, err := pvss.UnsigncryptShare(signcryptedShares[i].SigncryptedShare, privateKeys[i], pubKeySender)
		if err != nil {
			fmt.Println(err)
			errorsExist = true
		}
	}
}

func proofOfExponent(privKeyVotingShare *big.Int, pubKeyVotingShare common.Point) []byte {
	panic("unimplemented")
}
