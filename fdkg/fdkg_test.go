package main

import (
	"fmt"
	"math/big"
	"math/rand"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/pki"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

const ITERATIONS = 1000

func TestNewLocalParty(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n := 6
		n_dkg := 6
		degree := 1
		n_trustedParties := 3
		localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r)
		if len(localNodes) != n {
			t.Errorf("Expected %d nodes, got %d", n, len(localNodes))
		}
		for _, node := range localNodes {
			if node.Index == 0 {
				t.Errorf("Expected index to be greater than 0, got %d", node.Index)
			}
			if !secp256k1.Curve.IsOnCurve(&node.PublicKey.X, &node.PublicKey.Y) {
				t.Errorf("Expected public key to be on curve, got %v", node.PublicKey)
			}
			if !secp256k1.Curve.IsOnCurve(&node.VotingPublicKey.X, &node.VotingPublicKey.Y) {
				t.Errorf("Expected voting public key to be on curve, got %v", node.VotingPublicKey)
			}
		}
		// check that all nodes have unique private and public keys
		for i, node := range localNodes {
			for j, otherNode := range localNodes {
				if i != j {
					if node.PrivateKey.Cmp(&otherNode.PrivateKey) == 0 {
						t.Errorf("Expected private keys to be different, got %v and %v", node.PrivateKey, otherNode.PrivateKey)
					}
					if node.PublicKey.X.Cmp(&otherNode.PublicKey.X) == 0 && node.PublicKey.Y.Cmp(&otherNode.PublicKey.Y) == 0 {
						t.Errorf("Expected public keys to be different, got %v and %v", node.PublicKey, otherNode.PublicKey)
					}
					if node.VotingPrivKeyShare.Cmp(&otherNode.VotingPrivKeyShare) == 0 {
						t.Errorf("Expected voting private keys to be different, got %v and %v", node.VotingPrivKeyShare, otherNode.VotingPrivKeyShare)
					}
					if node.VotingPublicKey.X.Cmp(&otherNode.VotingPublicKey.X) == 0 && node.VotingPublicKey.Y.Cmp(&otherNode.VotingPublicKey.Y) == 0 {
						t.Errorf("Expected voting public keys to be different, got %v and %v", node.VotingPublicKey, otherNode.VotingPublicKey)
					}
				}
			}
		}

		if len(dkgNodes) != n_dkg {
			t.Errorf("Expected %d nodes, got %d", n_dkg, len(dkgNodes))
		}
	}
}

func TestCorrectSharingAndReconstruction(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n := 6
		n_dkg := 6
		degree := 1
		n_trustedParties := 3
		localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r)
		// generate shares for each node
		receiverToShares := make(map[int][]sss.Share)
		senderToShares := make(map[int][]sss.Share)
		for _, node := range dkgNodes {
			shares := node.GenerateShares()
			if len(shares) == 0 {
				t.Errorf("Node %d generated no shares", node.Index)
			}
			senderToShares[node.Index] = shares
			for _, share := range shares {
				receiverToShares[share.To] = append(receiverToShares[share.To], share)
			}
		}
		// for each party reconstruct secret
		for partyIndex, shares := range senderToShares {
			primaryShares := utils.Map(shares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })

			fmt.Printf("Party_%d has following shares %v \n", partyIndex, utils.Map(primaryShares, func(share common.PrimaryShare) int { return share.Index }))
			reconstructedSecret := sss.LagrangeScalar(primaryShares, 0, curve)

			if reconstructedSecret.Cmp(&localNodes[partyIndex-1].VotingPrivKeyShare) != 0 {
				t.Errorf("[%v] Expected secret match VotingPrivKeyShare. reconstructedSecret: %v, VotingPrivKeyShare: %v", i, reconstructedSecret, &localNodes[partyIndex-1].VotingPrivKeyShare)
			}
		}
	}
}

