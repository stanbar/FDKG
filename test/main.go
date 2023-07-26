package main

import (
	"fmt"
	"math/big"
	"sort"

	"github.com/torusresearch/pvss/common"
)

func Map[T, U interface{}](arr []T, f func(T) U) []U {
	result := make([]U, len(arr))
	for i, v := range arr {
		result[i] = f(v)
	}
	return result
}

type ByIndex []common.PrimaryShare

func (a ByIndex) Len() int           { return len(a) }
func (a ByIndex) Less(i, j int) bool { return a[i].Index < a[j].Index }
func (a ByIndex) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

func Validate(val int, shares []common.PrimaryShare, prime *big.Int) error {
	sort.Sort(ByIndex(shares))
	X := Map(shares, func(share common.PrimaryShare) int { return share.Index })

	for i := 0; i < len(X); i++ {
		for j := 0; j < len(X); j++ {
			if i != j {
				if X[i]-X[j] == 0 {
					return fmt.Errorf("there are at least 2 same X values. This will result in division by zero in Lagrange interpolation")
				}
			}
		}
	}

	if val < shares[0].Index {
		return fmt.Errorf("value to interpolate is too small and not in range")
	}

	if val > shares[len(shares)-1].Index {
		return fmt.Errorf("value to interpolate is too large and not in range")
	}

	return nil
}

func Interpolate(val int, shares []common.PrimaryShare, prime *big.Int) *big.Int {
	est := big.NewInt(0)
	X := Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	for i := 0; i < len(X); i++ {
		prod := &Y[i]
		for j := 0; j < len(X); j++ {
			if i != j {
				// prod = prod * (val - X[j]) / (X[i] - X[j])
				// 1. (val - X[j])
				nominator := big.NewInt(int64(val - X[j]))
				denom := (X[i] - X[j])
				denominator := big.NewInt(0).ModInverse(big.NewInt(int64(denom)), prime)
				numDenomInverse := nominator.Mul(nominator, denominator)
				numDenomInverse.Mod(numDenomInverse, prime)
				prod = prod.Mul(prod, numDenomInverse)

			}
		}
		est.Add(est, prod)
	}

	return est.Mod(est, prime)
}

func LagrangeScalar(shares []common.PrimaryShare, target int, prime *big.Int) *big.Int {
	secret := new(big.Int)
	for _, share := range shares {
		//when x =0
		delta := new(big.Int).SetInt64(int64(1))
		upper := new(big.Int).SetInt64(int64(1))
		lower := new(big.Int).SetInt64(int64(1))
		for j := range shares {
			if shares[j].Index != share.Index {
				tempUpper := big.NewInt(int64(target))
				tempUpper.Sub(tempUpper, big.NewInt(int64(shares[j].Index)))
				upper.Mul(upper, tempUpper)
				upper.Mod(upper, prime)

				tempLower := big.NewInt(int64(share.Index))
				tempLower.Sub(tempLower, big.NewInt(int64(shares[j].Index)))
				tempLower.Mod(tempLower, prime)

				lower.Mul(lower, tempLower)
				lower.Mod(lower, prime)
			}
		}
		//elliptic devision
		inv := new(big.Int)
		inv.ModInverse(lower, prime)
		delta.Mul(upper, inv)
		delta.Mod(delta, prime)

		delta.Mul(&share.Value, delta)
		delta.Mod(delta, prime)

		secret.Add(secret, delta)
	}
	secret.Mod(secret, prime)
	// secret.Mod(secret, secp256k1.GeneratorOrder)
	return secret
}

func main() {
	prime := big.NewInt(27)
	// Example shares with x-coordinates and corresponding y-values
	// y = x^2 + 2x + 1
	// x-0, y=1
	// x=1, y=4
	// x=2, y=9
	// x=3, y=16
	// x=4, y=25

	shares := []common.PrimaryShare{
		{Index: 3, Value: *big.NewInt(16)},
		{Index: 1, Value: *big.NewInt(4)},
		{Index: 2, Value: *big.NewInt(9)},
	}

	targetX := 0
	basisPoly := Interpolate(targetX, shares, prime)
	lagrangeScalar := LagrangeScalar(shares, targetX, prime)
	fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, basisPoly)
	fmt.Printf("Lagrange scalar at f(%v)=%v\n", targetX, lagrangeScalar)

	targetX = 4
	basisPoly = Interpolate(targetX, shares, prime)
	lagrangeScalar = LagrangeScalar(shares, targetX, prime)
	fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, basisPoly)
	fmt.Printf("Lagrange scalar at f(%v)=%v\n", targetX, lagrangeScalar)
}
