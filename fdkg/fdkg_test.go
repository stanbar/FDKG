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
	config := common.VotingConfig{
		Size:          6,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 3,
	}
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n_dkg := 6
		localNodes, dkgNodes := pki.GenerateSetOfNodes(config, n_dkg, curve, r)
		if len(localNodes) != config.Size {
			t.Errorf("Expected %d nodes, got %d", config.Size, len(localNodes))
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
	config := common.VotingConfig{
		Size:          6,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 3,
	}
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n_dkg := 6
		localNodes, dkgNodes := pki.GenerateSetOfNodes(config, n_dkg, curve, r)
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
	config := common.VotingConfig{
		Size:          4,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 3,
	}
	for i := 0; i < ITERATIONS; i++ {
		node := pki.NewLocalParty(1, config, curve, r)
		node11 := pki.NewLocalParty(11, config, curve, r).PublicParty
		node22 := pki.NewLocalParty(22, config, curve, r).PublicParty
		node33 := pki.NewLocalParty(33, config, curve, r).PublicParty
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

func TestPartialDecryptionOfTwoDkgNodesAndThreeGuardiansAndOneVote(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	config := common.VotingConfig{
		Size:          5,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 2,
	}
	for i := 0; i < ITERATIONS; i++ {
		alice := pki.NewLocalParty(1, config, curve, r)
		bob := pki.NewLocalParty(2, config, curve, r)
		carol_local := pki.NewLocalParty(11, config, curve, r)
		dave_local := pki.NewLocalParty(22, config, curve, r)
		eve_local := pki.NewLocalParty(33, config, curve, r)

		carol := carol_local.PublicParty
		dave := dave_local.PublicParty
		eve := eve_local.PublicParty

		aliceTrustedParties := []pki.PublicParty{carol, dave}
		aliceDkg := alice.ToDkgParty(aliceTrustedParties)
		aliceShares := aliceDkg.GenerateShares()
		if len(aliceShares) != len(aliceTrustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}

		bobTrustedParties := []pki.PublicParty{dave, eve}
		bobDkg := bob.ToDkgParty(bobTrustedParties)
		bobShares := bobDkg.GenerateShares()
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

		// voting
		votes := Voting([]pki.LocalParty{alice, bob, carol_local, dave_local, eve_local}, votingPubKey, curve, r)
		C1s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C1 })

		// online tally
		C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		carolShares := []common.PrimaryShare{aliceShares[0].ProductOfShareAndCoefficient()}
		daveShares := []common.PrimaryShare{aliceShares[1].ProductOfShareAndCoefficient(), bobShares[0].ProductOfShareAndCoefficient()}
		eveShares := []common.PrimaryShare{bobShares[1].ProductOfShareAndCoefficient()}

		carol_sharesValues := utils.Map(carolShares, func(s common.PrimaryShare) big.Int { return s.Value })
		carol_votingPrivKeyShare := utils.Sum(carol_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })

		dave_sharesValues := utils.Map(daveShares, func(s common.PrimaryShare) big.Int { return s.Value })
		dave_votingPrivKeyShare := utils.Sum(dave_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })

		eve_sharesValues := utils.Map(eveShares, func(s common.PrimaryShare) big.Int { return s.Value })
		eve_votingPrivKeyShare := utils.Sum(eve_sharesValues, func(s1, s2 big.Int) big.Int { return *s1.Add(&s1, &s2) })

		A_carol := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, carol_votingPrivKeyShare.Bytes()))
		A_dave := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, dave_votingPrivKeyShare.Bytes()))
		A_eve := common.BigIntToPoint(curve.ScalarMult(&C1.X, &C1.Y, eve_votingPrivKeyShare.Bytes()))

		// offline tally
		Z := utils.Sum([]common.Point{A_carol, A_dave, A_eve}, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if !curve.IsOnCurve(&Z.X, &Z.Y) {
			t.Errorf("Z is not on curve Z_X: %v Z_Y: %v", Z.X, Z.Y)
			panic("Z is not on curve")
		}

		C2s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C2 })
		C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})
		result := elgamal.DecryptResults(Z, C2, len(votes), config.Options, curve)
		if result[0] != 3 {
			t.Errorf("The result should be 1 but was %v", result)
		}
	}
}

