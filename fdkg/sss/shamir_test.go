package sss

import (
	"math/big"
	"testing"

	"fmt"

	"github.com/delendum-xyz/private-voting/fdkg/utils"

	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

func TestShamirSecretSharing(t *testing.T) {
	prime := secp256k1.GeneratorOrder
	// Example shares with x-coordinates and corresponding y-values
	// y = x^2 + 2x + 1
	// x-0, y=1
	// x=1, y=4
	// x=2, y=9
	// x=3, y=16
	// x=4, y=25

	shares := []common.PrimaryShare{
		{Index: 3, Value: *big.NewInt(16)},
		{Index: 1, Value: *big.NewInt(4)},
		{Index: 2, Value: *big.NewInt(9)},
	}

	targetX := 0

	// reference implementation
	interpolated := pvss.LagrangeScalar(shares, targetX)
	fmt.Printf("LagrangeScalar at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(1)) != 0 {
		t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
	}

	interpolated = Interpolate(targetX, shares, prime)
	fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(1)) != 0 {
		t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
	}

	interpolated = InterpolateWithSeparateCoefficients(targetX, shares, prime)
	fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(1)) != 0 {
		t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
	}

	targetX = 4

	interpolated = pvss.LagrangeScalar(shares, targetX)
	fmt.Printf("LagrangeScalar at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(25)) != 0 {
		t.Errorf("Expected interpolated %v, got %v", 25, interpolated)
	}

	interpolated = Interpolate(targetX, shares, prime)
	fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(25)) != 0 {
		t.Errorf("Expected : %v, got %v", 25, interpolated)
	}

	interpolated = InterpolateWithSeparateCoefficients(targetX, shares, prime)
	fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, interpolated)
	if interpolated.Cmp(big.NewInt(25)) != 0 {
		t.Errorf("Expected interpolated %v, got %v", 25, interpolated)
	}
}

func TestLagrangeCoefficients(t *testing.T) {
	prime := secp256k1.GeneratorOrder
	// Example shares with x-coordinates and corresponding y-values
	// y = x^2 + 2x + 1
	// x-0, y=1
	// x=1, y=4
	// x=2, y=9
	// x=3, y=16
	// x=4, y=25

	shares := []common.PrimaryShare{
		{Index: 1, Value: *big.NewInt(4)},
		{Index: 2, Value: *big.NewInt(9)},
		{Index: 3, Value: *big.NewInt(16)},
	}

	targetX := 0

	est1 := estimate1(shares, targetX, prime)
	est2 := estimate2(shares, targetX, prime)

	if est1.Cmp(est2) != 0 {
		t.Errorf("Expected %v, got %v", est1, est2)
	}

	targetX = 4

	est1 = estimate1(shares, targetX, prime)
	est2 = estimate2(shares, targetX, prime)

	if est1.Cmp(est2) != 0 {
		t.Errorf("Expected %v, got %v", est1, est2)
	}

	/// ----
}

func estimate1(shares []common.PrimaryShare, targetX int, prime *big.Int) *big.Int {
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	est := big.NewInt(0)
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		prod := LagrangeCoefficients(shareValue, i, targetX, X, prime)
		fmt.Printf("[estimate1 for target=%v] prod_%v: %v\n", targetX, i, prod)
		est.Add(est, prod)
	}

	est.Mod(est, prime)
	return est
}

func estimate2(shares []common.PrimaryShare, targetX int, prime *big.Int) *big.Int {
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	est := big.NewInt(0)
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		fmt.Printf("[estimate2 for target=%v] shareValue_%v: %v\n", targetX, i, shareValue)
		prod := LagrangeCoefficientsStartFromOne(i, targetX, X, prime)
		fmt.Printf("[estimate2 for target=%v] prod_%v: %v\n", targetX, i, prod)

		prod.Mul(prod, shareValue)
		prod.Mod(prod, prime)
		est.Add(est, prod)
	}

	est.Mod(est, prime)
	return est
}
