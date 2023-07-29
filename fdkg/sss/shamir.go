package sss

import (
	"fmt"
	"math/big"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
)

type Share struct {
	From  int
	To    int
	Value *big.Int
}

func (s Share) ToPrimaryShare() common.PrimaryShare {
	return common.PrimaryShare{
		Index: s.To,
		Value: *s.Value,
	}
}

func GenerateShares(p polynomial.Polynomial, from int, indices []int) []Share {
	if len(indices) <= (p.Degree()) {
		panic("not enough trusted parties (and so shares) to reconstruct the secret")
	}
	shares := make([]Share, len(indices))
	for i, index := range indices {
		if index == 0 {
			panic("index must not be 0 because f(0) is the secret")
		}
		shares[i] = Share{
			From:  from,
			To:    index,
			Value: p.Evaluate(index),
		}
	}
	return shares
}

func LagrangeCoefficients(y_i *big.Int, i int, val int, X []int, prime *big.Int) *big.Int {
	prod := y_i
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])
			nominator := big.NewInt(int64(val - X[j]))
			// 2. (X[i] - X[j])
			denom := (X[i] - X[j])
			// 3. 1 / (X[i] - X[j])
			denominator := big.NewInt(0).ModInverse(big.NewInt(int64(denom)), prime)
			if denominator == nil {
				panic(fmt.Sprintf("could not find inverse of %v", denom))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, prime)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, prime)
}

func LagrangeCoefficientsStartFromOne(i int, val int, X []int, prime *big.Int) *big.Int {
	prod := big.NewInt(1)
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])

			nominator := big.NewInt(int64(val - X[j]))
			fmt.Printf("nominator: %v=%v-%v\n", nominator.String(), val, X[j])
			nominator.Mod(nominator, prime)
			// 2. (X[i] - X[j])
			denom := (X[i] - X[j])
			fmt.Printf("denom: %v=%v-%v\n", denom, X[i], X[j])
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), prime)
			// 3. 1 / (X[i] - X[j])
			denominator = big.NewInt(0).ModInverse(denominator, prime)
			if denominator == nil {
				panic(fmt.Sprintf("could not find inverse of %v", denom))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, prime)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, prime)
}

func LagrangeCoefficientsStartFromOneAbs(i int, X []int, prime *big.Int) *big.Int {
	prod := big.NewInt(1)
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])

			nominator := big.NewInt(int64(X[j]))
			fmt.Printf("nominator: %v\n", X[j])
			// 2. (X[i] - X[j])
			denom := (X[j] - X[i])
			fmt.Printf("denom: %v=%v-%v\n", denom, X[j], X[i])
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), prime)
			// 3. 1 / (X[i] - X[j])
			denominator = big.NewInt(0).ModInverse(denominator, prime)
			if denominator == nil {
				panic(fmt.Sprintf("could not find inverse of %v", denom))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, prime)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, prime)
}

func Interpolate(val int, shares []common.PrimaryShare, prime *big.Int) *big.Int {
	est := big.NewInt(0)
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

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

func InterpolateWithSeparateCoefficients(val int, shares []common.PrimaryShare, prime *big.Int) *big.Int {
	est := big.NewInt(0)
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		prod := LagrangeCoefficients(shareValue, i, val, X, prime)
		est.Add(est, prod)
	}

	return est.Mod(est, prime)
}

// refernce implementation of https://github.com/torusresearch/pvss/blob/master/pvss/pvss.go#L288
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
	return secret
}
