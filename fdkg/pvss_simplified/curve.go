package pvssgpt

import (
	"crypto/elliptic"
	"math/big"
)

type CurveParams struct {
	P, A, B, N, Gx, Gy *big.Int
}

// p = 17, base field
// E: y^2 = x^3 + 6x + 1 mod 17, curve equation
// G = (10, 15), Generator point
// q = 23, Generator order
// https://graui.de/code/elliptic2/
func NewCustomCurve() *CurveParams {
	return &CurveParams{
		P:  big.NewInt(17),
		A:  big.NewInt(6),
		B:  big.NewInt(1),
		N:  big.NewInt(23),
		Gx: big.NewInt(15),
		Gy: big.NewInt(10),
	}
}

func (curve *CurveParams) Params() *elliptic.CurveParams {
	return &elliptic.CurveParams{
		P:       curve.P,
		N:       curve.N,
		B:       curve.B,
		Gx:      curve.Gx,
		Gy:      curve.Gy,
		BitSize: curve.P.BitLen(),
		Name:    "CustomCurve",
	}
}

// polynomial returns x³ + ax + b.
func (curve *CurveParams) polynomial(x *big.Int) *big.Int {
	x3 := new(big.Int).Mul(x, x)
	x3.Add(x3, curve.A) // x² + a
	x3.Mul(x3, x)       // x³ + ax
	x3.Add(x3, curve.B) // x³ + ax + b

	return x3.Mod(x3, curve.P)
}

// polynomial returns x³ + ax + b.
func (curve *CurveParams) Polynomial(x *big.Int) *big.Int {
	x3 := new(big.Int).Mul(x, x)
	x3.Add(x3, curve.A) // x² + a
	x3.Mul(x3, x)       // x³ + ax
	x3.Add(x3, curve.B) // x³ + ax + b

	return x3.Mod(x3, curve.P)
}

// IsOnCurve returns whether the point (x, y) lies on the curve or not
func (curve *CurveParams) IsOnCurve(x, y *big.Int) bool {
	// y² = x³ + ax + b
	y2 := new(big.Int).Mul(y, y)
	y2.Mod(y2, curve.P)

	return curve.polynomial(x).Cmp(y2) == 0
}

// zForAffine returns a Jacobian Z value for the affine point (x, y). If x and
// y are zero, it assumes that they represent the point at infinity because (0,
// 0) is not on the any of the curves handled here.
func zForAffine(x, y *big.Int) *big.Int {
	z := new(big.Int)
	if x.Sign() != 0 || y.Sign() != 0 {
		z.SetInt64(1)
	}
	return z
}

// affineFromJacobian reverses the Jacobian transform. See the comment at the
// top of the file. If the point is ∞ it returns 0, 0.
func (curve *CurveParams) affineFromJacobian(x, y, z *big.Int) (xOut, yOut *big.Int) {
	if z.Sign() == 0 {
		return new(big.Int), new(big.Int)
	}

	zinv := new(big.Int).ModInverse(z, curve.P)
	zinvsq := new(big.Int).Mul(zinv, zinv)

	xOut = new(big.Int).Mul(x, zinvsq)
	xOut.Mod(xOut, curve.P)
	zinvsq.Mul(zinvsq, zinv)
	yOut = new(big.Int).Mul(y, zinvsq)
	yOut.Mod(yOut, curve.P)
	return
}

// Add adds 2 points
func (curve *CurveParams) Add(x1, y1, x2, y2 *big.Int) (*big.Int, *big.Int) {
	z1 := zForAffine(x1, y1)
	z2 := zForAffine(x2, y2)
	return curve.affineFromJacobian(curve.addJacobian(x1, y1, z1, x2, y2, z2))
}

