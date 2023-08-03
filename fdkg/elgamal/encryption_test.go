package elgamal

import (
	"fmt"
	"math/rand"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

const ITERATIONS = 1000

var curve = secp256k1.Curve

func TestBooleanEncryption(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))

		bPrivKey := utils.RandomBigInt(curve, r)
		fmt.Printf("bPrivKey: %v\n", bPrivKey)
		bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))
		if secp256k1.Curve.IsOnCurve(&bPubKey.X, &bPubKey.Y) == false {
			t.Errorf("bPubKey is not on curve")
		}

		clearText := false
		ciphertext := EncryptBoolean(clearText, bPubKey, curve, r)
		deciphered := ciphertext.DecryptBoolean(bPrivKey, curve)
		if deciphered != clearText {
			t.Errorf("deciphered != clearText")
		}

		clearText = true
		ciphertext = EncryptBoolean(clearText, bPubKey, curve, r)
		deciphered = ciphertext.DecryptBoolean(bPrivKey, curve)
		if deciphered != clearText {
			t.Errorf("deciphered != clearText")
		}
	}
}

func TestNumberEncryption(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))

		bPrivKey := utils.RandomBigInt(curve, r)
		bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

		clearText := 7
		ciphertext := EncryptNumber(clearText, bPubKey, curve, r)
		deciphered := ciphertext.DecryptNumber(bPrivKey, 100, curve)
		if deciphered != clearText {
			t.Errorf("deciphered != clearText")
		}
	}
}

func TestAdditiveHomomorphism(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))

		bPrivKey := utils.RandomBigInt(curve, r)
		bPubKey := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(bPrivKey.Bytes()))

		clearText1 := 3
		ciphertext1 := EncryptNumber(clearText1, bPubKey, curve, r)
		clearText2 := 11
		ciphertext2 := EncryptNumber(clearText2, bPubKey, curve, r)

		Ax, Ay := secp256k1.Curve.Add(&ciphertext1.C1.X, &ciphertext1.C1.Y, &ciphertext2.C1.X, &ciphertext2.C1.Y)
		Bx, By := secp256k1.Curve.Add(&ciphertext1.C2.X, &ciphertext1.C2.Y, &ciphertext2.C2.X, &ciphertext2.C2.Y)
		ballot := EncryptedBallot{
			C1: common.Point{X: *Ax, Y: *Ay},
			C2: common.Point{X: *Bx, Y: *By},
		}

		deciphered := ballot.DecryptNumber(bPrivKey, 100, curve)
		if deciphered != (clearText1 + clearText2) {
			t.Errorf("deciphered != clearText")
		}
	}
}
