package dleq

import (
	"crypto"
	"crypto/elliptic"
	"crypto/hmac"
	"math/big"

	"github.com/delendum-xyz/private-voting/fdkg/common"
)

type DLEQ struct {
	G1, G2 *common.Point
	H1, H2 *common.Point
}
type DLEQProof struct {
	Z *big.Int // response value
	C *big.Int // hash of intermediate proof values to streamline equality checks

	Curve elliptic.Curve
	hash  crypto.Hash
}

func NewProof(w, a *big.Int, dleq DLEQ, hash crypto.Hash, curve elliptic.Curve) DLEQProof {
	// (a, b) = (g^s, m^s)
	Ax, Ay := curve.ScalarMult(&dleq.G1.X, &dleq.G1.Y, w.Bytes())
	Bx, By := curve.ScalarMult(&dleq.G2.X, &dleq.G2.Y, w.Bytes())

	// c = H(g, h, z, a, b)
	// Note: in the paper this is H(m, z, a, b) to constitute a signature over
	// m and prevent existential forgery. What we care about here isn't
	// committing to a particular m but the equality with the specific public
	// key h.
	H := hash.New()
	H.Write(dleq.G1.Marshal(curve))
	H.Write(dleq.H1.Marshal(curve))
	H.Write(dleq.G2.Marshal(curve))
	H.Write(dleq.H2.Marshal(curve))
	H.Write(elliptic.Marshal(curve, Ax, Ay))
	H.Write(elliptic.Marshal(curve, Bx, By))
	cBytes := H.Sum(nil)

	// Expressing this as r = s - cx instead of r = s + cx saves us an
	// inversion of c when calculating A and B on the verification side.
	c := new(big.Int).SetBytes(cBytes)
	c.Mod(c, curve.Params().N) // c = c (mod q)
	r := new(big.Int).Neg(c)   // r = -c
	r.Mul(r, a)                // r = -cx
	r.Add(r, w)                // r = s - cx
	r.Mod(r, curve.Params().N) // r = r (mod q)

	return DLEQProof{
		Z: r, C: c,
		hash:  hash,
		Curve: curve,
	}
}

func (pr *DLEQProof) Verify(dleq DLEQ, curve elliptic.Curve) bool {
	cHx, cHy := curve.ScalarMult(&dleq.H1.X, &dleq.H1.Y, pr.C.Bytes())
	r1x, r1y := curve.ScalarMult(&dleq.G1.X, &dleq.G1.Y, pr.Z.Bytes())
	A1x, A1y := curve.Add(r1x, r1y, cHx, cHy)

	// b = (m^r)(z^c)
	// B = rM + cZ
	cZx, cZy := curve.ScalarMult(&dleq.H2.X, &dleq.H2.Y, pr.C.Bytes())
	r2x, r2y := curve.ScalarMult(&dleq.G2.X, &dleq.G2.Y, pr.Z.Bytes())
	A2x, A2y := curve.Add(r2x, r2y, cZx, cZy)

	// C' = H(g, h, z, a, b) == C
	H := pr.hash.New()
	H.Write(dleq.G1.Marshal(curve))
	H.Write(dleq.H1.Marshal(curve))
	H.Write(dleq.G2.Marshal(curve))
	H.Write(dleq.H2.Marshal(curve))
	H.Write(elliptic.Marshal(curve, A1x, A1y))
	H.Write(elliptic.Marshal(curve, A2x, A2y))
	c := H.Sum(nil)

	return hmac.Equal(pr.C.Bytes(), c)
}
