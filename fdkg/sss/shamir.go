package sss

import (
	"math/big"

	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
)

type Share struct {
	From  int
	To    int
	Value *big.Int
}

func GenerateShares(p polynomial.Polynomial, from int, indices []int) []Share {
	shares := make([]Share, len(indices))
	for i, index := range indices {
		if i == 0 {
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

func ReconstructSecret(shares []Share, prime *big.Int) *big.Int {
	secret := big.NewInt(0)
	for i, share := range shares {
		// Compute the Lagrange coefficient for this share
		lc := big.NewInt(1)
		for j, otherShare := range shares {
			if i == j {
				continue
			}
			// Compute the numerator
			num := share.From - otherShare.From
			// Compute the denominator
			denom := otherShare.To - otherShare.From
			// Compute the inverse of the denominator
			denomInverse := big.NewInt(0).ModInverse(big.NewInt(int64(denom)), prime)
			// Compute the product of the numerator and denominator inverse
			numDenomInverse := big.NewInt(0).Mul(big.NewInt(int64(num)), denomInverse)
			// Multiply the Lagrange coefficient by the product
			lc.Mul(lc, numDenomInverse)
			// Make sure the Lagrange coefficient is positive
			lc.Mod(lc, prime)
		}
		// Multiply the secret by the Lagrange coefficient
		secret.Add(secret, big.NewInt(0).Mul(share.Value, lc))
		// Make sure the secret is positive
		secret.Mod(secret, prime)
	}
	return secret
}

func LagrangeBasisPolynomial(index int, shares []Share, prime *big.Int) *big.Int {
	numerator := big.NewInt(1) // either 1 or first index from shares.Index
	denominator := big.NewInt(1)

	for j, _ := range shares {
		if j == index {
			continue
		}
		num := big.NewInt(int64(j))
		denom := big.NewInt(int64(j - index))

		numerator = numerator.Mul(numerator, num)
		denominator = denominator.Mul(denominator, denom)

		denominator.Mod(denominator, prime)
	}
	// Compute the denominator inverse
	denominatorInverse := big.NewInt(0).ModInverse(denominator, prime)
	// Compute the product of the numerator and denominator inverse
	numDenomInverse := numerator.Mul(numerator, denominatorInverse)
	// Make sure the product is positive
	numDenomInverse.Mod(numDenomInverse, prime)
	return numDenomInverse
}

// CalculateBasisPolynomial calculates the basis polynomial corresponding to a given share.
// The share's x-coordinate and the x-coordinates of other shares are required for the calculation.
func CalculateBasisPolynomial(x int, shares []Share, prime *big.Int) *big.Int {
	basisPoly := big.NewInt(1)

	for _, share := range shares {
		if x-share.To != 0 {
			numerator := x - share.To
			denominator := share.To - x

			// Calculate the Lagrange coefficient for this share's basis polynomial
			inv := big.NewInt(0).ModInverse(big.NewInt(int64(denominator)), prime)
			coeff := big.NewInt(0).Mul(big.NewInt(int64(numerator)), inv)
			coeff.Mod(coeff, prime)

			// Multiply the current basis polynomial with the Lagrange coefficient
			basisPoly.Mul(basisPoly, coeff)
			basisPoly.Mod(basisPoly, prime)
		}
	}

	return basisPoly
}
