package utils

import (
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

func RandomBigInt(prime *big.Int, r *rand.Rand) *big.Int {
	if prime.Cmp(big.NewInt(1)) <= 0 {
		panic(fmt.Sprintf("prime must be greater than 1, got %v", prime))
	}

	randomNum, err := cryptoRand.Int(r, prime)
	if err != nil {
		panic(err)
	}

	// Add 1 to the random number to make it in the range [1, max - 1]
	randomNum.Add(randomNum, big.NewInt(1))

	return randomNum
}
