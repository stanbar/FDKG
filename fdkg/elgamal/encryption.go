package elgamal

import (
	"crypto/elliptic"
	"fmt"
	"math/big"
	"math/rand"

	"github.com/torusresearch/pvss/secp256k1"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
)

type EncryptedBallot struct {
	C1 common.Point
	C2 common.Point
}

var H = secp256k1.H

// TODO: make it deterministic and independent of the base point
func EncryptBoolean(yesOrNo bool, votingPublicKey common.Point, curve elliptic.Curve, r *rand.Rand) EncryptedBallot {
	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	m := big.NewInt(0)
	if yesOrNo {
		m = big.NewInt(1)
	}

	// (k_i * G, k_i * E + m * H)
	mHX, mHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, m.Bytes())
	return EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, mHX, mHY))}
}

func (b EncryptedBallot) DecryptBoolean(votingPrivateKey big.Int, curve elliptic.Curve) bool {
	// (A,B) = (k_i * G, k_i * E + m * H)
	// TODO: implement the decryption of single ballot for testing purposes

	// m*H = B - (k_i * E) = B - (k_i * priv * G) = B - (priv * A)
	// (priv * A)
	pAX, pAY := secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes())
	// (B - (priv * A))
	// pA inverse
	pAYNeg := new(big.Int).Neg(pAY)
	pAYNeg.Mod(pAYNeg, curve.Params().P)
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

var H0 = *secp256k1.HashToPoint(secp256k1.H.X.Bytes())
var H1 = *secp256k1.HashToPoint(H0.X.Bytes())
var H2 = *secp256k1.HashToPoint(H1.X.Bytes())
var H3 = *secp256k1.HashToPoint(H2.X.Bytes())

func EncryptEnum(x int, votingPublicKey common.Point, curve elliptic.Curve, r *rand.Rand) EncryptedBallot {
	// use the x-th generator
	generator := []common.Point{
		{X: H0.X, Y: H0.Y},
		{X: H1.X, Y: H1.Y},
		{X: H2.X, Y: H2.Y},
		{X: H3.X, Y: H3.Y},
	}[x]
	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	// (k_i * G, k_i * E + m * H)
	return EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, &generator.X, &generator.Y))}
}

func ExhoustiveSearch(max_votes int, mHX *big.Int, mHY *big.Int, curve elliptic.Curve) (int, int, int, int) {
	rounds := 0
	for i := 0; i <= max_votes; i++ {
		// x0 * G0
		iG0_X, iG0_Y := secp256k1.Curve.ScalarMult(&H0.X, &H0.Y, big.NewInt(int64(i)).Bytes())
		for j := 0; j <= max_votes-i; j++ {
			// x1 * G1
			jG1_X, jG1_Y := secp256k1.Curve.ScalarMult(&H1.X, &H1.Y, big.NewInt(int64(j)).Bytes())
			two_X, two_Y := curve.Add(iG0_X, iG0_Y, jG1_X, jG1_Y)
			for k := 0; k <= max_votes-i-j; k++ {
				// x2 * G2
				kG1_X, kG1_Y := secp256k1.Curve.ScalarMult(&H2.X, &H2.Y, big.NewInt(int64(k)).Bytes())
				three_X, three_Y := curve.Add(two_X, two_Y, kG1_X, kG1_Y)
				for l := 0; l <= max_votes-i-j-k; l++ {
					// x3 * G3
					lG1_X, lG1_Y := secp256k1.Curve.ScalarMult(&H3.X, &H3.Y, big.NewInt(int64(l)).Bytes())
					four_X, four_Y := curve.Add(three_X, three_Y, lG1_X, lG1_Y)
					rounds += 1
					if four_X.Cmp(mHX) == 0 && four_Y.Cmp(mHY) == 0 {
						return i, j, k, l
					}
				}
			}
		}
	}
	panic(fmt.Sprintf("Could not find the solution after %v rounds", rounds))
}

func (b *EncryptedBallot) DecryptEnum(votingPrivateKey big.Int, max_votes int, curve elliptic.Curve) (int, int, int, int) {
	pAX, pAY := secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes())
	pAYNeg := new(big.Int).Neg(pAY)
	pAYNeg.Mod(pAYNeg, curve.Params().P)
	mHX, mHY := secp256k1.Curve.Add(&b.C2.X, &b.C2.Y, pAX, pAYNeg)

	x0, x1, x2, x3 := ExhoustiveSearch(max_votes, mHX, mHY, curve)
	return x0, x1, x2, x3
}

func EncryptNumber(m int, votingPublicKey common.Point, curve elliptic.Curve, r *rand.Rand) EncryptedBallot {
	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	// (k_i * G, k_i * E + m * H)
	mHX, mHY := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(m)).Bytes())
	return EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, mHX, mHY))}
}

func (b *EncryptedBallot) DecryptNumber(votingPrivateKey big.Int, max int, curve elliptic.Curve) int {
	pAX, pAY := secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes())
	return b.DecryptNumberWithSharedKey(common.BigIntToPoint(pAX, pAY), max, curve)
}

func (b *EncryptedBallot) DecryptNumberWithSharedKey(sharedKey common.Point, max int, curve elliptic.Curve) int {
	// (A,B) = (k_i * G, k_i * E + m * H)
	// m*H = B - (k_i * E) = B - (k_i * priv * G) = B - (priv * A)
	// (priv * A)
	pAX, pAY := sharedKey.X, sharedKey.Y
	// (B - (priv * A))
	// pA inverse
	pAYNeg := new(big.Int).Neg(&pAY)
	pAYNeg.Mod(pAYNeg, curve.Params().P)
	mHX, mHY := secp256k1.Curve.Add(&b.C2.X, &b.C2.Y, &pAX, pAYNeg)

	// search for x such that x*G = M

	x := 0
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
