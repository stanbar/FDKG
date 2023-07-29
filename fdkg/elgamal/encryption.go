package elgamal

import (
	"math/big"

	"github.com/torusresearch/pvss/secp256k1"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
)

type EncryptedBallot struct {
	VoterPubKey common.Point
	C1          common.Point
	C2          common.Point
}

// TODO: make it deterministic and independent of the base point
var H = secp256k1.H

func EncryptBoolean(yesOrNo bool, votingPublicKey common.Point, voter common.Point, prime *big.Int) EncryptedBallot {
	blindingFactor := utils.RandomBigInt(prime)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	m := big.NewInt(0)
	if yesOrNo {
		m = big.NewInt(1)
	}

	// (k_i * G, k_i * E + m * H)
	mHX, mHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, m.Bytes())
	return EncryptedBallot{VoterPubKey: voter, C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, mHX, mHY))}
}

func (b *EncryptedBallot) DecryptBoolean(votingPrivateKey *big.Int, prime *big.Int) bool {

	// (A,B) = (k_i * G, k_i * E + m * H)
	// TODO: implement the decryption of single ballot for testing purposes

	// m*H = B - (k_i * E) = B - (k_i * priv * G) = B - (priv * A)
	// (priv * A)
	pAX, pAY := secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes())
	// (B - (priv * A))
	// pA inverse
	pAYNeg := new(big.Int).Neg(pAY)
	pAYNeg.Mod(pAYNeg, prime)
	mHX, mHY := secp256k1.Curve.Add(&b.C2.X, &b.C2.Y, pAX, pAYNeg)
	m := big.NewInt(0)
	if mHX.Cmp(&H.X) == 0 && mHY.Cmp(&H.Y) == 0 {
		m = big.NewInt(1)
	} else if mHX.Cmp(big.NewInt(0)) != 0 || mHY.Cmp(big.NewInt(0)) != 0 {
		panic("m*H is neither 0 nor H")
	}
	testMHX, testMHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, m.Bytes())
	if testMHX.Cmp(mHX) != 0 || testMHY.Cmp(mHY) != 0 {
		panic("m*H != B - (k_i * E)")
	} else {
		return m.Cmp(big.NewInt(1)) == 0
	}
}

func EncryptNumber(m int, votingPublicKey common.Point, voter common.Point, prime *big.Int) EncryptedBallot {
	blindingFactor := utils.RandomBigInt(prime)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	// (k_i * G, k_i * E + m * H)
	mHX, mHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(m)).Bytes())
	return EncryptedBallot{VoterPubKey: voter, C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, mHX, mHY))}
}

func (b *EncryptedBallot) DecryptNumber(votingPrivateKey *big.Int, max int, prime *big.Int) int {

	// (A,B) = (k_i * G, k_i * E + m * H)
	// m*H = B - (k_i * E) = B - (k_i * priv * G) = B - (priv * A)
	// (priv * A)
	pAX, pAY := secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes())
	// (B - (priv * A))
	// pA inverse
	pAYNeg := new(big.Int).Neg(pAY)
	pAYNeg.Mod(pAYNeg, prime)
	mHX, mHY := secp256k1.Curve.Add(&b.C2.X, &b.C2.Y, pAX, pAYNeg)

	// search for x such that x*G = M

	x := 0
	H := H
	for x <= max {
		X, Y := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(x)).Bytes())
		if X.Cmp(mHX) == 0 && Y.Cmp(mHY) == 0 {
			break
		}
		x += 1
		if x > max {
			panic("x not found")
		}
	}

	testMHX, testMHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(x)).Bytes())
	if testMHX.Cmp(mHX) != 0 || testMHY.Cmp(mHY) != 0 {
		panic("m*H != B - (k_i * E)")
	} else {
		return x
	}
}
