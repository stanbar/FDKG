package main

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/elgamal"
	"github.com/delendum-xyz/private-voting/fdkg/sss"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/torusresearch/pvss/secp256k1"
)

func TestNewLocalParty(t *testing.T) {
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 6
	degree := 1
	n_trustedParties := 3
	localNodes, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)
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
				if node.PrivateKey.Cmp(otherNode.PrivateKey) == 0 {
					t.Errorf("Expected private keys to be different, got %v and %v", node.PrivateKey, otherNode.PrivateKey)
				}
				if node.PublicKey.X.Cmp(&otherNode.PublicKey.X) == 0 && node.PublicKey.Y.Cmp(&otherNode.PublicKey.Y) == 0 {
					t.Errorf("Expected public keys to be different, got %v and %v", node.PublicKey, otherNode.PublicKey)
				}
				if node.VotingPrivKeyShare.Cmp(otherNode.VotingPrivKeyShare) == 0 {
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

func TestCorrectSharingAngReconstruction(t *testing.T) {
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 6
	degree := 1
	n_trustedParties := 3
	localNodes, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)
	// generate shares for each node
	receiverToShares := make(map[int][]sss.Share)
	senderToShares := make(map[int][]sss.Share)
	for _, node := range dkgNodes {
		shares := node.GenerateShares()
		senderToShares[node.Index] = shares
		for _, share := range shares {
			receiverToShares[share.To] = append(receiverToShares[share.To], share)
		}
	}
	if len(receiverToShares) != len(senderToShares) {
		t.Errorf("Expected receiverToShares %v be of the same size as senderToShares %d\n", len(receiverToShares), len(senderToShares))
	}
	// for each party reconstruct secret
	for partyIndex, shares := range senderToShares {
		primaryShares := utils.Map(shares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })

		fmt.Printf("Party_%d has following shares %v \n", partyIndex, utils.Map(primaryShares, func(share common.PrimaryShare) int { return share.Index }))
		reconstructedSecret := sss.LagrangeScalar(primaryShares, 0, prime)

		if reconstructedSecret.Cmp(localNodes[partyIndex-1].VotingPrivKeyShare) != 0 {
			t.Errorf("Expected secret match VotingPrivKeyShare")
		}
	}
}

