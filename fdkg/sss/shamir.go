package sss

import (
	"crypto/elliptic"
	"fmt"
	"math/big"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

type Share struct {
	From  int
	To    int
	Value big.Int
}

var curve = secp256k1.Curve

// Share String() function that print only the first three digits of the value
func (s Share) String() string {
	return fmt.Sprintf("[%v, %v->%v]", s.Value.String()[0:3], s.From, s.To)
}

func (s Share) ToPrimaryShare() common.PrimaryShare {
	return common.PrimaryShare{
		Index: s.To,
		Value: s.Value,
	}
}

func GenerateShares(p polynomial.Polynomial, from int, indices []int) []Share {
	if len(indices) <= p.Degree() {
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

func LagrangeCoefficientsAbs(y_i *big.Int, i int, X []int, curve elliptic.Curve) *big.Int {
	prod := y_i
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])
			nominator := big.NewInt(int64(X[j]))
			// 2. (X[i] - X[j])
			denom := (X[j] - X[i])
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), curve.Params().N)
			// 3. 1 / (X[i] - X[j])
			denominator = denominator.ModInverse(denominator, curve.Params().N)
			if denominator == nil {
				panic(fmt.Sprintf("cold not find inverse of denominator %v", big.NewInt(0).Mod(big.NewInt(int64(denom)), curve.Params().N)))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, curve.Params().N)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, curve.Params().N)
}

func LagrangeCoefficients(y_i *big.Int, i int, val int, X []int, curve elliptic.Curve) *big.Int {
	prod := y_i
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])
			nominator := big.NewInt(int64(val - X[j]))
			nominator = nominator.Mod(nominator, curve.Params().N)
			// 2. (X[i] - X[j])
			denom := (X[i] - X[j])
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), curve.Params().N)
			// 3. 1 / (X[i] - X[j])
			denominator = big.NewInt(0).ModInverse(denominator, curve.Params().N)
			if denominator == nil {
				panic(fmt.Sprintf("could not find inverse of %v", denominator))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, curve.Params().N)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, curve.Params().N)
}

func LagrangeCoefficientsStartFromOne(i int, val int, X []int, curve elliptic.Curve) *big.Int {
	prod := big.NewInt(1)
	for j := 0; j < len(X); j++ {
		if i != j {
			// prod = prod * (val - X[j]) / (X[i] - X[j])
			// 1. (val - X[j])

			nominator := big.NewInt(int64(val - X[j]))
			nominator.Mod(nominator, curve.Params().N)
			// 2. (X[i] - X[j])
			denom := (X[i] - X[j])
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), curve.Params().N)
			// 3. 1 / (X[i] - X[j])
			denominator = big.NewInt(0).ModInverse(denominator, curve.Params().N)
			if denominator == nil {
				panic(fmt.Sprintf("could not find inverse of %v", denom))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, curve.Params().N)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, curve.Params().N)
}

func LagrangeCoefficientsStartFromOneAbs(i int, X []int, curve elliptic.Curve) *big.Int {
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
			denominator := big.NewInt(0).Mod(big.NewInt(int64(denom)), curve.Params().N)
			// 3. 1 / (X[i] - X[j])
			denominator = big.NewInt(0).ModInverse(denominator, curve.Params().N)
			if denominator == nil {
				panic(fmt.Sprintf("cold not find inverse of denominator %v", denominator))
			}
			// 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
			numDenomInverse := nominator.Mul(nominator, denominator)
			numDenomInverse.Mod(numDenomInverse, curve.Params().N)
			// 5. prod = prod * (val - X[j]) / (X[i] - X[j])
			prod = prod.Mul(prod, numDenomInverse)
		}
	}
	return prod.Mod(prod, curve.Params().N)
}

func Interpolate(val int, shares []common.PrimaryShare, curve elliptic.Curve) *big.Int {
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
				denominator := big.NewInt(0).ModInverse(big.NewInt(int64(denom)), curve.Params().N)
				if denominator == nil {
					panic(fmt.Sprintf("cold not find inverse of denominator %v", denominator))
				}
				numDenomInverse := nominator.Mul(nominator, denominator)
				numDenomInverse.Mod(numDenomInverse, curve.Params().N)
				prod = prod.Mul(prod, numDenomInverse)

			}
		}
		est.Add(est, prod)
	}

	return est.Mod(est, curve.Params().N)
}

func ReconstructSecret(shares []common.PrimaryShare, curve elliptic.Curve) *big.Int {
	est := big.NewInt(0)
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		prod := LagrangeCoefficientsAbs(shareValue, i, X, curve)
		est.Add(est, prod)
	}

	return est.Mod(est, curve.Params().N)
}

func InterpolateWithSeparateCoefficients(val int, shares []common.PrimaryShare, curve elliptic.Curve) *big.Int {
	est := big.NewInt(0)
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		prod := LagrangeCoefficients(shareValue, i, val, X, curve)
		est.Add(est, prod)
	}

	return est.Mod(est, curve.Params().N)
}

// refernce implementation of https://github.com/torusresearch/pvss/blob/master/pvss/pvss.go#L288
func LagrangeScalar(shares []common.PrimaryShare, target int, curve elliptic.Curve) *big.Int {
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
				upper.Mod(upper, curve.Params().N)

				tempLower := big.NewInt(int64(share.Index))
				tempLower.Sub(tempLower, big.NewInt(int64(shares[j].Index)))
				tempLower.Mod(tempLower, curve.Params().N)

				lower.Mul(lower, tempLower)
				lower.Mod(lower, curve.Params().N)
			}
		}
		//elliptic devision
		inv := new(big.Int)
		inv = inv.ModInverse(lower, curve.Params().N)
		if inv == nil {
			panic(fmt.Sprintf("cold not find inverse of lower %v", lower))
		}
		delta.Mul(upper, inv)
		delta.Mod(delta, curve.Params().N)

		delta.Mul(&share.Value, delta)
		delta.Mod(delta, curve.Params().N)

		secret.Add(secret, delta)
	}
	secret.Mod(secret, curve.Params().N)
	// secret.Mod(secret, secp256k1.GeneratorOrder)
	return secret
}
