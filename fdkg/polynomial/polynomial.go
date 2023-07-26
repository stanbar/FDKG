package polynomial

import (
	"fmt"
	"math/big"
	"math/rand"
	"time"
)

// GenerateRandomPolynomialOverPrimeNaturalField generates a random polynomial
// of degree t over the prime field of natural numbers.
func generateRandomPolynomial(t int, prime *big.Int) []*big.Int {
	rand.Seed(time.Now().UnixNano())

	coefficients := make([]*big.Int, t+1)
	for i := 0; i <= t; i++ {
		// Generate a random integer in the range [1, prime - 1].
		coeff := big.NewInt(int64(rand.Intn(int(prime.Int64()-1)) + 1))
		coefficients[i] = coeff
	}

	return coefficients
}

// EvaluatePolynomialOverPrimeNaturalField evaluates the polynomial at the given target
// in the prime field of natural numbers using Horner's method.
func evaluatePolynomial(coefficients []*big.Int, target int, prime *big.Int) *big.Int {
	result := new(big.Int).Set(coefficients[len(coefficients)-1])

	for i := len(coefficients) - 2; i >= 0; i-- {
		result.Mul(result, big.NewInt(int64(target)))
		result.Add(result, coefficients[i])
		result.Mod(result, prime)
	}

	// Ensure the result is a positive number within the range of natural numbers
	if result.Sign() == -1 {
		result.Add(result, prime)
	}

	return result
}

type Polynomial struct {
	coefficients []*big.Int
	prime        *big.Int
}

func (p *Polynomial) Evaluate(target int) *big.Int {
	return evaluatePolynomial(p.coefficients, target, p.prime)
}
func (p Polynomial) String() string {
	// print the polynomial in the form:
	// f(x) = a_0 + a_1*x + a_2*x^2 + ... + a_t*x^t
	var result string
	for i, coeff := range p.coefficients {
		result += fmt.Sprintf("%v*x^%v + ", coeff, i)
	}
	return result[:len(result)-3]
}

func RandomPolynomial(prime *big.Int, degree int) Polynomial {
	return Polynomial{
		coefficients: generateRandomPolynomial(degree, prime),
		prime:        prime,
	}
}
