package elgamal

import (
	"crypto/elliptic"
	"fmt"
	"math/big"

	"github.com/torusresearch/pvss/secp256k1"

	"github.com/delendum-xyz/private-voting/fdkg/common"
)

func computeMFromBallot(b common.EncryptedBallot, votingPrivateKey big.Int, curve elliptic.Curve) common.Point {
	Z := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&b.C1.X, &b.C1.Y, votingPrivateKey.Bytes()))
	// -Z
	negZ_Y := new(big.Int).Neg(&Z.Y)
	negZ_Y.Mod(negZ_Y, curve.Params().P)
	negZ := common.BigIntToPoint(&Z.X, negZ_Y)

	// M = C2 - Z
	M := common.BigIntToPoint(curve.Add(&b.C2.X, &b.C2.Y, &negZ.X, &negZ.Y))
	return M
}

func DecryptSingleCandidateBallot(b common.EncryptedBallot, max int, votingPrivateKey big.Int, curve elliptic.Curve) int {
	M := computeMFromBallot(b, votingPrivateKey, curve)
	return decryptSingleCandidateResults(M, max, curve)
}

func DecryptMultiCandidateBallot(b common.EncryptedBallot, votesCount int, votingPrivateKey big.Int, curve elliptic.Curve) (int, int, int, int) {
	M := computeMFromBallot(b, votingPrivateKey, curve)
	return exhoustiveSearch(M, votesCount, curve)

}

func DecryptResults(Z common.Point, C2 common.Point, votesCount int, options int, curve elliptic.Curve) []int {
	// -Z
	negZ_Y := new(big.Int).Neg(&Z.Y)
	negZ_Y.Mod(negZ_Y, curve.Params().P)
	negZ := common.BigIntToPoint(&Z.X, negZ_Y)
	// M = C2 - Z
	M := common.BigIntToPoint(curve.Add(&C2.X, &C2.Y, &negZ.X, &negZ.Y))
	// M = xH
	if options == 2 {
		result := decryptSingleCandidateResults(M, votesCount, curve)
		return []int{result}
	} else {
		x0, x1, x2, x3 := exhoustiveSearch(M, votesCount, curve)
		return []int{x0, x1, x2, x3}
	}
}

func decryptSingleCandidateResults(M common.Point, votesCount int, curve elliptic.Curve) int {
	for i := 0; i <= votesCount; i++ {
		X, Y := secp256k1.Curve.ScalarMult(&H0.X, &H0.Y, big.NewInt(int64(i)).Bytes())
		if X.Cmp(&M.X) == 0 && Y.Cmp(&M.Y) == 0 {
			return i
		}
	}
	panic("x not found")
}

func exhoustiveSearch(M common.Point, max_votes int, curve elliptic.Curve) (int, int, int, int) {
	rounds := 0
	for i := 0; i <= max_votes; i++ {
		// x0 * G0
		iG0_X, iG0_Y := secp256k1.Curve.ScalarMult(&H0.X, &H0.Y, big.NewInt(int64(i)).Bytes())
		for j := 0; j <= max_votes-i; j++ {
			// x1 * G1
			jG1_X, jG1_Y := secp256k1.Curve.ScalarMult(&H1.X, &H1.Y, big.NewInt(int64(j)).Bytes())
			two_X, two_Y := curve.Add(iG0_X, iG0_Y, jG1_X, jG1_Y)
			for k := 0; k <= max_votes-i-j; k++ {
				// x2 * G2
				kG1_X, kG1_Y := secp256k1.Curve.ScalarMult(&H2.X, &H2.Y, big.NewInt(int64(k)).Bytes())
				three_X, three_Y := curve.Add(two_X, two_Y, kG1_X, kG1_Y)
				for l := 0; l <= max_votes-i-j-k; l++ {
					// x3 * G3
					lG1_X, lG1_Y := secp256k1.Curve.ScalarMult(&H3.X, &H3.Y, big.NewInt(int64(l)).Bytes())
					four_X, four_Y := curve.Add(three_X, three_Y, lG1_X, lG1_Y)
					rounds += 1
					if four_X.Cmp(&M.X) == 0 && four_Y.Cmp(&M.Y) == 0 {
						return i, j, k, l
					}
				}
			}
		}
	}
	panic(fmt.Sprintf("Could not find the solution after %v rounds", rounds))
}
