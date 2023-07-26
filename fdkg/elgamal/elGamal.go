package elgamal

import (
	"github.com/torusresearch/pvss/common"
	"github.com/torusresearch/pvss/pvss"
	"github.com/torusresearch/pvss/secp256k1"
)

type EncryptedBallot struct {
	VoterPubKey common.Point
	A           common.Point
	B           common.Point
}

// TODO: make it deterministic and independent of the base point
var H = common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(pvss.RandomBigInt().Bytes()))

func EncryptBoolean(yesOrNo bool, votingPublicKey *common.Point, voter common.Point) EncryptedBallot {
	blindingFactor := pvss.RandomBigInt()
	comm := common.BigIntToPoint(secp256k1.Curve.ScalarBaseMult(blindingFactor.Bytes()))

	// k_i * E
	X, Y := secp256k1.Curve.ScalarMult(&votingPublicKey.X, &votingPublicKey.Y, blindingFactor.Bytes())

	if yesOrNo {
		return EncryptedBallot{VoterPubKey: voter, A: comm, B: common.BigIntToPoint(secp256k1.Curve.Add(X, Y, &H.X, &H.Y))}
	} else {
		return EncryptedBallot{VoterPubKey: voter, A: comm, B: common.BigIntToPoint(X, Y)}
	}
}