func TestShamirSecretSharing(t *testing.T) {
	prime := secp256k1.FieldOrder
	node := NewLocalParty(1, prime, 2)
	node11 := NewLocalParty(11, prime, 2).PublicParty
	node22 := NewLocalParty(22, prime, 2).PublicParty
	node33 := NewLocalParty(33, prime, 2).PublicParty
	nodeDkg := node.toDkgParty([]PublicParty{node11, node22, node33})
	shares := nodeDkg.GenerateShares()
	primeShares := utils.Map(shares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
	secret := sss.LagrangeScalar(primeShares, 0, prime)
	if secret.Cmp(node.VotingPrivKeyShare) != 0 {
		t.Errorf("Expected secret %v, got %v", node.VotingPrivKeyShare, secret)
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

func TestPartialDecryptionOfOneDkgNodeAndTwoGuardians(t *testing.T) {
	prime := secp256k1.FieldOrder
	alice := NewLocalParty(1, prime, 1)
	bob := NewLocalParty(11, prime, 1).PublicParty
	carol := NewLocalParty(22, prime, 1).PublicParty

	aliceDkg := alice.toDkgParty([]PublicParty{bob, carol})
	aliceShares := aliceDkg.GenerateShares()
	alicePrimeShares := utils.Map(aliceShares, func(s sss.Share) common.PrimaryShare { return s.ToPrimaryShare() })
	fmt.Printf("Alice shares %v\n", utils.Map(alicePrimeShares, func(share common.PrimaryShare) int { return share.Index }))

	votingPubKey := VotingPublicKey([]DkgParty{aliceDkg})
	// votingPrivateKey := alice.VotingPrivKeyShare

	share_bob := alicePrimeShares[0].Value
	share_carol := alicePrimeShares[1].Value

	vote_alice := elgamal.EncryptBoolean(false, votingPubKey, alice.PublicKey, prime)
	// vote_bob := elgamal.EncryptBoolean(true, votingPubKey, bob.PublicKey, prime)
	// vote_carol := elgamal.EncryptBoolean(true, votingPubKey, carol.PublicKey, prime)

	bob_lagrange := sss.LagrangeCoefficientsStartFromOne(0, 0, []int{11, 22}, prime)
	bob_v := bob_lagrange.Mul(bob_lagrange, &share_bob)
	bob_v = bob_lagrange.Mod(bob_v, prime)

	carol_lagrange := sss.LagrangeCoefficientsStartFromOne(1, 0, []int{11, 22}, prime)
	carol_v := carol_lagrange.Mul(carol_lagrange, &share_carol)
	carol_v = carol_lagrange.Mod(carol_v, prime)

	// supposedVotingPrivKey := bob_v.Add(bob_v, carol_v)
	// supposedVotingPrivKey.Mod(supposedVotingPrivKey, prime)
	// if supposedVotingPrivKey.Cmp(votingPrivateKey) != 0 {
	// 	t.Errorf("Expected voting private key to be %v, got %v", votingPrivateKey, supposedVotingPrivKey)
	// }
	// supposedEncryption := vote_alice.DecryptBoolean(supposedVotingPrivKey, prime)
	// if supposedEncryption != true {
	// 	t.Errorf("Expected decryption to be true, got %v", supposedEncryption)
	// }

	C1 := vote_alice.C1
	bob_Z_X, bob_Z_Y := secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, bob_v.Bytes())
	carol_Z_X, carol_Z_Y := secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, carol_v.Bytes())

	Z_X, Z_Y := secp256k1.Curve.Add(bob_Z_X, bob_Z_Y, carol_Z_X, carol_Z_Y)

	// result := vote_alice.DecryptNumberWithSharedKey(common.BigIntToPoint(Z_X, Z_Y), 100, prime)
	// if result != 1 {
	// 	t.Errorf("Expected decryption to be 1, got %v", result)
	// }

	if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
		panic("Z is not on curve")
	}

	expectedZ_X, expectedZ_Y := secp256k1.Curve.ScalarMult(&C1.X, &C1.Y, bob_v.Add(bob_v, carol_v).Bytes())
	if expectedZ_X.Cmp(Z_X) != 0 || expectedZ_Y.Cmp(Z_Y) != 0 {
		t.Errorf("Expected (%v,%v) got (%v,%v)", expectedZ_X, expectedZ_Y, Z_X, Z_Y)
	}

	C2 := vote_alice.C2
	pAYNeg := new(big.Int).Neg(Z_Y)
	pAYNeg.Mod(pAYNeg, prime)
	mHX, mHY := secp256k1.Curve.Add(&C2.X, &C2.Y, Z_X, pAYNeg)
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

func TestPartialDecryptionOfTwoDkgNodesAndThreeGuardian(t *testing.T) {
	prime := secp256k1.FieldOrder
	alice := NewLocalParty(1, prime, 1)
	bob := NewLocalParty(2, prime, 1)
	carol := NewLocalParty(11, prime, 1).PublicParty
	dave := NewLocalParty(22, prime, 1).PublicParty
	eve := NewLocalParty(33, prime, 1).PublicParty
	aliceDkg := alice.toDkgParty([]PublicParty{carol, dave, eve})
	bobDkg := bob.toDkgParty([]PublicParty{carol, dave, eve})

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

func TestPointAtInfinity(t *testing.T) {
	Gx := secp256k1.Curve.Gx
	Gy := secp256k1.Curve.Gy

	resX, resY := secp256k1.Curve.Add(Gx, Gy, big.NewInt(0), big.NewInt(0))
	if resX.Cmp(Gx) != 0 || resY.Cmp(Gy) != 0 {
		t.Errorf("Expected %v, got %v", Gx, resX)
	}
}

func TestVotingKeysSharing(t *testing.T) {
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 6
	degree := 1
	n_trustedParties := 3
	_, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)
	encryptionKey := VotingPublicKey(dkgNodes)

	decryptionKey := dkgNodes[0].VotingPrivKeyShare
	for _, node := range dkgNodes[1:] {
		decryptionKey.Add(decryptionKey, node.VotingPrivKeyShare)
	}

	X, Y := secp256k1.Curve.ScalarBaseMult(decryptionKey.Bytes())

	if !secp256k1.Curve.IsOnCurve(X, Y) {
		t.Errorf("Expected decryption key to be on curve, got %v", decryptionKey)
	}

	if X.Cmp(&encryptionKey.X) != 0 || Y.Cmp(&encryptionKey.Y) != 0 {
		t.Errorf("Expected decryption key to be equal to encryption key, got %v", decryptionKey)
	}
}

func TestVoting(t *testing.T) {
	prime := secp256k1.FieldOrder
	n := 6
	n_dkg := 1
	degree := 1
	n_trustedParties := 3
	localNodes, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)
	encryptionKey := VotingPublicKey(dkgNodes)

	if len(dkgNodes) != n_dkg {
		t.Errorf("Expected %d nodes, got %d", n_dkg, len(dkgNodes))
	}
	if dkgNodes[0].VotingPublicKey.X.Cmp(&encryptionKey.X) != 0 || encryptionKey.Y.Cmp(&dkgNodes[0].VotingPublicKey.Y) != 0 {
		t.Errorf("Expected encryption key to be equal to voting public key share, got %v", encryptionKey)
	}

	votes := voting(localNodes, encryptionKey, prime)

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
		shareOfDecryptionKey.Mod(shareOfDecryptionKey, prime)

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
		lagrangeBasis := sss.LagrangeCoefficientsStartFromOne(i, 0, X, prime)

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
	ZNegY.Mod(ZNegY, prime)
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
