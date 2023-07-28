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
	n_dkg := 6
	degree := 1
	n_trustedParties := 3
	localNodes, dkgNodes := GenerateSetOfNodes(n, n_dkg, n_trustedParties, degree, prime)
	encryptionKey := VotingPublicKey(dkgNodes)

	votes := voting(localNodes, encryptionKey, prime)

	A := votes[0].A
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.A.X, &vote.A.Y, &A.X, &A.Y)
		A.X, A.Y = *X, *Y
	}

	if !secp256k1.Curve.IsOnCurve(&A.X, &A.Y) {
		panic("A is not on curve")
	}

	// Sum the second part of the ballots (payload)
	B := votes[0].B
	for _, vote := range votes[1:] {
		X, Y := secp256k1.Curve.Add(&vote.B.X, &vote.B.Y, &B.X, &B.Y)
		B.X, B.Y = *X, *Y
	}

	if !secp256k1.Curve.IsOnCurve(&B.X, &B.Y) {
		panic("B is not on curve")
	}

	// implement the decryption of aggregated votes
	// TODO: calculate partial decryptions A_i for each party i
	// TODO: Calculate Z
	// TODO: Calculate M = B-Z

	receiverToShares := make(map[int][]sss.Share)
	for _, node := range dkgNodes {
		shares := node.GenerateShares()
		for _, share := range shares {
			receiverToShares[share.To] = append(receiverToShares[share.To], share)
		}
	}

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
			panic("d_i * A is not on curve")
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
		lagrangeBasis := sss.LagrangeCoefficientsStartFromOne(i, 0, X, prime)

		// lagrangeBasis * A_i
		X, Y := secp256k1.Curve.ScalarMult(&A_is[i].X, &A_is[i].Y, lagrangeBasis.Bytes())

		// Z += lagrangeBasis * A_i
		Z_X, Z_Y = secp256k1.Curve.Add(Z_X, Z_Y, X, Y)

	}
	if !secp256k1.Curve.IsOnCurve(Z_X, Z_Y) {
		panic("Z is not on curve")
	}

	fmt.Printf("Z = (%v,%v)\n", Z_X, Z_Y)

	// M = B-Z
	ZNegY := new(big.Int).Neg(Z_Y)
	ZNegY.Mod(ZNegY, prime)
	M_X, M_Y := secp256k1.Curve.Add(&B.X, &B.Y, Z_X, ZNegY)

	if !secp256k1.Curve.IsOnCurve(M_X, M_Y) {
		panic("M=B-Z is not on curve")
	}

	M_X_test, M_Y_test := secp256k1.Curve.Add(M_X, M_Y, Z_X, Z_Y)
	if !secp256k1.Curve.IsOnCurve(M_X_test, M_Y_test) {
		panic("B=M+Z is not on curve")
	}

	if M_X_test.Cmp(&B.X) != 0 || M_Y_test.Cmp(&B.Y) != 0 {
		panic("M != B-Z")
	}
	fmt.Printf("Z = (%v,%v)\n", Z_X, Z_Y)

	// search for x such that x*G = M
	x := 0
	H := elgamal.H
	for x <= n {
		X, Y := secp256k1.Curve.ScalarMult(&H.X, &H.Y, big.NewInt(int64(x)).Bytes())
		if X.Cmp(M_X) == 0 && Y.Cmp(M_Y) == 0 {
			break
		}
		x += 1
		if x > n {
			panic("x not found")
		}
	}

	fmt.Printf("The voting result is %v\n", x)
}