// the issue is with the randomness used within Alice.
func TestPartialDecryptionOfOneDkgNodeAndTwoGuardiansOneVote(t *testing.T) {
	config := common.VotingConfig{
		Size:          3,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 2,
	}
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		alice := pki.NewLocalParty(1, config, curve, r)
		bob_local := pki.NewLocalParty(11, config, curve, r)
		carol_local := pki.NewLocalParty(22, config, curve, r)

		bob := bob_local.PublicParty
		carol := carol_local.PublicParty

		trustedParties := []pki.PublicParty{bob, carol}
		aliceDkg := alice.ToDkgParty(trustedParties)
		aliceShares := aliceDkg.GenerateShares()
		if len(aliceShares) != len(trustedParties) {
			t.Errorf("Alice should generate the same number of shares as trusted parties")
		}
		alicePrimaryShares := utils.Map(aliceShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })

		publicKeys := utils.Map([]pki.DkgParty{aliceDkg}, func(d pki.DkgParty) common.Point { return d.VotingPublicKey })
		votingPubKey := utils.Sum(publicKeys, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if votingPubKey.X.Cmp(&alice.VotingPublicKey.X) != 0 || votingPubKey.Y.Cmp(&alice.VotingPublicKey.Y) != 0 {
			t.Errorf("Voting public key should be just alice voting public key as she is the only one in the DKG")
		}

		// Bob and Carol should have different shares
		if alicePrimaryShares[0].Index-alicePrimaryShares[1].Index == 0 {
			t.Errorf("First and second indexes should be different %v != %v", alicePrimaryShares[0].Index, alicePrimaryShares[1].Index)
		}

		bob_votingPrivKeyShare := alicePrimaryShares[0].Value
		carol_votingPrivKeyShare := alicePrimaryShares[1].Value

		if bob_votingPrivKeyShare.Cmp(&carol_votingPrivKeyShare) == 0 {
			t.Errorf("Bob share should be different than Carol share %v != %v", bob_votingPrivKeyShare, carol_votingPrivKeyShare)
		}

		// voting
		votes := Voting([]pki.LocalParty{alice}, votingPubKey, curve, r)
		C1s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C1 })

		// online tally
		C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(secp256k1.Curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		A_bob := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, bob_votingPrivKeyShare.Bytes()))
		A_carol := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, carol_votingPrivKeyShare.Bytes()))

		// offline tally

		bob_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22}, curve)
		Z_bob := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A_bob.X, &A_bob.Y, bob_lagrange.Bytes()))

		carol_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22}, curve)
		Z_carol := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&A_carol.X, &A_carol.Y, carol_lagrange.Bytes()))

		Z := utils.Sum([]common.Point{Z_bob, Z_carol}, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if !curve.IsOnCurve(&Z.X, &Z.Y) {
			t.Errorf("Z is not on curve Z_X: %v Z_Y: %v", Z.X, Z.Y)
			panic("Z is not on curve")
		}

		C2s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C2 })
		C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		result := elgamal.DecryptResults(Z, C2, len(votes), config.Options, curve)
		if result[0] != 1 {
			t.Errorf("Alice should have voted for option 1, instead got %v", result)
		}
	}
}