// Failed cases 3, 14, 25, ... (i.e. 11k+3)
func TestShamirSecretSharing(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	for i := 0; i < ITERATIONS; i++ {
		node := pki.NewLocalParty(1, curve, 2, r)
		node11 := pki.NewLocalParty(11, curve, 2, r).PublicParty
		node22 := pki.NewLocalParty(22, curve, 2, r).PublicParty
		node33 := pki.NewLocalParty(33, curve, 2, r).PublicParty
		nodeDkg := node.ToDkgParty([]pki.PublicParty{node11, node22, node33})
		shares := nodeDkg.GenerateShares()
		primeShares := utils.Map(shares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
		secret := sss.LagrangeScalar(primeShares, 0, curve)
		if secret.Cmp(&node.VotingPrivKeyShare) != 0 {
			t.Errorf("[%v] Expected secret %v, got %v \n shares: %v", i, &node.VotingPrivKeyShare, secret, shares)
		}
	}
}

func TestTransitivity(t *testing.T) {
	a := big.NewInt(123)
	b := big.NewInt(321)
	G := secp256k1.G
	aGX, aGY := secp256k1.Curve.ScalarMult(&G.X, &G.Y, a.Bytes())
	bGX, bGY := secp256k1.Curve.ScalarMult(&G.X, &G.Y, b.Bytes())

	Z_X, Z_Y := secp256k1.Curve.Add(aGX, aGY, bGX, bGY)

	if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
		panic("Z is not on curve")
	}

	expectedZ_X, expectedZ_Y := secp256k1.Curve.ScalarMult(&G.X, &G.Y, a.Add(a, b).Bytes())
	if expectedZ_X.Cmp(Z_X) != 0 || expectedZ_Y.Cmp(Z_Y) != 0 {
		t.Errorf("Expected (%v,%v) got (%v,%v)", expectedZ_X, expectedZ_Y, Z_X, Z_Y)
	}
}

