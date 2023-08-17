package pvssgpt

import (
	"fmt"
	"math/big"
	"math/rand"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/pki"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
)

func TestPvssGPT(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	config := common.VotingConfig{
		Size:          3,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 2,
	}
	curve := NewCustomCurve()
	localNodes := pki.CreateRandomNodes(config, curve, r)

	_escrow, err := CreateEscrow(r, config.Threshold, curve)
	if err != nil {
		t.Fatal(err)
	}
	escrow := *_escrow
	commitments := Commitments(escrow, curve)
	assert.True(t, len(commitments) == config.Threshold, "commitments size is not equal to threshold")

	pubKeys := lo.Map(localNodes, func(p pki.LocalParty, i int) common.Point { return p.PublicKey })
	privKeys := lo.Map(localNodes, func(p pki.LocalParty, i int) big.Int { return p.PrivateKey })
	assert.True(t, len(pubKeys) == len(privKeys), "pubKeys size is not equal to privKeys size")

	shares := CreateShares(r, escrow, pubKeys, curve)

	decrypted := lo.Map(shares, func(share EncryptedShare, _ int) DecryptedShare {
		idx := share.id
		// TODO: why do we pass share.id ? why can not share resolve it from self?
		verified_encrypted := share.Verify(share.id, pubKeys[idx], escrow.extraGenerator, commitments, curve)
		fmt.Printf("Encrypted share %v: %v \n", share.id, verified_encrypted)
		assert.True(t, verified_encrypted, "encrypted share %v is not verified", share.id)

		d := DecryptShare(r, privKeys[idx], pubKeys[idx], share, curve)
		verified_decrypted := d.Verify(pubKeys[idx], share, curve)
		fmt.Printf("Decrypted share %v: %v \n", share.id, verified_decrypted)
		assert.True(t, verified_decrypted, "decrypted share %v is not verified", share.id)
		return d
	})
	recovered := Recover(config.Threshold, decrypted, curve)
	fmt.Printf("Recovered secret: %v= %v\n", recovered, escrow.secret)
}
