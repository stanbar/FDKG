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

var H0 = secp256k1.HashToPoint(secp256k1.H.X.Bytes())
var H1 = secp256k1.HashToPoint(H0.X.Bytes())
var H2 = secp256k1.HashToPoint(H1.X.Bytes())
var H3 = secp256k1.HashToPoint(H2.X.Bytes())

func EncryptEnum(x int, votingPublicKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
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
	return common.EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, &generator.X, &generator.Y))}
}

func EncryptXonY(x int, y int, votingPublicKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
	// use the x-th generator
	generator := []common.Point{
		{X: H0.X, Y: H0.Y},
		{X: H1.X, Y: H1.Y},
		{X: H2.X, Y: H2.Y},
		{X: H3.X, Y: H3.Y},
	}[y]
	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	xH_X, xH_Y := secp256k1.Curve.ScalarMult(&generator.X, &generator.Y, big.NewInt(int64(x)).Bytes())
	// (k_i * G, k_i * E + m * H)
	return common.EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, xH_X, xH_Y))}
}
func EncryptBallot(vote int, options int, encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
	if vote < 0 || vote > options-1 {
		panic(fmt.Sprintf("Invalid vote: %v, must be between 0 and %v", vote, options-1))
	}
	if options < 2 {
		panic("There must be at least 2 options")
	} else if options == 2 {
		return EncryptSingleCandidate(vote, encryptionKey, curve, r)
	} else {
		return EncryptMultiCandidate(vote, options, encryptionKey, curve, r)
	}
}

func EncryptSingleCandidate(vote int, encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
	x := big.NewInt(int64(vote))

	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&encryptionKey.X, &encryptionKey.Y, blindingFactor.Bytes())

	// (k_i * G, k_i * E + m * H)
	mHX, mHY := secp256k1.Curve.ScalarMult(&H0.X, &H0.Y, x.Bytes())
	return common.EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, mHX, mHY))}
}

func EncryptMultiCandidate(vote int, options int, encryptionKey common.Point, curve elliptic.Curve, r *rand.Rand) common.EncryptedBallot {
	generator := []common.Point{
		{X: H0.X, Y: H0.Y},
		{X: H1.X, Y: H1.Y},
		{X: H2.X, Y: H2.Y},
		{X: H3.X, Y: H3.Y},
	}[vote]
	blindingFactor := utils.RandomBigInt(curve, r)
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&encryptionKey.X, &encryptionKey.Y, blindingFactor.Bytes())

	// (k_i * G, k_i * E + m * H)
	return common.EncryptedBallot{C1: comm, C2: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, &generator.X, &generator.Y))}

}
