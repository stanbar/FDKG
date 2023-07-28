package elgamal

import (
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

func TestBooleanEncryption(t *testing.T) {
	prime := secp256k1.FieldOrder
	aPrivKey := utils.RandomBigInt(prime)
	aPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(aPrivKey.Bytes()))

	bPrivKey := utils.RandomBigInt(prime)
	bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

	clearText := false
	ciphertext := EncryptBoolean(clearText, bPubKey, aPubKey, prime)
	deciphered := ciphertext.DecryptBoolean(bPrivKey, prime)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}

	clearText = true
	ciphertext = EncryptBoolean(clearText, bPubKey, aPubKey, prime)
	deciphered = ciphertext.DecryptBoolean(bPrivKey, prime)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}
}

func TestNumberEncryption(t *testing.T) {
	prime := secp256k1.FieldOrder
	aPrivKey := utils.RandomBigInt(prime)
	aPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(aPrivKey.Bytes()))

	bPrivKey := utils.RandomBigInt(prime)
	bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

	clearText := 7
	ciphertext := EncryptNumber(clearText, bPubKey, aPubKey, prime)
	deciphered := ciphertext.DecryptNumber(bPrivKey, 100, prime)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}
}
