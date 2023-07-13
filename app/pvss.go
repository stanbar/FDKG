package main

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

type Node struct {
	Node    common.Node
	PrivKey big.Int
}
type nodeList struct {
	Nodes []Node
}

type mapFunc[In any, Out any] func(In) Out

func Map[In any, Out any](s []In, f mapFunc[In, Out]) []Out {
	result := make([]Out, len(s))
	for i := range s {
		result[i] = f(s[i])
	}
	return result
}

func TestPVSS(test *testing.T) {
	nodeList := createRandomNodes(20)
	nodes := Map(nodeList.Nodes, func(n Node) common.Node { return n.Node })
	privateKeys := Map(nodeList.Nodes, func(n Node) big.Int { return n.PrivKey })

	privKeyVotingShare := pvss.RandomBigInt()
	// pubKeyVotingShare := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privKeyVotingShare.Bytes()))
	// Proof of exponentiation, that G^decryptionShare = encryptionShare
	privKeySender := pvss.RandomBigInt()
	pubKeySender := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privKeySender.Bytes()))

	errorsExist := false
	signcryptedShares, _, err := pvss.CreateAndPrepareShares(nodes, *privKeyVotingShare, 10, *privKeySender)
	if err != nil {
		fmt.Println(err)
		errorsExist = true
	}
	for i := range signcryptedShares {
		_, err := pvss.UnsigncryptShare(signcryptedShares[i].SigncryptedShare, privateKeys[i], pubKeySender)
		if err != nil {
			fmt.Println(err)
			errorsExist = true
		}
	}
	assert.False(test, errorsExist)
}

func createRandomNodes(number int) *nodeList {
	list := new(nodeList)
	privateKeys := make([]big.Int, number)
	for i := 0; i < number; i++ {
		pkey := pvss.RandomBigInt()
		list.Nodes = append(list.Nodes, Node{
			PrivKey: *pkey,
			Node: common.Node{
				Index:  i + 1,
				PubKey: common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(pkey.Bytes())),
			}})
		privateKeys[i] = *pkey
	}
	return list
}
