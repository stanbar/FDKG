package common

import (
	"crypto/elliptic"
	"errors"
	"math/big"
)

type SigncryptedOutput struct {
	NodePubKey       Point
	NodeIndex        int
	SigncryptedShare Signcryption
}

type Signcryption struct {
	Ciphertext []byte
	R          Point
	Signature  big.Int
}

type PrimaryPolynomial struct {
	Coeff     []big.Int
	Threshold int
}

type PrimaryShare struct {
	Index int
	Value big.Int
}

type Point struct {
	X, Y big.Int
}

func (p Point) IsOnCurve(curve elliptic.Curve) bool {
	return curve.IsOnCurve(&p.X, &p.Y)
}

var ErrInvalidPoint = errors.New("marshaled point was invalid")

func (p *Point) Marshal(curve elliptic.Curve) []byte {
	return elliptic.Marshal(curve, &p.X, &p.Y)
}

func (p *Point) Unmarshal(curve elliptic.Curve, data []byte) error {
	pX, pY := elliptic.Unmarshal(curve, data)
	p.X, p.Y = *pX, *pY
	return nil
}

type Node struct {
	Index  int
	PubKey Point
}

type VotingConfig struct {
	Size          int
	Options       int
	Threshold     int
	GuardiansSize int
}

type EncryptedBallot struct {
	C1 Point
	C2 Point
}

type PartialDecryption struct {
	Index int
	Value Point
}