// addJacobian takes two points in Jacobian coordinates, (x1, y1, z1) and
// (x2, y2, z2) and returns their sum, also in Jacobian form.
func (curve *CurveParams) addJacobian(x1, y1, z1, x2, y2, z2 *big.Int) (*big.Int, *big.Int, *big.Int) {
	// See https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#addition-add-2007-bl
	x3, y3, z3 := new(big.Int), new(big.Int), new(big.Int)
	if z1.Sign() == 0 {
		x3.Set(x2)
		y3.Set(y2)
		z3.Set(z2)
		return x3, y3, z3
	}
	if z2.Sign() == 0 {
		x3.Set(x1)
		y3.Set(y1)
		z3.Set(z1)
		return x3, y3, z3
	}

	z1z1 := new(big.Int).Mul(z1, z1)
	z1z1.Mod(z1z1, curve.P)
	z2z2 := new(big.Int).Mul(z2, z2)
	z2z2.Mod(z2z2, curve.P)

	u1 := new(big.Int).Mul(x1, z2z2)
	u1.Mod(u1, curve.P)
	u2 := new(big.Int).Mul(x2, z1z1)
	u2.Mod(u2, curve.P)
	h := new(big.Int).Sub(u2, u1)
	xEqual := h.Sign() == 0
	if h.Sign() == -1 {
		h.Add(h, curve.P)
	}
	i := new(big.Int).Lsh(h, 1)
	i.Mul(i, i)
	j := new(big.Int).Mul(h, i)

	s1 := new(big.Int).Mul(y1, z2)
	s1.Mul(s1, z2z2)
	s1.Mod(s1, curve.P)
	s2 := new(big.Int).Mul(y2, z1)
	s2.Mul(s2, z1z1)
	s2.Mod(s2, curve.P)
	r := new(big.Int).Sub(s2, s1)
	if r.Sign() == -1 {
		r.Add(r, curve.P)
	}
	yEqual := r.Sign() == 0
	if xEqual && yEqual {
		return curve.doubleJacobian(x1, y1, z1)
	}
	r.Lsh(r, 1)
	v := new(big.Int).Mul(u1, i)

	x3.Set(r)
	x3.Mul(x3, x3)
	x3.Sub(x3, j)
	x3.Sub(x3, v)
	x3.Sub(x3, v)
	x3.Mod(x3, curve.P)

	y3.Set(r)
	v.Sub(v, x3)
	y3.Mul(y3, v)
	s1.Mul(s1, j)
	s1.Lsh(s1, 1)
	y3.Sub(y3, s1)
	y3.Mod(y3, curve.P)

	z3.Add(z1, z2)
	z3.Mul(z3, z3)
	z3.Sub(z3, z1z1)
	z3.Sub(z3, z2z2)
	z3.Mul(z3, h)
	z3.Mod(z3, curve.P)

	return x3, y3, z3
}

// Double doubles the point
func (curve *CurveParams) Double(x1, y1 *big.Int) (*big.Int, *big.Int) {
	z1 := zForAffine(x1, y1)
	return curve.affineFromJacobian(curve.doubleJacobian(x1, y1, z1))
}

