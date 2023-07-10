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

type nodeList struct {
	Nodes []common.Node
}

func createRandomNodes(number int) (*nodeList, []big.Int) {
	list := new(nodeList)
	privateKeys := make([]big.Int, number)
	for i := 0; i < number; i++ {
		pkey := pvss.RandomBigInt()
		list.Nodes = append(list.Nodes, common.Node{
			Index:  i + 1,
			PubKey: common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(pkey.Bytes())),
		})
		privateKeys[i] = *pkey
	}
	return list, privateKeys
}

func TestPVSS(test *testing.T) {
	nodeList, privateKeys := createRandomNodes(20)
	secret := pvss.RandomBigInt()
	privKeySender := pvss.RandomBigInt()
	pubKeySender := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(privKeySender.Bytes()))

	errorsExist := false
	signcryptedShares, _, err := pvss.CreateAndPrepareShares(nodeList.Nodes, *secret, 10, *privKeySender)
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
