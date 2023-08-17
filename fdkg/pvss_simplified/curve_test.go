package pvssgpt

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/stretchr/testify/assert"
)

func TestCurve(t *testing.T) {
	// Define your curve parameters here
	myCurve := NewCustomCurve()
	G := common.BigIntToPoint(myCurve.Gx, myCurve.Gy)

	y := G.Y
	x := G.X
	// y² = x³ + ax + b
	y2 := new(big.Int).Mul(&y, &y)
	y2.Mod(y2, myCurve.P)
	fmt.Printf("y2: %v\n", y2)
	fmt.Printf("rhs: %v\n", myCurve.Polynomial(&x))

	assert.True(t, myCurve.Polynomial(&x).Cmp(y2) == 0)

	assert.True(t, myCurve.IsOnCurve(&G.X, &G.Y))

	zero := big.NewInt(0)
	result := common.BigIntToPoint(myCurve.ScalarBaseMult(zero.Bytes()))
	assert.False(t, result.IsOnCurve(myCurve.Params()))
	assert.Equal(t, result.X, *zero)
	assert.Equal(t, result.Y, *zero)

	one := big.NewInt(1)
	result = common.BigIntToPoint(myCurve.ScalarBaseMult(one.Bytes()))
	assert.Equal(t, G, result)
	assert.True(t, myCurve.IsOnCurve(&result.X, &result.Y))

	// find order

	X, Y := myCurve.Add(&G.X, &G.Y, &G.X, &G.Y)
	count := 2
	for !(X.Cmp(&G.X) == 0 && Y.Cmp(&G.Y) == 0) {
		X, Y = myCurve.Add(X, Y, &G.X, &G.Y)
		count = count + 1
	}
	fmt.Printf("order of G is %v\n", count)
	actual_X, actual_Y := myCurve.ScalarBaseMult(big.NewInt(int64(count)).Bytes())
	assert.Equal(t, 0, G.X.Cmp(actual_X))
	assert.Equal(t, 0, G.Y.Cmp(actual_Y))
}
