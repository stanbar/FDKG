package ec

import (
	"crypto/elliptic"
	"crypto/rand"
	"fmt"
	"math/big"
	"testing"

	"github.com/torusresearch/pvss/secp256k1"
)

// Point represents a point on the elliptic curve.
type Point struct {
	X, Y *big.Int
}

// Polynomial represents a polynomial in Shamir's Secret Sharing scheme.
type Polynomial struct {
	coefficients []*big.Int
}

// Share represents a single share in Shamir's Secret Sharing scheme.
type Share struct {
	X *big.Int // x-coordinate of the share
	Y *big.Int // y-coordinate of the share (f(x))
}

var curve = secp256k1.Curve

// GenerateCoefficients generates random coefficients for the polynomial of degree 'degree'.
func GenerateCoefficients(degree int, curve elliptic.Curve) []*big.Int {
	coefficients := make([]*big.Int, degree+1)
	for i := range coefficients {
		coefficients[i], _ = rand.Int(rand.Reader, curve.Params().N)
	}
	return coefficients
}

// Evaluate evaluates the polynomial at the given x-coordinate 'x'.
func (p *Polynomial) Evaluate(x *big.Int, prime big.Int) *big.Int {
	result := big.NewInt(0)
	for i, coeff := range p.coefficients {
		temp := new(big.Int).Set(x)
		for j := 0; j < i; j++ {
			temp.Mul(temp, x)
			temp.Mod(temp, curve.Params().N)
		}
		temp.Mul(temp, coeff)
		temp.Mod(temp, curve.Params().N)
		result.Add(result, temp)
		result.Mod(result, curve.Params().N)
	}
	return result
}

// GenerateShares generates 'numShares' shares of the secret 'secret' using 'threshold' and prime 'prime'.
func GenerateShares(secret *big.Int, threshold, numShares int, curve elliptic.Curve) []*Share {
	coefficients := GenerateCoefficients(threshold-1, curve)
	coefficients = append(coefficients, secret)

	shares := make([]*Share, numShares)
	for i := 0; i < numShares; i++ {
		x := big.NewInt(int64(i + 1))
		shares[i] = &Share{X: x, Y: coefficients[0]}
		for j := 1; j < len(coefficients); j++ {
			temp := new(big.Int).Set(x)
			for k := 1; k < j; k++ {
				temp.Mul(temp, x)
				temp.Mod(temp, curve.Params().N)
			}
			temp.Mul(temp, coefficients[j])
			temp.Mod(temp, curve.Params().N)
			shares[i].Y.Add(shares[i].Y, temp)
			shares[i].Y.Mod(shares[i].Y, curve.Params().N)
		}
	}

	return shares
}

// RecoverSecret recovers the secret from the given shares using Lagrange interpolation.
func RecoverSecret(shares []*Share, curve elliptic.Curve) *big.Int {
	if len(shares) == 0 {
		return nil
	}

	secret := big.NewInt(0)
	for i := 0; i < len(shares); i++ {
		numerator := new(big.Int).Set(shares[i].Y)
		denominator := big.NewInt(1)
		for j := 0; j < len(shares); j++ {
			if i == j {
				continue
			}
			numerator.Mul(numerator, new(big.Int).Neg(shares[j].X))
			numerator.Mod(numerator, curve.Params().N)
			denominator.Mul(denominator, new(big.Int).Sub(shares[i].X, shares[j].X))
			denominator.Mod(denominator, curve.Params().N)
		}
		denominator.ModInverse(denominator, curve.Params().N)
		numerator.Mul(numerator, denominator)
		numerator.Mod(numerator, curve.Params().N)
		secret.Add(secret, numerator)
		secret.Mod(secret, curve.Params().N)
	}

	return secret
}

func TestMain(t *testing.T) {
	// Elliptic curve parameters
	curve := elliptic.P256()

	// Secret to be shared
	secret := big.NewInt(12345)

	// Number of shares and threshold
	numShares := 5
	threshold := 3

	// Generate shares
	shares := GenerateShares(secret, threshold, numShares, curve)
	fmt.Println("Shares:")
	for _, share := range shares {
		fmt.Printf("(%d, %d)\n", share.X, share.Y)
	}

	// Select any 'threshold' number of shares to recover the secret
	recoveredSecret := RecoverSecret(shares[:threshold], curve)
	fmt.Println("Recovered Secret:", recoveredSecret)
}
