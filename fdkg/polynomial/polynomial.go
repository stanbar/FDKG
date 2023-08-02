package polynomial

import (
	"crypto/elliptic"
	"fmt"
	"math/big"
	"math/rand"

	"github.com/delendum-xyz/private-voting/fdkg/utils"
)

type Polynomial struct {
	coefficients []big.Int
	curve        elliptic.Curve
	threshold    int
}

func (p Polynomial) Degree() int {
	return len(p.coefficients) - 1
}

func (p Polynomial) Evaluate(target int) big.Int {
	return *polyEval(p, target, p.curve)
}
func (p Polynomial) String() string {
	// print the polynomial in the form:
	// f(x) = a_0 + a_1*x + a_2*x^2 + ... + a_t*x^t
	var result string
	for i, coeff := range p.coefficients {
		result += fmt.Sprintf("%v..*x^%v + ", coeff.String()[:3], i)
	}
	return result[:len(result)-3] // -3 to remove the last " + "
}

func RandomPolynomial(secret big.Int, threshold int, curve elliptic.Curve, r *rand.Rand) Polynomial {
	// Create secret sharing polynomial
	coefficients := make([]big.Int, threshold)
	coefficients[0] = secret         //assign secret as coeff of x^0
	for i := 1; i < threshold; i++ { //randomly choose coeffs
		coefficients[i] = utils.RandomBigInt(curve, r)
	}
	return Polynomial{coefficients, curve, threshold}
}

// // EvaluatePolynomialOverPrimeNaturalField evaluates the polynomial at the given target
// // in the prime field of natural numbers using Horner's method.
// func evaluatePolynomial(coefficients []big.Int, target int, curve elliptic.Curve) big.Int {
// 	// if x is 0 then the evaluation always returns the constant coefficient
// 	// which is the first element of the coefficients array
// 	if target == 0 {
// 		// curve.Params().N or curve.Params().P
// 		return *(coefficients[0].Mod(&coefficients[0], curve.Params().N))
// 	}

// 	result := new(big.Int).Set(&coefficients[len(coefficients)-1])

// 	for i := len(coefficients) - 2; i >= 0; i-- {
// 		result.Mul(result, big.NewInt(int64(target)))
// 		result.Add(result, &coefficients[i])
// 		result.Mod(result, curve.Params().N)
// 	}

// 	// Ensure the result is a positive number within the range of natural numbers
// 	if result.Sign() == -1 {
// 		panic("result must not be negative")
// 	}

// 	return *(result.Mod(result, curve.Params().N))
// }

// Eval computes the private share v = p(i).
func polyEval(polynomial Polynomial, x int, curve elliptic.Curve) *big.Int { // get private share
	xi := big.NewInt(int64(x))
	sum := new(big.Int)
	// for i := polynomial.Threshold - 1; i >= 0; i-- {
	// 	fmt.Println("i: ", i)
	// 	sum.Mul(sum, xi)
	// 	sum.Add(sum, &polynomial.Coeff[i])
	// }
	// sum.Mod(sum, secp256k1.FieldOrder)
	sum.Add(sum, &polynomial.coefficients[0])

	for i := 1; i < polynomial.threshold; i++ {
		tmp := new(big.Int).Mul(xi, &polynomial.coefficients[i])
		sum.Add(sum, tmp)
		sum.Mod(sum, curve.Params().N)
		xi.Mul(xi, big.NewInt(int64(x)))
		xi.Mod(xi, curve.Params().N)
	}
	return sum
}
