package dleq

import (
	"crypto"
	"crypto/elliptic"
	cryptoRand "crypto/rand"
	_ "crypto/sha256"
	"math/big"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/torusresearch/pvss/secp256k1"
)

func TestValidProof(t *testing.T) {
	// all public keys are going to be generators, but knowing the dlog isn't desirable
	// ideally you'd get these out of a group-element-producing PRF or something
	// like Elligator. but that doesn't matter for testing.
	curve := *secp256k1.Curve

	x, _, _, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	a, _, _, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	if err != nil {
		t.Fatal(err)
	}

	_, Gx, Gy, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	G := &common.Point{X: *Gx, Y: *Gy}
	if err != nil {
		t.Fatal(err)
	}
	_, Mx, My, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	M := &common.Point{X: *Mx, Y: *My}
	if err != nil {
		t.Fatal(err)
	}

	Hx, Hy := curve.ScalarMult(Gx, Gy, x)
	H := &common.Point{X: *Hx, Y: *Hy}
	Zx, Zy := curve.ScalarMult(Mx, My, x)
	Z := &common.Point{X: *Zx, Y: *Zy}

	dleq := DLEQ{G1: G, H1: H, G2: M, H2: Z}

	proof := NewProof(new(big.Int).SetBytes(a), new(big.Int).SetBytes(x), dleq, crypto.SHA256, curve)
	if !proof.Verify(dleq, curve) {
		t.Fatal("proof was invalid")
	}
}

func TestInvalidProof(t *testing.T) {
	curve := *secp256k1.Curve

	x, _, _, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	a, _, _, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	_, Gx, Gy, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	G := &common.Point{X: *Gx, Y: *Gy}
	if err != nil {
		t.Fatal(err)
	}
	_, Mx, My, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	M := &common.Point{X: *Mx, Y: *My}
	if err != nil {
		t.Fatal(err)
	}

	n, _, _, err := elliptic.GenerateKey(curve, cryptoRand.Reader)
	if err != nil {
		t.Fatal(err)
	}

	Hx, Hy := curve.ScalarMult(Gx, Gy, x)
	H := &common.Point{X: *Hx, Y: *Hy}

	// using Z = nM instead
	Zx, Zy := curve.ScalarMult(Mx, My, n)
	Z := &common.Point{X: *Zx, Y: *Zy}

	dleq := DLEQ{G1: G, H1: H, G2: M, H2: Z}

	proof := NewProof(new(big.Int).SetBytes(a), new(big.Int).SetBytes(x), dleq, crypto.SHA256, curve)
	if proof.Verify(dleq, curve) {
		t.Fatal("validated an invalid proof")
	}
}