// the issue is with the randomness used within Alice.
func TestPartialDecryptionOfTwoDkgNodesAndThreeGuardiansAndOneVote(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	for i := 0; i < ITERATIONS; i++ {
		alice := pki.NewLocalParty(1, curve, 2, r)
		bob := pki.NewLocalParty(2, curve, 2, r)
		carol_local := pki.NewLocalParty(11, curve, 2, r)
		dave_local := pki.NewLocalParty(22, curve, 2, r)
		eve_local := pki.NewLocalParty(33, curve, 2, r)

		carol := carol_local.PublicParty
		dave := dave_local.PublicParty
		eve := eve_local.PublicParty

		aliceTrustedParties := []pki.PublicParty{carol, dave}
		aliceDkg := alice.ToDkgParty(aliceTrustedParties)
		aliceShares := utils.Map(aliceDkg.GenerateShares(), func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
		if len(aliceShares) != len(aliceTrustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}

		bobTrustedParties := []pki.PublicParty{dave, eve}
		bobDkg := bob.ToDkgParty(bobTrustedParties)
		bobShares := utils.Map(bobDkg.GenerateShares(), func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
		if len(bobShares) != len(bobTrustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}
		publicKeys := utils.Map([]pki.DkgParty{aliceDkg, bobDkg}, func(d pki.DkgParty) common.Point { return d.VotingPublicKey })
		votingPubKey := utils.Sum(publicKeys, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})
		if votingPubKey.X.Cmp(&alice.VotingPublicKey.X) == 0 || votingPubKey.Y.Cmp(&alice.VotingPublicKey.Y) == 0 {
			t.Errorf("Voting public key should not be just alice voting public key as she is the only one in the DKG")
		}

		carolShares := []common.PrimaryShare{aliceShares[0]}
		daveShares := []common.PrimaryShare{aliceShares[1], bobShares[0]}
		eveShares := []common.PrimaryShare{bobShares[1]}

		carol_sharesValues := utils.Map(carolShares, func(s common.PrimaryShare) big.Int { return s.Value })
		carol_votingPrivKeyShare := utils.Sum(carol_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })
		carol_votingPrivKeyShare.Mod(&carol_votingPrivKeyShare, curve.N)

		dave_sharesValues := utils.Map(daveShares, func(s common.PrimaryShare) big.Int { return s.Value })
		dave_votingPrivKeyShare := utils.Sum(dave_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })
		dave_votingPrivKeyShare.Mod(&dave_votingPrivKeyShare, curve.N)

		eve_sharesValues := utils.Map(eveShares, func(s common.PrimaryShare) big.Int { return s.Value })
		eve_votingPrivKeyShare := utils.Sum(eve_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })
		eve_votingPrivKeyShare.Mod(&eve_votingPrivKeyShare, curve.N)

		// voting

		votes := Voting([]pki.LocalParty{alice, bob, carol_local, dave_local, eve_local}, votingPubKey, curve, r)

		C1s := utils.Map(votes, func(vote elgamal.EncryptedBallot) common.Point { return vote.C1 })

		// online tally
		C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		A_carol := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, carol_votingPrivKeyShare.Bytes()))
		A_dave := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, dave_votingPrivKeyShare.Bytes()))
		A_eve := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, eve_votingPrivKeyShare.Bytes()))

		// offline tally

		carol_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22, 33}, curve)
		Z_carol := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A_carol.X, &A_carol.Y, carol_lagrange.Bytes()))

		dave_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22, 33}, curve)
		Z_dave := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A_dave.X, &A_dave.Y, dave_lagrange.Bytes()))

		eve_lagrange := sss.LagrangeCoefficientsStartFromOne(2, 0, []int{11, 22, 33}, curve)
		Z_eve := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A_eve.X, &A_eve.Y, eve_lagrange.Bytes()))

		Z := utils.Sum([]common.Point{Z_carol, Z_dave, Z_eve}, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if !curve.IsOnCurve(&Z.X, &Z.Y) {
			t.Errorf("Z is not on curve Z_X: %v Z_Y: %v", Z.X, Z.Y)
			panic("Z is not on curve")
		}

		C2s := utils.Map(votes, func(vote elgamal.EncryptedBallot) common.Point { return vote.C2 })
		C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		negZ_Y := new(big.Int).Neg(&Z.Y)
		negZ_Y.Mod(negZ_Y, curve.Params().P)
		negZ := common.BigIntToPoint(&Z.X, negZ_Y)

		if !secp256k1.Curve.IsOnCurve(&negZ.X, &negZ.Y) {
			fmt.Printf("Z is on curve (%v,%v)\n", &negZ.X, &negZ.Y)
			panic(fmt.Sprintf("negZ is not on curve, %v, %v", &negZ.X, &negZ.Y))
		}

		M := common.BigIntToPoint(curve.Add(&C2.X, &C2.Y, &negZ.X, &negZ.Y))

		x := 0
		for x <= 6 {
			X, Y := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, big.NewInt(int64(x)).Bytes())
			if X.Cmp(&M.X) == 0 && Y.Cmp(&M.Y) == 0 {
				break
			}
			x += 1
			if x > 6 {
				t.Errorf("x not found")
				panic("x not found")
			}
		}

		testMHX, testMHY := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, big.NewInt(int64(x)).Bytes())
		if testMHX.Cmp(&M.X) != 0 || testMHY.Cmp(&M.Y) != 0 {
			panic("x*H != B - (k_i * E)")
		} else {
			fmt.Printf("x is %v\n", x)
		}
	}
}

