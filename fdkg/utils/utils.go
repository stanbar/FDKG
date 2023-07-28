package utils

import (
	"crypto/rand"
	"math/big"
)

func Map[T, U interface{}](arr []T, f func(T) U) []U {
	result := make([]U, len(arr))
	for i, v := range arr {
		result[i] = f(v)
	}
	return result
}

func RandomBigInt(prime *big.Int) *big.Int {
	randomInt, _ := rand.Int(rand.Reader, prime)
	return randomInt
}
