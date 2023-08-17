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

func (p Polynomial) Coefficients() []big.Int {
	return p.coefficients
}

func (p Polynomial) Degree() int {
	return len(p.coefficients) - 1
}

func (p Polynomial) Evaluate(target int64) big.Int {
	return *polyEval(p, target, p.curve)
}
func (p Polynomial) String() string {
	// print the polynomial in the form:
	// f(x) = a_0 + a_1*x + a_2*x^2 + ... + a_t*x^t
	var result string
	for i, coeff := range p.coefficients {
		result += fmt.Sprintf("%v..*x^%v + ", coeff.String(), i)
	}
	return result[:len(result)-3] // -3 to remove the last " + "
}

func RandomPolynomial(threshold int, curve elliptic.Curve, r *rand.Rand) Polynomial {
	// Create secret sharing polynomial
	coefficients := make([]big.Int, threshold)
	for i := 0; i < threshold; i++ { //randomly choose coeffs
		coefficients[i] = utils.RandomBigInt(curve, r)
	}
	return Polynomial{coefficients, curve, threshold}
}

func RandomPolynomialForSecret(secret big.Int, threshold int, curve elliptic.Curve, r *rand.Rand) Polynomial {
	// Create secret sharing polynomial
	coefficients := make([]big.Int, threshold)
	coefficients[0] = secret         //assign secret as coeff of x^0
	for i := 1; i < threshold; i++ { //randomly choose coeffs
		coefficients[i] = utils.RandomBigInt(curve, r)
	}
	return Polynomial{coefficients, curve, threshold}
}

// Eval computes the private share v = p(i).
func polyEval(polynomial Polynomial, x int64, curve elliptic.Curve) *big.Int { // get private share
	xi := big.NewInt(x)
	sum := new(big.Int)
	sum.Add(sum, &polynomial.coefficients[0])

	for i := 1; i < polynomial.threshold; i++ {
		tmp := new(big.Int).Mul(xi, &polynomial.coefficients[i])
		sum.Add(sum, tmp)
		sum.Mod(sum, curve.Params().N)
		xi.Mul(xi, big.NewInt(x))
		xi.Mod(xi, curve.Params().N)
	}
	return sum
}
