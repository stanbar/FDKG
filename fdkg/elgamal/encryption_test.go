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

func TestAdditiveHomomorphism(t *testing.T) {
	prime := secp256k1.FieldOrder
	aPrivKey := utils.RandomBigInt(prime)
	aPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(aPrivKey.Bytes()))

	bPrivKey := utils.RandomBigInt(prime)
	bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

	clearText1 := 3
	ciphertext1 := EncryptNumber(clearText1, bPubKey, aPubKey, prime)
	clearText2 := 11
	ciphertext2 := EncryptNumber(clearText2, bPubKey, aPubKey, prime)

	Ax, Ay := secp256k1.Curve.Add(&ciphertext1.C1.X, &ciphertext1.C1.Y, &ciphertext2.C1.X, &ciphertext2.C1.Y)
	Bx, By := secp256k1.Curve.Add(&ciphertext1.C2.X, &ciphertext1.C2.Y, &ciphertext2.C2.X, &ciphertext2.C2.Y)
	ballot := EncryptedBallot{
		C1: common.Point{X: *Ax, Y: *Ay},
		C2: common.Point{X: *Bx, Y: *By},
	}

	deciphered := ballot.DecryptNumber(bPrivKey, 100, prime)
	if deciphered != (clearText1 + clearText2) {
		t.Errorf("deciphered != clearText")
	}
}