// doubleJacobian takes a point in Jacobian coordinates, (x, y, z), and
// returns its double, also in Jacobian form.
func (curve *CurveParams) doubleJacobian(x, y, z *big.Int) (*big.Int, *big.Int, *big.Int) {
	// See https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
	delta := new(big.Int).Mul(z, z)
	delta.Mod(delta, curve.P)
	gamma := new(big.Int).Mul(y, y)
	gamma.Mod(gamma, curve.P)

	var alpha *big.Int
	if big.NewInt(-3).Cmp(curve.A) == 0 {
		// for a = -3, 3*x²+a*delta² = 3*(x+delta)*(x-delta)
		alpha = new(big.Int).Sub(x, delta)
		alpha2 := new(big.Int).Add(x, delta)
		alpha.Mul(alpha, alpha2)
		alpha2.Set(alpha)
		alpha.Lsh(alpha, 1)
		alpha.Add(alpha, alpha2)
	} else {
		// see https://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian.html#doubling-dbl-2007-bl
		// M = 3*x²+a*zz², zz = z² = delta
		x2 := new(big.Int).Mul(x, x)
		alpha = new(big.Int).Lsh(x2, 1)
		alpha.Add(alpha, x2)
		if new(big.Int).Cmp(curve.A) != 0 {
			delta.Mul(delta, delta)
			delta.Mul(curve.A, delta)
			alpha.Add(alpha, delta)
		}
	}
	alpha.Mod(alpha, curve.P)

	beta4 := new(big.Int).Mul(x, gamma)
	beta4.Lsh(beta4, 2)
	beta4.Mod(beta4, curve.P)

	// X3 = alpha²-8*beta
	x3 := new(big.Int).Mul(alpha, alpha)
	beta8 := new(big.Int).Lsh(beta4, 1)
	x3.Sub(x3, beta8)
	x3.Mod(x3, curve.P)

	// Z3 = (Y1+Z1)²-gamma-delta = 2*Y1*Z1
	z3 := delta.Mul(y, z)
	z3.Lsh(z3, 1)
	z3.Mod(z3, curve.P)

	// Y3 = alpha*(4*beta-X3)-8*gamma²
	beta4.Sub(beta4, x3)
	y3 := alpha.Mul(alpha, beta4)
	gamma.Mul(gamma, gamma)
	gamma.Lsh(gamma, 3)
	y3.Sub(y3, gamma)
	y3.Mod(y3, curve.P)

	return x3, y3, z3
}

// ScalarMult computes scalar multiplication of a given point
func (curve *CurveParams) ScalarMult(Bx, By *big.Int, k []byte) (*big.Int, *big.Int) {
	Bz := new(big.Int).SetInt64(1)
	x, y, z := new(big.Int), new(big.Int), new(big.Int)

	for _, byte := range k {
		for bitNum := 0; bitNum < 8; bitNum++ {
			x, y, z = curve.doubleJacobian(x, y, z)
			if byte&0x80 == 0x80 {
				x, y, z = curve.addJacobian(Bx, By, Bz, x, y, z)
			}
			byte <<= 1
		}
	}

	return curve.affineFromJacobian(x, y, z)
}

// ScalarBaseMult computes scalar multiplication of the base point
func (curve *CurveParams) ScalarBaseMult(k []byte) (*big.Int, *big.Int) {
	return curve.ScalarMult(curve.Gx, curve.Gy, k)
}

// MarshalCompressed converts a point on the curve into the compressed form
// specified in section 4.3.6 of ANSI X9.62.
func MarshalCompressed(curve elliptic.Curve, x, y *big.Int) []byte {
	// marshall is same as that of elliptic package
	return elliptic.MarshalCompressed(curve, x, y)
}

// UnmarshalCompressed converts a point, serialized by MarshalCompressed, into an x, y pair.
// It is an error if the point is not in compressed form or is not on the curve.
// On error, x = nil.
func UnmarshalCompressed(curve elliptic.Curve, data []byte) (x, y *big.Int) {
	switch v := curve.(type) {
	case *CurveParams:
		return unmarshalCompressed(v, data)
	default:
		return elliptic.UnmarshalCompressed(curve, data)
	}
}

func unmarshalCompressed(params *CurveParams, data []byte) (x, y *big.Int) {
	byteLen := (params.Params().BitSize + 7) / 8
	if len(data) != 1+byteLen {
		return nil, nil
	}
	if data[0] != 2 && data[0] != 3 { // compressed form
		return nil, nil
	}
	p := params.P
	x = new(big.Int).SetBytes(data[1:])
	if x.Cmp(p) >= 0 {
		return nil, nil
	}
	// y² = x³ + ax + b
	y = params.polynomial(x)
	y = y.ModSqrt(y, p)
	if y == nil {
		return nil, nil
	}
	if byte(y.Bit(0)) != data[0]&1 {
		y.Neg(y).Mod(y, p)
	}
	if !params.IsOnCurve(x, y) {
		return nil, nil
	}
	return
}