func TestPartialDecryptionOfOneDkgNodeAndTwoGuardiansAndManyVotes(t *testing.T) {
	r := rand.New(rand.NewSource(int64(0)))
	config := common.VotingConfig{
		Size:          3,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 2,
	}
	for i := 0; i < 4; i++ {
		alice := pki.NewLocalParty(1, config, curve, r)
		bob_local := pki.NewLocalParty(11, config, curve, r)
		carol_local := pki.NewLocalParty(22, config, curve, r)

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
			votes := make([]common.EncryptedBallot, n_votes)
			for i := 0; i < n_votes; i++ {
				votes[i] = elgamal.EncryptSingleCandidate(i%2, votingPubKey, curve, r)
			}

			bob_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22}, curve)
			bob_v := bob_lagrange.Mul(bob_lagrange, &share_bob)

			carol_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22}, curve)
			carol_v := carol_lagrange.Mul(carol_lagrange, &share_carol)

			// sum votes
			C1s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C1 })

			// online tally
			C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
				return common.BigIntToPoint(secp256k1.Curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
			})

			// partial decryptions
			bob_Z := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, bob_v.Bytes()))
			carol_Z := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, carol_v.Bytes()))

			Z := utils.Sum([]common.Point{bob_Z, carol_Z}, func(p1, p2 common.Point) common.Point {
				return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
			})

			if !secp256k1.Curve.IsOnCurve(&Z.X, &Z.Y) {
				panic("Z is not on curve, X: " + Z.X.String() + " Y: " + Z.Y.String())
			}

			expectedZ_X, expectedZ_Y := secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, bob_v.Add(bob_v, carol_v).Bytes())
			if expectedZ_X.Cmp(&Z.X) != 0 || expectedZ_Y.Cmp(&Z.Y) != 0 {
				t.Errorf("Expected (%v,%v) got (%v,%v)", expectedZ_X, expectedZ_Y, Z.X, Z.Y)
			}

			// sum votes
			C2s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C2 })
			C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
				return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
			})

			results := elgamal.DecryptResults(Z, C2, len(votes), config.Options, curve)
			if results[0] != n_votes/2 {
				t.Errorf("Expected %v votes got %v", n_votes/2, results[0])
			}
		}
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
	config := common.VotingConfig{
		Size:          6,
		Options:       2,
		Threshold:     1,
		GuardiansSize: 1,
	}
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n_dkg := 6
		_, dkgNodes := pki.GenerateSetOfNodes(config, n_dkg, curve, r)
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
	config := common.VotingConfig{
		Size:          6,
		Options:       2,
		Threshold:     2,
		GuardiansSize: 3,
	}
	for i := 0; i < ITERATIONS; i++ {
		r := rand.New(rand.NewSource(int64(i)))
		n_dkg := 1
		localNodes, dkgNodes := pki.GenerateSetOfNodes(config, n_dkg, curve, r)
		encryptionKey := VotingPublicKey(dkgNodes)

		if len(dkgNodes) != n_dkg {
			t.Errorf("Expected %d nodes, got %d", n_dkg, len(dkgNodes))
		}
		if dkgNodes[0].VotingPublicKey.X.Cmp(&encryptionKey.X) != 0 || encryptionKey.Y.Cmp(&dkgNodes[0].VotingPublicKey.Y) != 0 {
			t.Errorf("Expected encryption key to be equal to voting public key share, got %v", encryptionKey)
		}

		votes := Voting(localNodes, encryptionKey, curve, r)

		C1s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C1 })

		// online tally
		C1 := utils.Sum(C1s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(secp256k1.Curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if !secp256k1.Curve.IsOnCurve(&C1.X, &C1.Y) {
			panic("A is not on curve")
		}

		// Sum the second part of the ballots (payload)
		C2s := utils.Map(votes, func(vote common.EncryptedBallot) common.Point { return vote.C2 })
		C2 := utils.Sum(C2s, func(p1, p2 common.Point) common.Point {
			return common.BigIntToPoint(curve.Add(&p1.X, &p1.Y, &p2.X, &p2.Y))
		})

		if !secp256k1.Curve.IsOnCurve(&C2.X, &C2.Y) {
			panic("B is not on curve")
		}

		receiverToShares := make(map[int][]sss.Share)
		for _, node := range dkgNodes {
			shares := node.GenerateShares()
			for _, share := range shares {
				receiverToShares[share.To] = append(receiverToShares[share.To], share)
			}
		}
		if len(receiverToShares) != n_dkg*config.GuardiansSize {
			t.Errorf("Expected %d receivers, got %d", n_dkg*config.GuardiansSize, len(receiverToShares))
		}

		// IDEA: reconstruct each DKG key separatelly and provide partial decryption for each of it
		partialDecryptions := make([]common.PartialDecryption, 0, len(receiverToShares))
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
			pAX, pAY := secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, shareOfDecryptionKey.Bytes())

			if !secp256k1.Curve.IsOnCurve(pAX, pAY) {
				t.Error("d_i * A is not on curve")
			}
			partialDecryptions = append(partialDecryptions, common.PartialDecryption{
				Index: partyIndex,
				Value: common.BigIntToPoint(pAX, pAY),
			})
		}
		// works so far

		// calculate Z
		Z_X, Z_Y := big.NewInt(0), big.NewInt(0)

		X := utils.Map(partialDecryptions, func(share common.PartialDecryption) int { return share.Index })
		A_is := utils.Map(partialDecryptions, func(share common.PartialDecryption) common.Point { return share.Value })

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

		Z := common.BigIntToPoint(Z_X, Z_Y)
		results := elgamal.DecryptResults(Z, C2, len(votes), config.Options, curve)
		if results[0] != 3 {
			t.Errorf("Expected result to be 3 got %v", results[0])
		}
	}
}
