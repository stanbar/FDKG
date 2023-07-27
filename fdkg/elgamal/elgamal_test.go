package elgamal

import (
	"testing"

	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

func TestBooleanEncryption(t *testing.T) {
	aPrivKey := pvss.RandomBigInt()
	aPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(aPrivKey.Bytes()))

	bPrivKey := pvss.RandomBigInt()
	bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

	clearText := false
	ciphertext := EncryptBoolean(clearText, bPubKey, aPubKey)
	deciphered := ciphertext.DecryptBoolean(bPrivKey)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}

	clearText = true
	ciphertext = EncryptBoolean(clearText, bPubKey, aPubKey)
	deciphered = ciphertext.DecryptBoolean(bPrivKey)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}
}

func TestNumberEncryption(t *testing.T) {
	aPrivKey := pvss.RandomBigInt()
	aPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(aPrivKey.Bytes()))

	bPrivKey := pvss.RandomBigInt()
	bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

	clearText := 7
	ciphertext := EncryptNumber(clearText, bPubKey, aPubKey)
	deciphered := ciphertext.DecryptNumber(bPrivKey, 100)
	if deciphered != clearText {
		t.Errorf("deciphered != clearText")
	}
}
