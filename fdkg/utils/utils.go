package utils

import (
	"crypto/elliptic"
	cryptoRand "crypto/rand"
	"math/big"
	"math/rand"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"golang.org/x/crypto/sha3"
)

func Map[T, U interface{}](arr []T, f func(T) U) []U {
	result := make([]U, len(arr))
	for i, v := range arr {
		result[i] = f(v)
	}
	return result
}

// return a value within [1, N - 2]
// N = secp256k1.GeneratorOrder = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141
func RandomBigIntCrypto(curve elliptic.Curve) big.Int {

	// [0, L - 3]
	randomNum, err := cryptoRand.Int(cryptoRand.Reader, big.NewInt(0).Sub(curve.Params().N, big.NewInt(2)))
	if err != nil {
		panic(err)
	}

	// Add 1 to the random number to make it in the range [1, N - 2]
	randomNum.Add(randomNum, big.NewInt(1))

	return *randomNum
}

// return a value within [1, N - 2]
// N = secp256k1.GeneratorOrder = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141
func RandomBigInt(curve elliptic.Curve, r *rand.Rand) big.Int {

	// [0, L - 3]
	randomNum, err := cryptoRand.Int(r, big.NewInt(0).Sub(curve.Params().N, big.NewInt(2)))
	if err != nil {
		panic(err)
	}

	// Add 1 to the random number to make it in the range [1, N - 2]
	randomNum.Add(randomNum, big.NewInt(1))

	return *randomNum
}

// scalar to the power of this is like square root, eg. y^sqRoot = y^0.5 (if it exists)
var SqRoot = common.HexToBigInt("3fffffffffffffffffffffffffffffffffffffffffffffffffffffffbfffff0c")

func HashToPoint(data []byte, curve elliptic.Curve) *common.Point {
	keccakHash := Keccak256(data)
	x := new(big.Int)
	x.SetBytes(keccakHash)
	for {
		beta := new(big.Int)
		beta.Exp(x, big.NewInt(3), curve.Params().P)
		beta.Add(beta, big.NewInt(7))
		beta.Mod(beta, curve.Params().P)
		y := new(big.Int)
		y.Exp(beta, SqRoot, curve.Params().P)
		if new(big.Int).Exp(y, big.NewInt(2), curve.Params().P).Cmp(beta) == 0 {
			return &common.Point{X: *x, Y: *y}
		} else {
			x.Add(x, big.NewInt(1))
		}
	}
}

func Keccak256(data ...[]byte) []byte {
	d := sha3.NewLegacyKeccak256()
	for _, b := range data {
		d.Write(b)
	}
	return d.Sum(nil)
}
