package utils

import (
	"crypto/elliptic"
	cryptoRand "crypto/rand"
	"fmt"
	"math/big"
	"math/rand"
)

func Map[T, U interface{}](arr []T, f func(T) U) []U {
	result := make([]U, len(arr))
	for i, v := range arr {
		result[i] = f(v)
	}
	return result
}

func Sum[T interface{}](arr []T, f func(T, T) T) T {
	result := arr[0]
	for _, v := range arr[1:] {
		result = f(result, v)
	}
	return result
}

func RandomBigIntOld(prime big.Int, r *rand.Rand) big.Int {
	if prime.Cmp(big.NewInt(1)) <= 0 {
		panic(fmt.Sprintf("prime must be greater than 1, got %v", prime))
	}

	randomNum, err := cryptoRand.Int(r, &prime)
	if err != nil {
		panic(err)
	}

	// Add 1 to the random number to make it in the range [1, max - 1]
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
