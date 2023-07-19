package main

import (
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

// TODO: make it deterministic and independent of the base point
var H = common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(pvss.RandomBigInt().Bytes()))

func EncryptBoolean(yesOrNo bool, votingPublicKey *common.Point, voter common.Point) EncryptedBallot {
	blindingFactor := pvss.RandomBigInt()
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	if yesOrNo {
		return EncryptedBallot{voterPubKey: voter, a: comm, b: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, &H.X, &H.Y))}
	} else {
		return EncryptedBallot{voterPubKey: voter, a: comm, b: common.BigIntToPoint(X, Y)}
	}
}