// the issue is with the randomness used within Alice.
func TestPartialDecryptionOfOneDkgNodeAndTwoGuardiansOneVote(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		alice := pki.NewLocalParty(1, curve, 2, r)
		bob_local := pki.NewLocalParty(11, curve, 2, r)
		carol_local := pki.NewLocalParty(22, curve, 2, r)

		bob := bob_local.PublicParty
		carol := carol_local.PublicParty

		trustedParties := []pki.PublicParty{bob, carol}
		aliceDkg := alice.ToDkgParty(trustedParties)
		aliceShares := aliceDkg.GenerateShares()
		if len(aliceShares) != len(trustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}
		alicePrimaryShares := utils.Map(aliceShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })

		votingPubKey := VotingPublicKey([]pki.DkgParty{aliceDkg})
		if votingPubKey.X.Cmp(&alice.VotingPublicKey.X) != 0 || votingPubKey.Y.Cmp(&alice.VotingPublicKey.Y) != 0 {
			t.Errorf("Voting public key should be just alice voting public key as she is the only one in the DKG")
		}
		share_bob := alicePrimaryShares[0].Value
		share_carol := alicePrimaryShares[1].Value
		// Bob and Carol should have different shares
		if alicePrimaryShares[0].Index-alicePrimaryShares[1].Index == 0 {
			t.Errorf("First and second indexes should be different %v != %v", alicePrimaryShares[0].Index, alicePrimaryShares[1].Index)
		}
		if share_bob.Cmp(&share_carol) == 0 {
			t.Errorf("Bob share should be different than Carol share %v != %v", share_bob, share_carol)
		}
		vote_alice := elgamal.EncryptBoolean(true, votingPubKey, curve, r)

		bob_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22}, curve)
		bob_v := bob_lagrange.Mul(bob_lagrange, &share_bob)
		bob_v = bob_lagrange.Mod(bob_v, curve.Params().N)

		carol_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22}, curve)
		carol_v := carol_lagrange.Mul(carol_lagrange, &share_carol)
		carol_v = carol_lagrange.Mod(carol_v, curve.Params().N)

		// sum votes
		C1_X, C1_Y := &vote_alice.C1.X, &vote_alice.C1.Y

		// partial decryptions
		bob_Z_X, bob_Z_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, bob_v.Bytes())
		carol_Z_X, carol_Z_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, carol_v.Bytes())

		Z_X, Z_Y := secp256k1.Curve.Add(bob_Z_X, bob_Z_Y, carol_Z_X, carol_Z_Y)

		if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
			t.Errorf(`Z is not on curve Z_X: %v Z_Y: %v
			bob_Z_X: %v  bob_Z_Y: %v 
			carol_Z_X: %v  carol_Z_Y: %v
			bob_v: %v carol: %v`, Z_X, Z_Y,
				bob_Z_X, bob_Z_Y, carol_Z_X, carol_Z_Y, bob_v.String()[:5], carol_v.String()[:5])
			panic("Z is not on curve, X: " + Z_X.String() + " Y: " + Z_Y.String())
		}

		expectedZ_X, expectedZ_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, bob_v.Add(bob_v, carol_v).Bytes())
		if expectedZ_X.Cmp(Z_X) != 0 || expectedZ_Y.Cmp(Z_Y) != 0 {
			t.Errorf("Expected (%v,%v) got (%v,%v)", expectedZ_X, expectedZ_Y, Z_X, Z_Y)
		}

		// sum votes
		C2_X, C2_Y := &vote_alice.C2.X, &vote_alice.C2.Y

		negZ_Y := new(big.Int).Neg(Z_Y)
		negZ_Y.Mod(negZ_Y, curve.Params().P)

		negZ := common.BigIntToPoint(Z_X, negZ_Y)
		if Z_X.Cmp(&negZ.X) != 0 {
			t.Errorf("negZ.X != Z.X")
		}
		if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
			panic("Z is not on curve, X: " + Z_X.String() + " Y: " + Z_Y.String())
		}
		if !secp256k1.Curve.IsOnCurve(&negZ.X, &negZ.Y) {
			fmt.Printf("Z is on curve (%v,%v)\n", Z_X, Z_Y)
			panic(fmt.Sprintf("negZ is not on curve, %v, %v", &negZ.X, &negZ.Y))
		}

		mHX, mHY := secp256k1.Curve.Add(C2_X, C2_Y, &negZ.X, &negZ.Y)

		m := big.NewInt(0)
		if mHX.Cmp(&elgamal.H.X) == 0 && mHY.Cmp(&elgamal.H.Y) == 0 {
			m = big.NewInt(1)
		} else if mHX.Cmp(big.NewInt(0)) != 0 || mHY.Cmp(big.NewInt(0)) != 0 {
			panic("m*H is neither 0 nor H")
		}
		testMHX, testMHY := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, m.Bytes())
		if testMHX.Cmp(mHX) != 0 || testMHY.Cmp(mHY) != 0 {
			panic("m*H != B - (k_i * E)")
		} else {
			fmt.Printf("m is %v\n", m)
		}
	}
}

