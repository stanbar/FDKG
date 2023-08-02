package sss

import (
	"crypto/elliptic"
	"math/big"
	"testing"

	"fmt"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
)

const ITERATIONS = 1000

func TestShamirSecretSharing(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
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
		interpolated := LagrangeScalar(shares, targetX, curve)
		fmt.Printf("LagrangeScalar at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(1)) != 0 {
			t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
		}

		interpolated = Interpolate(targetX, shares, curve)
		fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(1)) != 0 {
			t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
		}

		interpolated = InterpolateWithSeparateCoefficients(targetX, shares, curve)
		fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(1)) != 0 {
			t.Errorf("Expected interpolated %v, got %v", 1, interpolated)
		}

		targetX = 4

		interpolated = LagrangeScalar(shares, targetX, curve)
		fmt.Printf("LagrangeScalar at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(25)) != 0 {
			t.Errorf("Expected interpolated %v, got %v", 25, interpolated)
		}

		interpolated = Interpolate(targetX, shares, curve)
		fmt.Printf("Basis Polynomial at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(25)) != 0 {
			t.Errorf("Expected : %v, got %v", 25, interpolated)
		}

		interpolated = InterpolateWithSeparateCoefficients(targetX, shares, curve)
		fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, interpolated)
		if interpolated.Cmp(big.NewInt(25)) != 0 {
			t.Errorf("Expected interpolated %v, got %v", 25, interpolated)
		}
	}
}

func TestLagrangeCoefficients(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
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

		est1 := estimate1(shares, targetX, curve)
		est2 := estimate2(shares, targetX, curve)
		est3 := estimate3(shares, targetX, curve)

		if est1.Cmp(big.NewInt(1)) != 0 {
			t.Errorf("Expected %v, got %v", est1, big.NewInt(1))
		}
		if est1.Cmp(est2) != 0 {
			t.Errorf("Expected %v, got %v", est1, est2)
		}
		if est3.Cmp(est2) != 0 {
			t.Errorf("Expected %v, got %v", est3, est2)
		}

		targetX = 4

		est1 = estimate1(shares, targetX, curve)
		est2 = estimate2(shares, targetX, curve)

		if est1.Cmp(est2) != 0 {
			t.Errorf("Expected %v, got %v", est1, est2)
		}
	}
}

func estimate1(shares []common.PrimaryShare, targetX int, curve elliptic.Curve) *big.Int {
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	est := big.NewInt(0)
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		prod := LagrangeCoefficients(shareValue, i, targetX, X, curve)
		fmt.Printf("[estimate1 for target=%v] prod_%v: %v\n", targetX, i, prod)
		est.Add(est, prod)
	}

	est.Mod(est, curve.Params().N)
	return est
}

func estimate2(shares []common.PrimaryShare, targetX int, curve elliptic.Curve) *big.Int {
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	est := big.NewInt(0)
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		fmt.Printf("[estimate2 for target=%v] shareValue_%v: %v\n", targetX, i, shareValue)
		prod := LagrangeCoefficientsStartFromOne(i, targetX, X, curve)
		fmt.Printf("[estimate2 for target=%v] prod_%v: %v\n", targetX, i, prod)

		prod.Mul(prod, shareValue)
		prod.Mod(prod, curve.Params().N)
		est.Add(est, prod)
	}

	est.Mod(est, curve.Params().N)
	return est
}

func estimate3(shares []common.PrimaryShare, targetX int, curve elliptic.Curve) *big.Int {
	X := utils.Map(shares, func(share common.PrimaryShare) int { return share.Index })
	Y := utils.Map(shares, func(share common.PrimaryShare) big.Int { return share.Value })

	est := big.NewInt(0)
	for i := 0; i < len(X); i++ {
		shareValue := &Y[i]
		fmt.Printf("[estimate3 for target=%v] shareValue_%v: %v\n", targetX, i, shareValue)
		prod := LagrangeCoefficientsStartFromOneAbs(i, X, curve)
		fmt.Printf("[estimate3 for target=%v] prod_%v: %v\n", targetX, i, prod)

		prod.Mul(prod, shareValue)
		prod.Mod(prod, curve.Params().N)
		est.Add(est, prod)
	}

	est.Mod(est, curve.Params().N)
	return est
}

func TestCommutingTwoSecrets(t *testing.T) {
	// y = x^2 + 2x + 1
	// x-0, y=1
	// x=1, y=4
	// x=2, y=9
	// x=3, y=16
	// x=4, y=25
	alice_secret := big.NewInt(int64(1))
	alice_shares := []common.PrimaryShare{
		{Index: 3, Value: *big.NewInt(16)},
		{Index: 1, Value: *big.NewInt(4)},
		{Index: 2, Value: *big.NewInt(9)},
	}

	// y = x^2 + 2x + 3
	// x=0, y=3
	// x=1, y=6
	// x=2, y=11
	// x=3, y=18
	// x=4, y=27
	bob_secret := big.NewInt(int64(3))
	bob_shares := []common.PrimaryShare{
		{Index: 3, Value: *big.NewInt(27)},
		{Index: 1, Value: *big.NewInt(6)},
		{Index: 2, Value: *big.NewInt(11)},
	}

	targetX := 0

	alice_interpolated_secret := InterpolateWithSeparateCoefficients(targetX, alice_shares, curve)
	fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, alice_interpolated_secret)
	if alice_interpolated_secret.Cmp(alice_secret) != 0 {
		t.Errorf("Expected interpolated %v, got %v", alice_secret, alice_interpolated_secret)
	}

	bob_interpolated_secret := InterpolateWithSeparateCoefficients(targetX, bob_shares, curve)
	fmt.Printf("InterpolateWithSeparateCoefficients at f(%v)=%v\n", targetX, bob_interpolated_secret)
	if bob_interpolated_secret.Cmp(bob_secret) != 0 {
		t.Errorf("Expected interpolated %v, got %v", bob_secret, bob_interpolated_secret)
	}

}
