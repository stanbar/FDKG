package common

import (
	"math/big"

	"golang.org/x/crypto/sha3"
)

func BigIntToPoint(x, y *big.Int) Point {
	return Point{X: *x, Y: *y}
}

func HexToBigInt(s string) *big.Int {
	r, ok := new(big.Int).SetString(s, 16)
	if !ok {
		panic("invalid hex in source file: " + s)
	}
	return r
}

func Keccak256(data ...[]byte) []byte {
	d := sha3.NewLegacyKeccak256()
	for _, b := range data {
		d.Write(b)
	}
	return d.Sum(nil)
}