// Why it fails randomly?
// 1. I'm using wrong field order and sometimes the numbers wrap around wrong number
// 2. Zero is generated which zeroes everthing else.

func TestPartialDecryptionOfOneDkgNodeAndTwoGuardiansAndManyVotes(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	for i := 0; i < 4; i++ {
		alice := pki.NewLocalParty(1, curve, 2, r)
		bob_local := pki.NewLocalParty(11, curve, 2, r)
		carol_local := pki.NewLocalParty(22, curve, 2, r)

		bob := bob_local.PublicParty
		carol := carol_local.PublicParty
		fmt.Printf("Alice polynomial is %v\n", alice.Polynomial)
		fmt.Printf("Bob polynomial is %v\n", bob_local.Polynomial)
		fmt.Printf("Carol polynomial is %v\n", carol_local.Polynomial)

		trustedParties := []pki.PublicParty{bob, carol}
		aliceDkg := alice.ToDkgParty(trustedParties)
		aliceShares := aliceDkg.GenerateShares()
		if len(aliceShares) != len(trustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}
		alicePrimaryShares := utils.Map(aliceShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })

		votingPubKey := VotingPublicKey([]pki.DkgParty{aliceDkg})
		if votingPubKey.X.Cmp(&alice.VotingPublicKey.X) != 0 || votingPubKey.Y.Cmp(&alice.VotingPublicKey.Y) != 0 {
			t.Errorf("Voting public key should be just alice voting public key as she is the only one in the DKG")
		}
		share_bob := alicePrimaryShares[0].Value
		share_carol := alicePrimaryShares[1].Value
		if share_bob.Cmp(&share_carol) == 0 || alicePrimaryShares[0].Index == alicePrimaryShares[1].Index {
			t.Errorf("Bob share should be different than Carol share %v != %v", share_bob, share_carol)
		}

		for n_votes := 1; n_votes < 100; n_votes++ {
			fmt.Printf("n_votes is %v\n", n_votes)
			// create n_votes votes
			votes := make([]elgamal.EncryptedBallot, n_votes)
			for i := 0; i < n_votes; i++ {
				votes[i] = elgamal.EncryptBoolean(i%2 == 0, votingPubKey, curve, r)
			}

			bob_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22}, curve)
			bob_v := bob_lagrange.Mul(bob_lagrange, &share_bob)
			bob_v = bob_lagrange.Mod(bob_v, curve.Params().N)

			carol_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22}, curve)
			carol_v := carol_lagrange.Mul(carol_lagrange, &share_carol)
			carol_v = carol_lagrange.Mod(carol_v, curve.Params().N)

			// sum votes
			C1_X, C1_Y := big.NewInt(0), big.NewInt(0)
			for _, vote := range votes {
				C1_X, C1_Y = secp256k1.Curve.Add(&vote.C1.X, &vote.C1.Y, C1_X, C1_Y)
			}

			// partial decryptions
			bob_Z_X, bob_Z_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, bob_v.Bytes())
			carol_Z_X, carol_Z_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, carol_v.Bytes())

			Z_X, Z_Y := secp256k1.Curve.Add(bob_Z_X, bob_Z_Y, carol_Z_X, carol_Z_Y)

			if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
				t.Errorf("Z is not on curve Z_X: %v Z_Y: %v,\n bob_Z_X: %v  bob_Z_Y: %v\n carol_Z_X: %v  carol_Z_Y: %v\n bob_v: %v carol: %v",
					Z_X, Z_Y, bob_Z_X, bob_Z_Y, carol_Z_X, carol_Z_Y, bob_v.String()[:5], carol_v.String()[:5])
				panic("Z is not on curve, X: " + Z_X.String() + " Y: " + Z_Y.String())
			}

			expectedZ_X, expectedZ_Y := secp256k1.Curve.ScalarMult(C1_X, C1_Y, bob_v.Add(bob_v, carol_v).Bytes())
			if expectedZ_X.Cmp(Z_X) != 0 || expectedZ_Y.Cmp(Z_Y) != 0 {
				t.Errorf("Expected (%v,%v) got (%v,%v)", expectedZ_X, expectedZ_Y, Z_X, Z_Y)
			}

			// sum votes
			C2_X, C2_Y := big.NewInt(0), big.NewInt(0)
			for _, vote := range votes {
				C2_X, C2_Y = secp256k1.Curve.Add(&vote.C2.X, &vote.C2.Y, C2_X, C2_Y)
			}

			negZ_Y := new(big.Int).Neg(Z_Y)
			negZ_Y.Mod(negZ_Y, curve.Params().P)

			negZ := common.BigIntToPoint(Z_X, negZ_Y)
			if !secp256k1.Curve.IsOnCurve(&negZ.X, &negZ.Y) {
				panic("negZ is not on curve")
			}

			mHX, mHY := secp256k1.Curve.Add(C2_X, C2_Y, &negZ.X, &negZ.Y)

			x := 0
			for x <= n_votes {
				X, Y := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, big.NewInt(int64(x)).Bytes())
				if X.Cmp(mHX) == 0 && Y.Cmp(mHY) == 0 {
					break
				}
				x += 1
				if x > n_votes {
					t.Errorf("x not found")
					panic("x not found")
				}
			}

			testMHX, testMHY := secp256k1.Curve.ScalarMult(&elgamal.H.X, &elgamal.H.Y, big.NewInt(int64(x)).Bytes())
			if testMHX.Cmp(mHX) != 0 || testMHY.Cmp(mHY) != 0 {
				t.Errorf("m*H != B - (k_i * E)")
				panic("m*H != B - (k_i * E)")
			} else {
				fmt.Printf("m is %v\n", x)
			}
		}
	}
}

func TestPartialDecryptionOfTwoDkgNodesAndThreeGuardian(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		alice := pki.NewLocalParty(1, curve, 2, r)
		bob := pki.NewLocalParty(2, curve, 2, r)
		carol := pki.NewLocalParty(11, curve, 2, r).PublicParty
		dave := pki.NewLocalParty(22, curve, 2, r).PublicParty
		eve := pki.NewLocalParty(33, curve, 2, r).PublicParty
		aliceDkg := alice.ToDkgParty([]pki.PublicParty{carol, dave, eve})
		bobDkg := bob.ToDkgParty([]pki.PublicParty{carol, dave, eve})

		aliceShares := aliceDkg.GenerateShares()
		bobShares := bobDkg.GenerateShares()
		alicePrimeShares := utils.Map(aliceShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
		bobPrimeShares := utils.Map(bobShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
		fmt.Printf("Alice shares %v\n", utils.Map(alicePrimeShares, func(share common.PrimaryShare) int { return share.Index }))
		fmt.Printf("Bob shares %v\n", utils.Map(bobPrimeShares, func(share common.PrimaryShare) int { return share.Index }))

		carolShares := []common.PrimaryShare{alicePrimeShares[0], bobPrimeShares[0]}
		daveShares := []common.PrimaryShare{alicePrimeShares[1], bobPrimeShares[1]}
		eveShares := []common.PrimaryShare{alicePrimeShares[2], bobPrimeShares[2]}
		fmt.Printf("Carol shares %v\n", utils.Map(carolShares, func(share common.PrimaryShare) int { return share.Index }))
		fmt.Printf("Dave shares %v\n", utils.Map(daveShares, func(share common.PrimaryShare) int { return share.Index }))
		fmt.Printf("Eve shares %v\n", utils.Map(eveShares, func(share common.PrimaryShare) int { return share.Index }))
	}
}

func TestPointAtInfinity(t *testing.T) {
	Gx := secp256k1.Curve.Gx
	Gy := secp256k1.Curve.Gy

	resX, resY := secp256k1.Curve.Add(Gx, Gy, big.NewInt(0), big.NewInt(0))
	if resX.Cmp(Gx) != 0 || resY.Cmp(Gy) != 0 {
		t.Errorf("Expected %v, got %v", Gx, resX)
	}
}

func TestVotingKeysSharing(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n := 6
		n_dkg := 6
		degree := 1
		n_trustedParties := 3
		_, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r)
		encryptionKey := VotingPublicKey(dkgNodes)

		decryptionKey := dkgNodes[0].VotingPrivKeyShare
		for _, node := range dkgNodes[1:] {
			decryptionKey.Add(&decryptionKey, &node.VotingPrivKeyShare)
		}

		X, Y := secp256k1.Curve.ScalarBaseMult(decryptionKey.Bytes())

		if !secp256k1.Curve.IsOnCurve(X, Y) {
			t.Errorf("Expected decryption key to be on curve, got %v", decryptionKey)
		}

		if X.Cmp(&encryptionKey.X) != 0 || Y.Cmp(&encryptionKey.Y) != 0 {
			t.Errorf("Expected decryption key to be equal to encryption key, got %v", decryptionKey)
		}
	}
}

func TestVoting(t *testing.T) {
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n := 6
		n_dkg := 1
		degree := 1
		n_trustedParties := 3
		localNodes, dkgNodes := pki.GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, curve, r)
		encryptionKey := VotingPublicKey(dkgNodes)

		if len(dkgNodes) != n_dkg {
			t.Errorf("Expected %d nodes, got %d", n_dkg, len(dkgNodes))
		}
		if dkgNodes[0].VotingPublicKey.X.Cmp(&encryptionKey.X) != 0 || encryptionKey.Y.Cmp(&dkgNodes[0].VotingPublicKey.Y) != 0 {
			t.Errorf("Expected encryption key to be equal to voting public key share, got %v", encryptionKey)
		}

		votes := Voting(localNodes, encryptionKey, curve, r)

		A := votes[0].C1
		for _, vote := range votes[1:] {
			X, Y := secp256k1.Curve.Add(&vote.C1.X, &vote.C1.Y, &A.X, &A.Y)
			A.X, A.Y = *X, *Y
		}

		if !secp256k1.Curve.IsOnCurve(&A.X, &A.Y) {
			panic("A is not on curve")
		}

		// Sum the second part of the ballots (payload)
		B := votes[0].C2
		for _, vote := range votes[1:] {
			X, Y := secp256k1.Curve.Add(&vote.C2.X, &vote.C2.Y, &B.X, &B.Y)
			B.X, B.Y = *X, *Y
		}

		if !secp256k1.Curve.IsOnCurve(&B.X, &B.Y) {
			panic("B is not on curve")
		}

		receiverToShares := make(map[int][]sss.Share)
		for _, node := range dkgNodes {
			shares := node.GenerateShares()
			for _, share := range shares {
				receiverToShares[share.To] = append(receiverToShares[share.To], share)
			}
		}
		if len(receiverToShares) != n_dkg*n_trustedParties {
			t.Errorf("Expected %d receivers, got %d", n_dkg*n_trustedParties, len(receiverToShares))
		}

		// IDEA: reconstruct each DKG key separatelly and provide partial decryption for each of it
		partialDecryptions := make([]PartialDecryption, 0, len(receiverToShares))
		// for each party reconstruct secret
		for partyIndex, shares := range receiverToShares {
			primaryShares := utils.Map(shares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
			fmt.Printf("party.Index = %v has %v shares: %v\n", partyIndex, len(shares), utils.Map(primaryShares, func(share common.PrimaryShare) int { return share.Index }))
			if len(shares) == 0 {
				fmt.Println("skipping")
				continue
			}

			shareOfDecryptionKey := big.NewInt(0)
			for _, share := range primaryShares {
				shareOfDecryptionKey.Add(shareOfDecryptionKey, &share.Value)
			}
			shareOfDecryptionKey.Mod(shareOfDecryptionKey, curve.Params().N)

			// m*H = B - (k_i * E) = B - (k_i * priv * G) = B - (priv * A)
			// (priv * A)
			pAX, pAY := secp256k1.Curve.ScalarMult(&A.X, &A.Y, shareOfDecryptionKey.Bytes())

			if !secp256k1.Curve.IsOnCurve(pAX, pAY) {
				t.Error("d_i * A is not on curve")
			}
			partialDecryptions = append(partialDecryptions, PartialDecryption{
				Index: partyIndex,
				Value: common.BigIntToPoint(pAX, pAY),
			})
		}
		// works so far

		// calculate Z
		Z_X, Z_Y := big.NewInt(0), big.NewInt(0)

		X := utils.Map(partialDecryptions, func(share PartialDecryption) int { return share.Index })
		A_is := utils.Map(partialDecryptions, func(share PartialDecryption) common.Point { return share.Value })

		for i := 0; i < len(X); i++ {
			A_x, A_y := &A_is[i].X, &A_is[i].Y
			lagrangeBasis := sss.LagrangeCoefficientsStartFromOne(i, 0, X, curve)

			// lagrangeBasis * A_i
			X, Y := secp256k1.Curve.ScalarMult(A_x, A_y, lagrangeBasis.Bytes())

			// Z += lagrangeBasis * A_i
			Z_X, Z_Y = secp256k1.Curve.Add(Z_X, Z_Y, X, Y)
		}

		if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
			t.Error("Z is not on curve")
		}

		fmt.Printf("Z = (%v,%v)\n", Z_X, Z_Y)

		// M = B-Z
		ZNegY := new(big.Int).Neg(Z_Y)
		ZNegY.Mod(ZNegY, curve.Params().P)
		mHX, mHY := secp256k1.Curve.Add(&B.X, &B.Y, Z_X, ZNegY)
		if !secp256k1.Curve.IsOnCurve(mHX, mHY) {
			panic("M=B-Z is not on curve")
		}

		M_X_test, M_Y_test := secp256k1.Curve.Add(mHX, mHY, Z_X, Z_Y)
		if !secp256k1.Curve.IsOnCurve(M_X_test, M_Y_test) {
			panic("B=M+Z is not on curve")
		}

		if M_X_test.Cmp(&B.X) != 0 || M_Y_test.Cmp(&B.Y) != 0 {
			panic("M != B-Z")
		}
		fmt.Printf("M = (%v,%v)\n", mHX, mHY)

		// search for x such that x*H = M
		x := 0
		H := elgamal.H
		for x <= 100 {
			X, Y := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(x)).Bytes())
			if X.Cmp(mHX) == 0 && Y.Cmp(mHY) == 0 {
				break
			}

			x += 1
			if x > 100 {
				panic("x not found")
			}
		}

		fmt.Printf("The voting result is %v\n", x)
	}
}
